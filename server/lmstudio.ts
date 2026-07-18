import { getModelAverages } from "./db";

export interface LMStudioModel {
  id: string;
  object: string;
  owned_by?: string;
  size?: number;
}

let activeLMStudioHost = "http://127.0.0.1:1234/v1";

export function getLMStudioHost(): string {
  return activeLMStudioHost;
}

export async function getLMStudioStatus() {
  const start = Date.now();
  const hostsToTry = [
    process.env.LMSTUDIO_HOST,
    "http://127.0.0.1:1234/v1",
    "http://localhost:1234/v1",
    "http://host.docker.internal:1234/v1"
  ].filter(Boolean) as string[];

  const uniqueHosts = Array.from(new Set(hostsToTry.map(h => h.replace(/\/$/, ""))));
  const currentActive = activeLMStudioHost.replace(/\/$/, "");
  const orderedHosts = [currentActive, ...uniqueHosts.filter(h => h !== currentActive)];

  for (const host of orderedHosts) {
    try {
      const res = await fetch(`${host}/models`, {
        method: "GET",
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const data = await res.json();
        const latency = Date.now() - start;
        const rawModels = data.data || [];
        const models = rawModels.map((m: any) => ({
          name: m.id,
          model: m.id,
          size: m.size || 0,
          owned_by: m.owned_by || "lmstudio"
        }));
        activeLMStudioHost = host;
        return { online: true, latency, models };
      }
    } catch (err) {
      // Continue to try next host
    }
  }
  return { online: false, latency: 0, models: [] };
}

export async function getEvaluatedLMStudioModels() {
  const status = await getLMStudioStatus();
  if (!status.online) {
    return { online: false, models: [] };
  }

  const stats = getModelAverages();
  const evaluated = status.models.map((model: any) => {
    return {
      name: model.name,
      owned_by: model.owned_by,
      history: stats[model.name] || null
    };
  });

  return {
    online: true,
    latency: status.latency,
    models: evaluated
  };
}
