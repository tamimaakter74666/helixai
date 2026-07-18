import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 pixel transparent PNG base64 representation
const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const pngBuffer = Buffer.from(pngBase64, "base64");

// Helper to create a valid BMP-based ICO file placeholder
function createIcoBMP(width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved (0)
  header.writeUInt16LE(1, 2);     // Type (1 = ICO)
  header.writeUInt16LE(1, 4);     // Image count (1)

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);   // Width
  entry.writeUInt8(height >= 256 ? 0 : height, 1); // Height
  entry.writeUInt8(0, 2);                          // Color palette size (0 = no palette)
  entry.writeUInt8(0, 3);                          // Reserved (0)
  entry.writeUInt16LE(1, 4);                       // Color planes (1)
  entry.writeUInt16LE(32, 6);                      // Bits per pixel (32)

  // XOR mask: width * height * 4 bytes (RGBA)
  const xorSize = width * height * 4;
  // AND mask: 1 bit per pixel, each row padded to a 4-byte (32-bit) boundary
  const bytesPerRow = Math.ceil(width / 8);
  const paddedBytesPerRow = Math.ceil(bytesPerRow / 4) * 4;
  const andSize = paddedBytesPerRow * height;

  const imageDataSize = 40 + xorSize + andSize;
  entry.writeUInt32LE(imageDataSize, 8);           // Image data size
  entry.writeUInt32LE(22, 12);                     // Image data offset (6 + 16 = 22)

  // BITMAPINFOHEADER (40 bytes)
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0);                        // biSize (40)
  bih.writeInt32LE(width, 4);                      // biWidth
  bih.writeInt32LE(height * 2, 8);                 // biHeight (doubled for ICO)
  bih.writeUInt16LE(1, 12);                        // biPlanes
  bih.writeUInt16LE(32, 14);                       // biBitCount (32 bpp)
  bih.writeUInt32LE(0, 16);                        // biCompression (0 = BI_RGB)
  bih.writeUInt32LE(xorSize + andSize, 20);        // biSizeImage
  bih.writeInt32LE(0, 24);                         // biXPelsPerMeter (0)
  bih.writeInt32LE(0, 28);                         // biYPelsPerMeter (0)
  bih.writeUInt32LE(0, 32);                        // biClrUsed (0)
  bih.writeUInt32LE(0, 36);                        // biClrImportant (0)

  const xorMask = Buffer.alloc(xorSize);           // fully transparent black (all 0s)
  const andMask = Buffer.alloc(andSize, 0xFF);     // AND mask set to 1s (fully transparent fallback)

  return Buffer.concat([header, entry, bih, xorMask, andMask]);
}

// Helper to create a valid ICNS file containing the PNG buffer
function createIcnsFromPng(pngBuf, type = "ic08") {
  const blockLength = pngBuf.length + 8;
  const fileLength = blockLength + 8;

  const header = Buffer.alloc(8);
  header.write("icns", 0, 4, "ascii");
  header.writeUInt32BE(fileLength, 4);

  const blockHeader = Buffer.alloc(8);
  blockHeader.write(type, 0, 4, "ascii");
  blockHeader.writeUInt32BE(blockLength, 4);

  return Buffer.concat([header, blockHeader, pngBuf]);
}

// Standard file list and their generators
const pngFiles = [
  "32x32.png",
  "128x128.png",
  "128x128@2x.png"
];

for (const file of pngFiles) {
  const filePath = path.join(iconsDir, file);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Created PNG placeholder: ${file}`);
}

// Create valid ICO placeholder
const icoPath = path.join(iconsDir, "icon.ico");
fs.writeFileSync(icoPath, createIcoBMP(32, 32));
console.log("Created valid ICO placeholder: icon.ico");

// Create valid ICNS placeholder
const icnsPath = path.join(iconsDir, "icon.icns");
fs.writeFileSync(icnsPath, createIcnsFromPng(pngBuffer, "ic07"));
console.log("Created valid ICNS placeholder: icon.icns");

console.log("All Tauri icon placeholders initialized successfully with valid structures!");
