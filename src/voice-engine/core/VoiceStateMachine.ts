
import { EventEmitter } from "../utils/EventEmitter";

export type VoiceState = "Idle" | "WakeListening" | "Listening" | "Thinking" | "Speaking" | "Interrupted" | "Sleeping" | "Error";

export class VoiceStateMachine extends EventEmitter<{ stateChange: (state: VoiceState) => void }> {
  private currentState: VoiceState = "Idle";

  getState() {
    return this.currentState;
  }

  transition(newState: VoiceState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.emit("stateChange", newState);
    }
  }
}
