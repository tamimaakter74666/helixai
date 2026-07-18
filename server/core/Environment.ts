import fs from 'fs';
import os from "os";

export interface ExecutionContext {
  environment: "ai-studio" | "docker" | "wsl" | "local-desktop" | "remote-host";
  osType: string;
  hostname: string;
  platform: NodeJS.Platform;
}

export function detectEnvironment(): ExecutionContext {
  const platform = os.platform();
  const hostname = os.hostname();
  const release = os.release().toLowerCase();
  
  let env: ExecutionContext["environment"] = "local-desktop";

  // Basic detection logic
  if (process.env.K_SERVICE || process.env.CLOUD_RUN_JOB) {
    env = "ai-studio";
  } else if (fs.existsSync("/.dockerenv")) {
    env = "docker";
  } else if (release.includes("microsoft") || release.includes("wsl")) {
    env = "wsl";
  } else if (platform === "linux" && !release.includes("microsoft")) {
    env = "remote-host";
  }

  return {
    environment: env,
    osType: os.type(),
    hostname,
    platform
  };
}
