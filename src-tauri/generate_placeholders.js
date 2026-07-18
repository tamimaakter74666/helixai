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

// Standard file list
const files = [
  "32x32.png",
  "128x128.png",
  "128x128@2x.png",
  "icon.icns",
  "icon.ico"
];

for (const file of files) {
  const filePath = path.join(iconsDir, file);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Created icon placeholder: ${file}`);
}
console.log("All Tauri icon placeholders initialized successfully!");
