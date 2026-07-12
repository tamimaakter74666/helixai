import { LoggingManager } from "./LoggingManager";

export class PermissionManager {
  private hasPermission: boolean = false;

  async requestMicrophone(): Promise<boolean> {
    if (this.hasPermission) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      this.hasPermission = true;
      LoggingManager.info("PermissionManager", "Microphone access granted.");
      return true;
    } catch (e) {
      this.hasPermission = false;
      LoggingManager.error("PermissionManager", "Microphone access denied.", e);
      return false;
    }
  }

  checkPermission(): boolean {
    return this.hasPermission;
  }
}
