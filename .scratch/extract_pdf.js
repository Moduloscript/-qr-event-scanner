const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.get("SELECT program_pdf FROM event_config ORDER BY id DESC LIMIT 1", (err, row) => {
  if (err) {
    console.error("Error reading database:", err);
    process.exit(1);
  }
  if (row && row.program_pdf) {
    const rawBase64 = row.program_pdf.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(path.resolve(__dirname, 'test_output.pdf'), pdfBuffer);
    console.log("Successfully wrote test_output.pdf! File size:", pdfBuffer.length);
  } else {
    console.log("No PDF found in database.");
  }
  db.close();
});
