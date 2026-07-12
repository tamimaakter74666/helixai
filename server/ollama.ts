export async function getOllamaStatus() {
  const start = Date.now();
  const ollamaHost = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
  try {
    const res = await fetch(`${ollamaHost}/api/tags`, {
      method: "GET",
      // Short timeout to not block
      signal: AbortSignal.timeout(1000)
    });
    if (res.ok) {
      const data = await res.json();
      const latency = Date.now() - start;
      return { online: true, latency, models: data.models || [] };
    }
  } catch (err) {
    // silently fail if Ollama is not running
  }
  return { online: false, latency: 0, models: [] };
}
