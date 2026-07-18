// Unified Capability Registry

export interface ToolContext {
  args: any;
  environment: string;
}

export interface Capability {
  name: string;
  description: string;
  parameters: any;
  execute: (context: ToolContext) => Promise<any>;
}

class CapabilityRegistry {
  private tools: Map<string, Capability> = new Map();

  register(capability: Capability) {
    this.tools.set(capability.name, capability);
    console.log(`[Registry] Registered capability: ${capability.name}`);
  }

  getTool(name: string): Capability | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Capability[] {
    return Array.from(this.tools.values());
  }

  getFunctionDeclarations() {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }
}

export const registry = new CapabilityRegistry();
