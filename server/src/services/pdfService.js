const pdfParse = require('pdf-parse');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
 * Extract timetable data from a PDF buffer.
 * @param {Buffer} buffer - The PDF file contents.
 * @returns {Promise<Array>} Parsed timetable entries.
 */
async function extractFromPdf(buffer) {
  const { text } = await pdfParse(buffer);
  const entries = parseEntries(text);

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
