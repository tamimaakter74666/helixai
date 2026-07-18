import { registry } from "./Registry";
import { executeDesktopAction } from "../desktop";
import { learningManager } from "./LearningManager";
import { execSync } from "child_process";
import fs from "fs";

export function registerAllTools() {

  // File Read Tool
  registry.register({
    name: "file_read",
    description: "Read own source code or any file content.",
    parameters: {
      type: "OBJECT",
      properties: {
        path: { type: "STRING" }
      }
    },
    execute: async ({ args }) => {
      try {
        if (!fs.existsSync(args.path)) return { error: "File not found" };
        const content = fs.readFileSync(args.path, "utf8");
        return { success: true, content: content.substring(0, 5000) }; // limit output
      } catch (err: any) {
        return { error: err.message };
      }
    }
  });

  // File Write Tool
  registry.register({
    name: "file_write",
    description: "Edit or write to a source code file.",
    parameters: {
      type: "OBJECT",
      properties: {
        path: { type: "STRING" },
        content: { type: "STRING" }
      }
    },
    execute: async ({ args }) => {
      try {
        fs.writeFileSync(args.path, args.content, "utf8");
        return { success: true, message: `File ${args.path} written successfully.` };
      } catch (err: any) {
        return { error: err.message };
      }
    }
  });

  // Project Scan Tool
  registry.register({
    name: "project_scan",
    description: "Scan project directory and list files.",
    parameters: {
      type: "OBJECT",
      properties: {
        path: { type: "STRING", description: "Directory path to scan, e.g. '.'" }
      }
    },
    execute: async ({ args }) => {
      try {
        const output = execSync(`ls -laR ${args.path} | head -n 100`, { encoding: "utf8" });
        return { success: true, output };
      } catch (err: any) {
        return { error: err.message };
      }
    }
  });

  // System Build Tool
  registry.register({
    name: "system_build",
    description: "Run npm run build.",
    parameters: { type: "OBJECT", properties: {} },
    execute: async () => {
      try {
        const output = execSync("npm run build", { encoding: "utf8" });
        return { success: true, output };
      } catch (err: any) {
        return { error: err.message, output: err.stdout?.toString() };
      }
    }
  });

  // Git Commit Tool
  registry.register({
    name: "git_commit",
    description: "Commit changes to Git.",
    parameters: {
      type: "OBJECT",
      properties: {
        message: { type: "STRING" }
      }
    },
    execute: async ({ args }) => {
      try {
        execSync("git add .");
        const output = execSync(`git commit -m "${args.message}"`, { encoding: "utf8" });
        return { success: true, output };
      } catch (err: any) {
        return { error: err.message, output: err.stdout?.toString() };
      }
    }
  });

  // Server Restart Tool
  registry.register({
    name: "server_restart",
    description: "Restart the backend server process.",
    parameters: { type: "OBJECT", properties: {} },
    execute: async () => {
      // Send exit signal, assuming process manager (nodemon/pm2/docker) will restart it
      setTimeout(() => process.exit(0), 1000);
      return { success: true, message: "Server is restarting..." };
    }
  });

  // Desktop Automation Tool
  registry.register({
    name: "desktop_execute",
    description: "Execute a command on the local desktop/host (e.g. volume_set, sleep_pc, app_open, wifi_toggle, file_search)",
    parameters: {
      type: "OBJECT",
      properties: {
        action: { type: "STRING" },
        params: { type: "OBJECT", description: "e.g. { level: 50 } for volume_set" }
      }
    },
    execute: async ({ args }) => {
      try {
        const result = await executeDesktopAction(args.action, args.params);
        return result;
      } catch (err: any) {
        throw new Error(`Desktop action failed: ${err.message}`);
      }
    }
  });

  // UI Commands Tool (Floating widgets, Holographic UI manipulation)
  registry.register({
    name: "ui_execute",
    description: "Execute a command that modifies the UI (remove_background, sunset_sky, upscale_4k, send_whatsapp)",
    parameters: {
      type: "OBJECT",
      properties: {
        command: { type: "STRING" },
        data: { type: "OBJECT" }
      }
    },
    execute: async ({ args }) => {
      // In the backend, we just return success and the frontend will pick it up 
      // when it reads the final commands list. Wait, in the cognitive loop, we execute backend tools.
      // For frontend tools, we shouldn't execute them in the backend loop. We should pass them to the client.
      // So this tool just echoes back that it's queued for the client.
      return { status: "success", message: `Command ${args.command} queued for UI execution.` };
    }
  });

  // Backend Terminal Tool for Self-Learning
  registry.register({
    name: "terminal_execute",
    description: "Execute a shell command on the Ruvi backend server (e.g., npm install). Use this to install dependencies for new capabilities.",
    parameters: {
      type: "OBJECT",
      properties: {
        command: { type: "STRING" }
      }
    },
    execute: async ({ args }) => {
      try {
        const output = execSync(args.command, { encoding: "utf8" });
        return { success: true, output };
      } catch (e: any) {
        return { success: false, error: e.message, output: e.stdout?.toString() };
      }
    }
  });

  // Self-Learning Registration Tool
  registry.register({
    name: "register_capability",
    description: "Registers a new learned capability into the system. ONLY use after user permission! Args: name, description, parameters (JSON schema), scriptBody (JavaScript async function body accepting 'context', 'require', 'console').",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        description: { type: "STRING" },
        parameters: { type: "OBJECT" },
        scriptBody: { type: "STRING", description: "Async function body. e.g. const axios = require('axios'); return await axios.get(...);" }
      }
    },
    execute: async ({ args }) => {
      const { name, description, parameters, scriptBody } = args;
      learningManager.registerSkill(name, description, parameters, scriptBody);
      return { success: true, message: `Capability ${name} registered successfully and is now available in the Registry.` };
    }
  });

  // Self-Learning Rollback Tool
  registry.register({
    name: "rollback_capability",
    description: "Rolls back a learned capability to its previous version.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" }
      }
    },
    execute: async ({ args }) => {
      const success = learningManager.rollbackSkill(args.name);
      return { success, message: success ? `Rolled back ${args.name}` : `Failed to rollback ${args.name}` };
    }
  });

}