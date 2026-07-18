const fs = require('fs');
let code = fs.readFileSync('server/desktop.ts', 'utf-8');

const replacement = `
  if (action === "terminal_execute") {
    return new Promise((resolve, reject) => {
      exec(params.command, (err, stdout, stderr) => {
        if (err) {
          resolve({ status: "error", message: stderr || err.message });
        } else {
          resolve({ status: "success", message: stdout.trim() });
        }
      });
    });
  }

  // 3. If neither, fail gracefully
  throw new Error("No remote desktop companion connected and server is not running on a Windows host.");
`;
code = code.replace('// 3. If neither, fail gracefully\\n  throw new Error("No remote desktop companion connected and server is not running on a Windows host.");', replacement);
fs.writeFileSync('server/desktop.ts', code);
