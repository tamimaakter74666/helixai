const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

const originalInvoke = `
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<any>("fetch_native_http", { url: fullUrl, options });
        
        // Mock standard Response
        return new Response(res.body, {
          status: res.status,
          statusText: res.status_text,
          headers: new Headers(res.headers || {})
        });
      } catch (err: any) {
        console.error("[Tauri Native Fetch Error]", err);
        return new Response(JSON.stringify({ error: err?.message || String(err) }), {
          status: 500,
          statusText: "Internal Native Error",
          headers: new Headers({ "Content-Type": "application/json" })
        });
      }
`;

const retriedInvoke = `
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        let res: any;
        let lastErr: any;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
          try {
            res = await invoke<any>("fetch_native_http", { url: fullUrl, options });
            break; // Success
          } catch (err: any) {
            lastErr = err;
            const errStr = String(err).toLowerCase();
            if (errStr.includes("tcp connect error") || errStr.includes("connection refused") || errStr.includes("error sending request")) {
              attempts++;
              console.log(\`[Tauri Fetch] Connection failed, retrying in 1s... (\${attempts}/\${maxAttempts})\`);
              await new Promise(r => setTimeout(r, 1000));
            } else {
              throw err; // Other error, don't retry
            }
          }
        }
        
        if (!res) {
          throw lastErr;
        }
        
        // Mock standard Response
        return new Response(res.body, {
          status: res.status,
          statusText: res.status_text,
          headers: new Headers(res.headers || {})
        });
      } catch (err: any) {
        console.error("[Tauri Native Fetch Error]", err);
        return new Response(JSON.stringify({ error: err?.message || String(err) }), {
          status: 500,
          statusText: "Internal Native Error",
          headers: new Headers({ "Content-Type": "application/json" })
        });
      }
`;

code = code.replace(originalInvoke.trim(), retriedInvoke.trim());
fs.writeFileSync('src/main.tsx', code);
