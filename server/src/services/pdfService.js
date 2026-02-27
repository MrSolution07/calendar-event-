const pdfParse = require('pdf-parse');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_ABBREVS_ASC = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const TIME_PATTERN = /(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/;
const COURSE_CODE_PATTERN = /[A-Z]{2,5}\s?\d{3,4}[A-Z]?/;

/**
 * Normalize a time string like "9.00" or "09:00" into "HH:MM" format.
 */
function normalizeTime(raw) {
  const cleaned = raw.replace('.', ':');
  const [h, m] = cleaned.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/**
 * Detect the day name from a text fragment.
 * Returns the full day name or null.
 */
function detectDay(text) {
  for (let i = 0; i < DAY_NAMES.length; i++) {
    if (text.includes(DAY_NAMES[i]) || text.includes(DAY_ABBREVS[i])) {
      return DAY_NAMES[i];
    }
  }
  return null;
}

/**
 * Extract timetable entries from raw PDF text.
 * Returns an array of { courseCode, day, startTime, endTime, location }.
 */
function parseEntries(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const entries = [];

  for (const line of lines) {
    const timeMatch = line.match(TIME_PATTERN);
    if (!timeMatch) continue;

    const day = detectDay(line);
    if (!day) continue;

    const courseMatch = line.match(COURSE_CODE_PATTERN);
    const courseCode = courseMatch ? courseMatch[0].trim() : 'Unknown';

    const startTime = normalizeTime(timeMatch[1]);
    const endTime = normalizeTime(timeMatch[2]);

    const locationCandidates = line
      .replace(timeMatch[0], '')
      .replace(courseMatch ? courseMatch[0] : '', '')
      .replace(new RegExp(DAY_NAMES.join('|') + '|' + DAY_ABBREVS.join('|')), '');

    const locationParts = locationCandidates
      .split(/[|,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 60);

    const location = locationParts.length > 0 ? locationParts[locationParts.length - 1] : '';

    entries.push({ courseCode, day, startTime, endTime, location });
  }

  return entries;
}

/**
 * Use pdf.js coordinates to extract positioned text items from an aSc Timetables PDF.
 */
async function extractPositionedItems(buffer) {
  const items = [];

  function renderPage(pageData) {
    return pageData.getTextContent().then((content) => {
      for (const item of content.items) {
        const text = item.str.trim();
        if (!text) continue;
        items.push({
          text,
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
        });
      }
      return '';
    });
  }

  await pdfParse(buffer, { pagerender: renderPage });
  return items;
}

const ASC_DAY_MAP = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
// Rooms: letters followed by digits (PCLab401, LR208). Must contain digits.
// Distinguished from course codes (all-uppercase 3+ letters) by having mixed case or <= 2 uppercase letters.
function isRoomCode(text) {
  if (!/\d/.test(text)) return false;
  if (/^[A-Z][A-Za-z]*\d{2,4}$/.test(text)) {
    const letterPart = text.replace(/\d+$/, '');
    if (/[a-z]/.test(letterPart)) return true;
    return letterPart.length <= 2;
  }
  return false;
}

/**
 * Find the closest value in a sorted array, returning its index.
 */
function closestIndex(sorted, value, maxDist = 60) {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const dist = Math.abs(sorted[i] - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return bestDist <= maxDist ? best : -1;
}

/**
 * Parse aSc Timetables PDF using coordinate-based layout detection.
 * Extracts course code, lecturer, location, day, and time slot from grid positions.
 */
async function parseAscTimetable(buffer) {
  const items = await extractPositionedItems(buffer);

  const isAsc = items.some((i) => i.text.includes('aSc Timetables'));
  if (!isAsc) return [];

  const timeSlotItems = [];
  const dayItems = [];
  const otherItems = [];

  for (const item of items) {
    const timeMatch = item.text.match(TIME_PATTERN);
    if (timeMatch) {
      timeSlotItems.push({
        ...item,
        start: normalizeTime(timeMatch[1]),
        end: normalizeTime(timeMatch[2]),
      });
      continue;
    }
    if (DAY_ABBREVS_ASC.includes(item.text)) {
      dayItems.push(item);
      continue;
    }
    otherItems.push(item);
  }

  if (timeSlotItems.length === 0 || dayItems.length === 0) return [];

  // aSc puts two rows of time ranges per column (e.g. "08:00-08:50" and "8:00 - 8:45").
  // Group by x to get unique column positions, pick one representative per column.
  const slotsByCol = new Map();
  for (const slot of timeSlotItems) {
    const existing = slotsByCol.get(slot.x);
    if (!existing || slot.y > existing.y) {
      slotsByCol.set(slot.x, slot);
    }
  }

  // Merge columns that are close in x (within 30px) — the two time rows may differ slightly.
  const rawColXs = [...slotsByCol.keys()].sort((a, b) => a - b);
  const mergedCols = [];
  for (const x of rawColXs) {
    const last = mergedCols[mergedCols.length - 1];
    if (last && Math.abs(x - last.x) < 40) {
      last.slots.push(slotsByCol.get(x));
    } else {
      mergedCols.push({ x, slots: [slotsByCol.get(x)] });
    }
  }

  const columnXs = mergedCols.map((c) => c.x);
  const columnSlots = mergedCols.map((c) => {
    const best = c.slots.reduce((a, b) => (a.y > b.y ? a : b));
    return { start: best.start, end: best.end };
  });

  // Days sorted top-to-bottom (y descending in PDF coords = top first).
  dayItems.sort((a, b) => b.y - a.y);
  const dayYs = dayItems.map((d) => d.y);
  const dayNames = dayItems.map((d) => ASC_DAY_MAP[d.text]);

  // Compute y-boundaries for each day row (midpoint between adjacent days).
  const dayBounds = dayYs.map((y, i) => {
    const upper = i === 0 ? Infinity : (dayYs[i - 1] + y) / 2;
    const lower = i === dayYs.length - 1 ? -Infinity : (y + dayYs[i + 1]) / 2;
    return { day: dayNames[i], upper, lower };
  });

  function findDay(y) {
    for (const b of dayBounds) {
      if (y <= b.upper && y >= b.lower) return b.day;
    }
    return null;
  }

  // Classify remaining items: course codes, rooms, lecturers, or partial codes.
  // Course codes are all-uppercase letters followed by digits (e.g. APDS7311).
  // Rooms have mixed case or a single uppercase letter prefix (e.g. PCLab401, LR208).
  const classified = otherItems.map((item) => {
    const isRoom = isRoomCode(item.text);
    const isCourseCode = !isRoom && /^[A-Z]{2,5}\d{3,4}[A-Z]?$/.test(item.text);
    const isPartialCode = !isRoom && /^[A-Z]{2,5}\d{0,2}$/.test(item.text) && item.text.length >= 3;
    const isDigitFragment = /^\d{1,4}$/.test(item.text);
    const isLecturer = !isRoom && !isCourseCode && !isPartialCode && !isDigitFragment &&
                       /[a-z]/.test(item.text) && /[A-Z]/.test(item.text);
    return { ...item, isCourseCode, isPartialCode, isDigitFragment, isRoom, isLecturer };
  });

  // Merge partial course codes (e.g. "EAPD7" + "111" → "EAPD7111") when close in position.
  const fullCourses = [];
  const used = new Set();

  for (const item of classified) {
    if (used.has(item)) continue;
    if (item.isCourseCode) {
      fullCourses.push(item);
      used.add(item);
    } else if (item.isPartialCode) {
      const fragment = classified.find(
        (f) => !used.has(f) && f !== item && f.isDigitFragment &&
               Math.abs(f.x - item.x) < 40 && Math.abs(f.y - item.y) < 30
      );
      if (fragment) {
        fullCourses.push({
          text: item.text + fragment.text,
          x: item.x,
          y: item.y,
          isCourseCode: true,
        });
        used.add(item);
        used.add(fragment);
      }
    }
  }

  const detailItems = classified.filter(
    (i) => !used.has(i) && (i.isRoom || i.isLecturer) &&
           !i.text.includes('generated') && !i.text.includes('aSc') &&
           !i.text.includes('College') && !i.text.includes('Year')
  );

  // Assign each detail item to its nearest course code so items don't get shared.
  const detailAssignments = new Map();
  for (const detail of detailItems) {
    let bestCourse = null;
    let bestDist = Infinity;
    for (const course of fullCourses) {
      const dx = Math.abs(detail.x - course.x);
      const dy = Math.abs(detail.y - course.y);
      if (dx < 140 && dy < 50) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestCourse = course;
        }
      }
    }
    if (bestCourse) {
      const key = `${bestCourse.x},${bestCourse.y}`;
      if (!detailAssignments.has(key)) detailAssignments.set(key, []);
      detailAssignments.get(key).push(detail);
    }
  }

  const entries = [];
  for (const course of fullCourses) {
    const colIdx = closestIndex(columnXs, course.x, 60);
    const day = findDay(course.y);
    if (colIdx < 0 || !day) continue;

    const slot = columnSlots[colIdx];
    const key = `${course.x},${course.y}`;
    const nearby = detailAssignments.get(key) || [];

    const roomItem = nearby.find((n) => n.isRoom);
    const lecturerItem = nearby.find((n) => n.isLecturer);
    const location = roomItem?.text || '';
    const lecturer = lecturerItem?.text || '';

    entries.push({
      courseCode: course.text,
      day,
      startTime: slot.start,
      endTime: slot.end,
      location,
      lecturer,
    });
  }

  return entries;
}

/**
 * Extract timetable data from a PDF buffer.
 * @param {Buffer} buffer - The PDF file contents.
 * @returns {Promise<Array>} Parsed timetable entries.
 */
async function extractFromPdf(buffer) {
  const { text } = await pdfParse(buffer);
  let entries = parseEntries(text);

  if (entries.length === 0) {
    entries = await parseAscTimetable(buffer);
  }

  if (entries.length === 0) {
    const err = new Error(
      'Could not extract any timetable entries from the PDF. ' +
      'Ensure the file contains course codes, days, and time ranges.'
    );
    err.status = 400;
    throw err;
  }

  return entries;
}

module.exports = { extractFromPdf, parseEntries, normalizeTime };
