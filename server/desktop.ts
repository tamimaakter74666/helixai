import { WebSocket } from "ws";
import { exec } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

// Tracking connected Windows companion agents (Tauri or Python)
export interface CompanionAgent {
  id: string;
  socket: WebSocket;
  platform: string;
  registeredAt: Date;
  lastActive: Date;
}

let activeCompanion: CompanionAgent | null = null;
const pendingRequests = new Map<string, {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}>();

export function registerCompanion(socket: WebSocket, platform: string): CompanionAgent {
  const companionId = `desktop-agent-${Math.random().toString(36).substring(2, 10)}`;
  const agent: CompanionAgent = {
    id: companionId,
    socket,
    platform,
    registeredAt: new Date(),
    lastActive: new Date()
  };

  activeCompanion = agent;
  console.log(`[DESKTOP AGENT] New companion agent registered: ${companionId} (${platform})`);

  socket.on("message", (rawMsg) => {
    try {
      const msg = JSON.parse(rawMsg.toString());
      agent.lastActive = new Date();

      if (msg.type === "response" && msg.requestId) {
        const pending = pendingRequests.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(msg.requestId);
          if (msg.status === "success") {
            pending.resolve(msg.data);
          } else {
            pending.reject(new Error(msg.error || "Execution failed on client"));
          }
        }
      }
    } catch (err) {
      console.error("[DESKTOP AGENT] Error parsing companion message:", err);
    }
  });

  socket.on("close", () => {
    console.log(`[DESKTOP AGENT] Companion ${companionId} disconnected`);
    if (activeCompanion?.id === companionId) {
      activeCompanion = null;
    }
  });

  return agent;
}

export function getActiveCompanion() {
  return activeCompanion;
}

// Promisified execution of client actions via WebSocket
export function sendCompanionAction(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!activeCompanion) {
      return reject(new Error("No active companion agent connected"));
    }

    const requestId = `req-${Math.random().toString(36).substring(2, 11)}`;
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Action '${action}' timed out waiting for companion response`));
    }, 15000); // 15 second timeout

    pendingRequests.set(requestId, { resolve, reject, timeout });

    activeCompanion.socket.send(JSON.stringify({
      type: "action",
      requestId,
      action,
      params
    }));
  });
}

// Executes native PowerShell commands when running locally on Windows
function runPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // PowerShell execution flags for clean, non-interactive execution
    const command = `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`;
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// Primary route execution router
export async function executeDesktopAction(action: string, params: any = {}): Promise<any> {
  console.log(`[DESKTOP CONTROL] Routing action: ${action}`, params);

  // 1. If remote companion is connected, route via WebSocket (Works in cloud or remote)
  if (activeCompanion) {
    return sendCompanionAction(action, params);
  }

  // 2. Fallback to direct local Windows API PowerShell execution (Works when server is run locally on Windows)
  if (os.platform() === "win32") {
    try {
      return await executeLocalWindowsAction(action, params);
    } catch (err: any) {
      console.error(`[DESKTOP CONTROL] Local execution error for ${action}:`, err);
      throw err;
    }
  }

  // 3. If neither, fail gracefully
  throw new Error("No remote desktop companion connected and server is not running on a Windows host.");
}

// Direct Windows System Powershell Integrations
async function executeLocalWindowsAction(action: string, params: any): Promise<any> {
  switch (action) {
    case "volume_set": {
      const vol = Math.min(100, Math.max(0, Number(params.level || 0)));
      // Calibrate and adjust volume by sending virtual mute & keystroke sequences
      const script = `
        $wsh = New-Object -ComObject Wscript.Shell;
        for($i=0; $i -lt 50; $i++) { $wsh.SendKeys([char]174) };
        for($i=0; $i -lt [int](${vol}/2); $i++) { $wsh.SendKeys([char]175) };
        "Volume set to ${vol}%"
      `;
      const output = await runPowerShell(script);
      return { status: "success", message: output };
    }

    case "brightness_set": {
      const brightness = Math.min(100, Math.max(0, Number(params.level || 50)));
      const script = `
        Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods | 
        Invoke-CimMethod -MethodName WmiSetBrightness -Arguments @{ Timeout = 0; Brightness = ${brightness} };
        "Brightness set to ${brightness}%"
      `;
      const output = await runPowerShell(script);
      return { status: "success", message: output };
    }

    case "wifi_toggle": {
      const enable = !!params.enable;
      const stateStr = enable ? "enabled" : "disabled";
      const script = `
        Start-Process powershell -ArgumentList '-NoProfile -Command "Netsh interface set interface name=\\"Wi-Fi\\" admin=${stateStr}"' -Verb RunAs -Wait;
        "Wi-Fi interface ${stateStr}"
      `;
      const output = await runPowerShell(script);
      return { status: "success", message: output };
    }

    case "bluetooth_toggle": {
      const enable = !!params.enable;
      const script = `
        [CmdletBinding()]
        param()
        # Toggle Bluetooth via Radio class
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $asType = [System.Type]::GetType("System.Management.Automation.TypeAccelerators")
        if (-not $asType::Get['Windows.Devices.Radios.Radio']) {
            $asType::Add('Windows.Devices.Radios.Radio', [Windows.Devices.Radios.Radio, Windows.Devices.Radios, ContentType=WindowsRuntime])
        }
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync() | ForEach-Object { $_.GetResults() }
        $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' }
        if ($bt) {
            $state = if (${enable}) { 'On' } else { 'Off' }
            $bt.SetStateAsync($state) | Out-Null
            "Bluetooth turned $state"
        } else {
            "No Bluetooth adapter found"
        }
      `;
      const output = await runPowerShell(script);
      return { status: "success", message: output };
    }

    case "lock_pc": {
      await runPowerShell("rundll32.exe user32.dll,LockWorkStation");
      return { status: "success", message: "PC Locked" };
    }

    case "sleep_pc": {
      const script = `
        Add-Type -AssemblyPath System.Windows.Forms;
        [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false);
        "System suspended"
      `;
      await runPowerShell(script);
      return { status: "success", message: "System sleeping" };
    }

    case "restart_pc": {
      await runPowerShell("Restart-Computer -Force");
      return { status: "success", message: "Restart signal transmitted" };
    }

    case "shutdown_pc": {
      await runPowerShell("Stop-Computer -Force");
      return { status: "success", message: "Shutdown signal transmitted" };
    }

    case "app_open": {
      const appName = params.name || "notepad";
      await runPowerShell(`Start-Process "${appName}"`);
      return { status: "success", message: `Started ${appName}` };
    }

    case "app_close": {
      const appName = params.name || "notepad";
      await runPowerShell(`Stop-Process -Name "${appName}" -Force -ErrorAction SilentlyContinue`);
      return { status: "success", message: `Terminated ${appName}` };
    }

    case "screenshot": {
      const script = `
        Add-Type -AssemblyName System.Drawing, System.Windows.Forms;
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
        $bmp = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height;
        $graphics = [System.Drawing.Graphics]::FromImage($bmp);
        $graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bmp.Size);
        $ms = New-Object System.IO.MemoryStream;
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);
        $bmp.Dispose();
        $graphics.Dispose();
        [Convert]::ToBase64String($ms.ToArray());
      `;
      const base64 = await runPowerShell(script);
      return { status: "success", imageUrl: `data:image/png;base64,${base64.replace(/\s/g, "")}` };
    }

    case "file_search": {
      const query = params.query || "";
      const searchPath = params.path || "$env:USERPROFILE\\Documents";
      const script = `
        Get-ChildItem -Path "${searchPath}" -Filter "*${query}*" -Recurse -File -ErrorAction SilentlyContinue | 
        Select-Object Name, FullName, Length, LastWriteTime | 
        ConvertTo-Json
      `;
      const results = await runPowerShell(script);
      return { status: "success", files: results ? JSON.parse(results) : [] };
    }

    case "file_create_folder": {
      const folderPath = params.path || "";
      if (!folderPath) throw new Error("Path is required");
      await runPowerShell(`New-Item -ItemType Directory -Force -Path "${folderPath}"`);
      return { status: "success", message: `Created folder at ${folderPath}` };
    }

    case "file_rename": {
      const { src, dest } = params;
      if (!src || !dest) throw new Error("Source and destination paths are required");
      await runPowerShell(`Rename-Item -Path "${src}" -NewName "${dest}" -Force`);
      return { status: "success", message: `Renamed to ${dest}` };
    }

    case "file_delete": {
      const filePath = params.path || "";
      const force = !!params.force; // Confirming safety limits
      if (!filePath) throw new Error("File path is required");
      if (!force) throw new Error("Deletion confirmation token missing");
      await runPowerShell(`Remove-Item -Path "${filePath}" -Force -Recurse`);
      return { status: "success", message: `Deleted ${filePath}` };
    }

    case "file_move": {
      const { src, dest } = params;
      if (!src || !dest) throw new Error("Source and destination paths are required");
      await runPowerShell(`Move-Item -Path "${src}" -Destination "${dest}" -Force`);
      return { status: "success", message: `Moved file to ${dest}` };
    }

    default:
      throw new Error(`Action '${action}' is not natively supported directly on server without local active desktop companion.`);
  }
}
