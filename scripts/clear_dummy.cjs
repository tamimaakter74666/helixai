const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'src/App.tsx');
let code = fs.readFileSync(file, 'utf8');

// Memories
code = code.replace(/const \[memories, setMemories\] = useState<MemoryLog\[\]>\(\[[\s\S]*?\]\);/m, 'const [memories, setMemories] = useState<MemoryLog[]>([]);');

// Whatsapp Queue
code = code.replace(/const \[whatsappQueue, setWhatsappQueue\] = useState<WhatsAppMessage\[\]>\(\[[\s\S]*?\]\);/m, 'const [whatsappQueue, setWhatsappQueue] = useState<WhatsAppMessage[]>([]);');

// Images
code = code.replace(/const \[uploadedImage, setUploadedImage\] = useState<string \| null>\([\s\S]*?\);/m, 'const [uploadedImage, setUploadedImage] = useState<string | null>(null);');
code = code.replace(/const \[processedImage, setProcessedImage\] = useState<string \| null>\([\s\S]*?\);/m, 'const [processedImage, setProcessedImage] = useState<string | null>(null);');

// Photo Instruction
code = code.replace(/const \[photoActionName, setPhotoActionName\] = useState<string>\("Background remove \(Interactive Demo\)"\);/m, 'const [photoActionName, setPhotoActionName] = useState<string>("");');

fs.writeFileSync(file, code);
console.log("CLEARED");
