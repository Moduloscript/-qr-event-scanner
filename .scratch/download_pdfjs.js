const https = require('https');
const fs = require('fs');
const path = require('path');

const publicJsDir = path.join(__dirname, '../public/js');

const files = [
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
    filename: 'pdf.min.js'
  },
  {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
    filename: 'pdf.worker.min.js'
  }
];

if (!fs.existsSync(publicJsDir)) {
  fs.mkdirSync(publicJsDir, { recursive: true });
}

function download(file) {
  return new Promise((resolve, reject) => {
    const dest = path.join(publicJsDir, file.filename);
    const writeStream = fs.createWriteStream(dest);
    
    https.get(file.url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${file.filename}: ${response.statusCode}`));
        return;
      }
      response.pipe(writeStream);
      writeStream.on('finish', () => {
        writeStream.close();
        console.log(`Downloaded ${file.filename} successfully to ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    for (const file of files) {
      await download(file);
    }
    console.log("All PDF.js files downloaded successfully!");
  } catch (err) {
    console.error("Error downloading PDF.js files:", err);
  }
}

main();
