// Generate PWA icon placeholders (192x192 and 512x512 PNGs)
// Run: node scripts/generate-icons.js
const fs = require("fs");
const path = require("path");

function createMinimalPNG(size) {
  // Create a minimal valid PNG with a solid indigo color (#4f46e5)
  // PNG structure: signature + IHDR + IDAT + IEND

  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0); // width
  ihdrData.writeUInt32BE(height, 4); // height
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrType = Buffer.from("IHDR");
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0);
  const ihdrCrcData = Buffer.concat([ihdrType, ihdrData]);
  const ihdrCrc = crc32(ihdrCrcData);
  const ihdrCrcBuf = Buffer.alloc(4);
  ihdrCrcBuf.writeUInt32BE(ihdrCrc, 0);

  // IDAT chunk — raw pixel data (RGB, filter byte per row)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < width; x++) {
      // Indigo gradient: #4f46e5 with a subtle radial gradient
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / (width / 2);
      const brightness = 1 - dist * 0.3;

      const r = Math.min(255, Math.round(79 * brightness));
      const g = Math.min(255, Math.round(70 * brightness));
      const b = Math.min(255, Math.round(229 * brightness));
      rawData.push(r, g, b);
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const zlib = require("zlib");
  const compressed = zlib.deflateSync(rawBuffer);

  const idatType = Buffer.from("IDAT");
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressed.length, 0);
  const idatCrcData = Buffer.concat([idatType, compressed]);
  const idatCrc = crc32(idatCrcData);
  const idatCrcBuf = Buffer.alloc(4);
  idatCrcBuf.writeUInt32BE(idatCrc, 0);

  // IEND chunk
  const iendType = Buffer.from("IEND");
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0);
  const iendCrc = crc32(iendType);
  const iendCrcBuf = Buffer.alloc(4);
  iendCrcBuf.writeUInt32BE(iendCrc, 0);

  return Buffer.concat([
    signature,
    ihdrLength,
    ihdrType,
    ihdrData,
    ihdrCrcBuf,
    idatLength,
    idatType,
    compressed,
    idatCrcBuf,
    iendLength,
    iendType,
    iendCrcBuf,
  ]);
}

// CRC32 implementation for PNG
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [192, 512];
for (const size of sizes) {
  const png = createMinimalPNG(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
}

console.log("PWA icons generated successfully!");
