const fs = require('fs');
const path = require('path');

const pdfPath = path.resolve(__dirname, 'test_output.pdf');
const bytes = fs.readFileSync(pdfPath);

console.log("PDF header bytes:", bytes.slice(0, 50).toString('utf8'));
console.log("PDF trailer bytes:", bytes.slice(bytes.length - 50).toString('utf8'));

// Check if there are any binary structure anomalies or if it opens
console.log("Valid header?", bytes.slice(0, 4).toString('utf8') === "%PDF");
console.log("Ends with %%EOF?", bytes.toString('utf8').includes("%%EOF"));
