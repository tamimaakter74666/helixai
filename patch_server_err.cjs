const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      } catch (geminiErr) {
         console.warn(\`[Cloud Whisper] Gemini transcription failed, falling back to local:\`, geminiErr.message);`;

const replacement = `      } catch (geminiErr: any) {
         console.warn(\`[Cloud Whisper] Gemini transcription failed, falling back to local:\`, geminiErr.message);`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts geminiErr type");
