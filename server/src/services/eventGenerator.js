const DAY_MAP = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const DEFAULT_END_DATE = '2026-03-31';

/**
 * Compute the next occurrence of a given weekday on or after `from`.
 */
function nextWeekday(from, targetDay) {
  const date = new Date(from);
  const diff = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Generate all weekly occurrences of a timetable entry between startDate and endDate.
 *
 * @param {Object} entry - { courseCode, day, startTime, endTime, location }
 * @param {string} startDate - ISO date string for term start (defaults to today).
 * @param {string} endDate - ISO date string for the last possible event date.
 * @returns {Array} Calendar events with resolved dates.
 */
function generateRecurringEvents(entry, startDate, endDate = DEFAULT_END_DATE) {
  const targetDay = DAY_MAP[entry.day];
  if (targetDay === undefined) {
    throw new Error(`Invalid day name: ${entry.day}`);
  }

  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date value');
  }
  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  const [startH, startM] = entry.startTime.split(':').map(Number);
  const [endH, endM] = entry.endTime.split(':').map(Number);
  const events = [];
  let current = nextWeekday(start, targetDay);

  while (current <= end) {
    const eventStart = new Date(current);
    eventStart.setHours(startH, startM, 0, 0);

    const eventEnd = new Date(current);
    eventEnd.setHours(endH, endM, 0, 0);

    events.push({
      title: entry.courseCode,
      start: eventStart,
      end: eventEnd,
      location: entry.location,
    });

    current.setDate(current.getDate() + 7);
  }

  return events;
}

/**
 * Generate events for an entire timetable (array of entries).
 */
function generateAllEvents(entries, startDate, endDate) {
  return entries.flatMap((entry) => generateRecurringEvents(entry, startDate, endDate));
}

module.exports = { generateRecurringEvents, generateAllEvents, DEFAULT_END_DATE };
