import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// --- GLOBAL FETCH INTERCEPTOR FOR TAURI AND CUSTOM API KEYS ---
const originalFetch = window.fetch;
const customFetch = function(this: any, input: RequestInfo | URL, init?: RequestInit) {
  let url = typeof input === "string" 
    ? input 
    : (input instanceof URL 
        ? input.toString() 
        : (input && "url" in input ? (input as any).url : ""));

  if (typeof url === "string" && url.startsWith("/api/")) {
    const customUrl = localStorage.getItem("ruvi_server_url");
    const isTauri = (window as any).__TAURI__ !== undefined || 
                    window.location.protocol.startsWith("tauri") || 
                    window.location.hostname === "tauri.localhost";

    if (customUrl) {
      const cleaned = customUrl.replace(/\/$/, "");
      url = `${cleaned}${url}`;
    } else if (isTauri) {
      const defaultSharedUrl = "https://ais-pre-25gfll5l5kgi5wzrveg5lv-844587094120.asia-southeast1.run.app";
      url = `${defaultSharedUrl}${url}`;
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
