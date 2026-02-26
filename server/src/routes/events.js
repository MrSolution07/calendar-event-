const express = require('express');
const upload = require('../middleware/upload');
const { extractFromPdf } = require('../services/pdfService');
const { generateAllEvents } = require('../services/eventGenerator');
const { buildIcs } = require('../services/icsService');

const router = express.Router();

router.post('/generate-events', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No PDF file uploaded');
      err.status = 400;
      throw err;
    }

    const endDate = req.body.endDate || undefined;
    const startDate = req.body.startDate || undefined;

    if (endDate && isNaN(Date.parse(endDate))) {
      const err = new Error('Invalid endDate format. Use ISO 8601 (YYYY-MM-DD).');
      err.status = 400;
      throw err;
    }

    const entries = await extractFromPdf(req.file.buffer);
    const events = generateAllEvents(entries, startDate, endDate);

    if (events.length === 0) {
      const err = new Error('No events could be generated for the given date range');
      err.status = 400;
      throw err;
    }

    const icsContent = await buildIcs(events);

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="timetable.ics"',
    });
    res.send(icsContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
