import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// --- GLOBAL FETCH INTERCEPTOR FOR TAURI AND CUSTOM API KEYS ---
const originalFetch = window.fetch;
const customFetch = function(this: any, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = typeof input === "string" 
    ? input 
    : (input instanceof URL 
        ? input.toString() 
        : (input && "url" in input ? (input as any).url : ""));

  const isTauri = (window as any).__TAURI__ !== undefined || 
                  window.location.protocol.startsWith("tauri") || 
                  window.location.hostname === "tauri.localhost";

  if (typeof url === "string" && url.startsWith("/api/") && isTauri) {
    const customUrl = localStorage.getItem("ruvi_server_url");
    const defaultSharedUrl = "https://ais-pre-25gfll5l5kgi5wzrveg5lv-844587094120.asia-southeast1.run.app";
    const base = customUrl ? customUrl.replace(/\/$/, "") : defaultSharedUrl;
    const fullUrl = `${base}${url}`;

    const geminiKey = localStorage.getItem("ruvi_gemini_api_key");
    const openrouterKey = localStorage.getItem("ruvi_openrouter_api_key");

    // Prepare headers
    const headersObj: Record<string, string> = {};
    if (init && init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headersObj[k] = v;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([k, v]) => {
          headersObj[k] = v;
        });
      } else {
        Object.assign(headersObj, init.headers);
      }
    }

    if (geminiKey && !headersObj["x-gemini-api-key"]) {
      headersObj["x-gemini-api-key"] = geminiKey;
    }
    if (openrouterKey && !headersObj["x-openrouter-api-key"]) {
      headersObj["x-openrouter-api-key"] = openrouterKey;
    }
    if (!headersObj["Content-Type"] && !headersObj["content-type"] && init?.body) {
      headersObj["Content-Type"] = "application/json";
    }

    // Prepare options for Rust
    const options = {
      method: init?.method || "GET",
      headers: headersObj,
      body: typeof init?.body === "string" ? init.body : undefined
    };

    return (async () => {
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
    })();
  }

  if (typeof url === "string" && url.startsWith("/api/")) {
    const customUrl = localStorage.getItem("ruvi_server_url");
    if (customUrl) {
      const cleaned = customUrl.replace(/\/$/, "");
      url = `${cleaned}${url}`;
    }

    const geminiKey = localStorage.getItem("ruvi_gemini_api_key");
    const openrouterKey = localStorage.getItem("ruvi_openrouter_api_key");

    if (geminiKey || openrouterKey) {
      const headers = new Headers((init && init.headers) || {});
      if (geminiKey && !headers.has("x-gemini-api-key")) {
        headers.set("x-gemini-api-key", geminiKey);
      }
      if (openrouterKey && !headers.has("x-openrouter-api-key")) {
        headers.set("x-openrouter-api-key", openrouterKey);
      }
      init = {
        ...init,
        headers
      };
    }

    if (typeof input === "string") {
      input = url;
    } else if (input instanceof URL) {
      input = new URL(url);
    } else if (input && typeof input === "object") {
      input = { ...input, url } as any;
    }
  }

  return originalFetch.call(this, input, init);
};

Object.defineProperty(window, "fetch", {
  configurable: true,
  enumerable: true,
  writable: true,
  value: customFetch
});
// -------------------------------------------------------------

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
