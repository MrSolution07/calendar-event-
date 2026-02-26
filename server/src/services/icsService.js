const ics = require('ics');

/**
 * Convert a JS Date into the [year, month, day, hour, minute] tuple that `ics` expects.
 */
function toDateArray(date) {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
}

/**
 * Build an .ics file string from an array of calendar events.
 *
 * @param {Array} events - [{ title, start: Date, end: Date, location }]
 * @returns {Promise<string>} The .ics file content.
 */
function buildIcs(events) {
  const icsEvents = events.map((evt) => ({
    title: evt.title,
    start: toDateArray(evt.start),
    end: toDateArray(evt.end),
    location: evt.location || '',
    status: 'CONFIRMED',
  }));

  return new Promise((resolve, reject) => {
    ics.createEvents(icsEvents, (err, value) => {
      if (err) {
        return reject(new Error('Failed to generate ICS file'));
      }
      resolve(value);
    });
  });
}

module.exports = { buildIcs };
