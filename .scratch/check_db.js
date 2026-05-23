const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.get("SELECT event_name, venue, start_time, program_pdf FROM event_config ORDER BY id DESC LIMIT 1", (err, row) => {
  if (err) {
    console.error("Error reading database:", err);
    process.exit(1);
  }
  if (!row) {
    console.log("No event config found.");
  } else {
    console.log("Event Name:", row.event_name);
    console.log("Venue:", row.venue);
    console.log("Start Time:", row.start_time);
    if (row.program_pdf) {
      console.log("PDF Length:", row.program_pdf.length);
      console.log("PDF Start:", row.program_pdf.substring(0, 100));
    } else {
      console.log("PDF: null");
    }
  }
  db.close();
});
