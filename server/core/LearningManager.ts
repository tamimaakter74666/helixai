import fs from "fs";
import path from "path";
import { registry, Capability } from "./Registry";
import { createRequire } from "module";
const customRequire = typeof require !== "undefined" ? require : createRequire(import.meta.url);

export interface LearnedSkill {
  name: string;
  description: string;
  parameters: any;
  scriptBody: string;
  version: number;
  timestamp: number;
  rollbackScriptBody?: string;
}

export class LearningManager {
  private dataDir = path.join(process.cwd(), "data");
  private skillsFile = path.join(this.dataDir, "learned_skills.json");
  private learningLogFile = path.join(this.dataDir, "learning_log.json");

  constructor() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadSkills();
  }

  loadSkills() {
    if (fs.existsSync(this.skillsFile)) {
      try {
        const skills: LearnedSkill[] = JSON.parse(fs.readFileSync(this.skillsFile, "utf8"));
        for (const skill of skills) {
          this.applySkill(skill);
        }
      } catch (e) {
        console.error("Failed to load learned skills", e);
      }
    }
  }

  applySkill(skill: LearnedSkill) {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    try {
      const executeFn = new AsyncFunction("context", "require", "console", skill.scriptBody);
      const capability: Capability = {
        name: skill.name,
        description: skill.description,
        parameters: skill.parameters,
        execute: async (context) => await executeFn(context, customRequire, console)
      };
      registry.register(capability);
    } catch (e) {
      console.error(`Failed to compile skill ${skill.name}`, e);
    }
  }

  registerSkill(name: string, description: string, parameters: any, scriptBody: string) {
    let skills: LearnedSkill[] = [];
    if (fs.existsSync(this.skillsFile)) {
      try {
        skills = JSON.parse(fs.readFileSync(this.skillsFile, "utf8"));
      } catch(e) {}
    }
    
    const existingIdx = skills.findIndex(s => s.name === name);
    let rollbackBody = "";
    let version = 1;

    if (existingIdx >= 0) {
      rollbackBody = skills[existingIdx].scriptBody;
      version = skills[existingIdx].version + 1;
      skills.splice(existingIdx, 1);
    }

    const newSkill: LearnedSkill = {
      name,
      description,
      parameters,
      scriptBody,
      version,
      timestamp: Date.now(),
      rollbackScriptBody: rollbackBody
    };

    skills.push(newSkill);
    fs.writeFileSync(this.skillsFile, JSON.stringify(skills, null, 2));

    this.logEvent("REGISTER", name, `Version ${version} installed.`, version);
    this.applySkill(newSkill);
  }

  rollbackSkill(name: string) {
     let skills: LearnedSkill[] = [];
     if (fs.existsSync(this.skillsFile)) {
       try {
         skills = JSON.parse(fs.readFileSync(this.skillsFile, "utf8"));
       } catch(e) {}
     }
     const idx = skills.findIndex(s => s.name === name);
     if (idx >= 0 && skills[idx].rollbackScriptBody) {
        skills[idx].scriptBody = skills[idx].rollbackScriptBody!;
        skills[idx].version += 1;
        fs.writeFileSync(this.skillsFile, JSON.stringify(skills, null, 2));
        this.logEvent("ROLLBACK", name, `Rolled back to previous version.`, skills[idx].version);
        this.applySkill(skills[idx]);
        return true;
     }
     return false;
  }

  
  createCheckpoint(name: string) {
    const cpDir = path.join(this.dataDir, "checkpoints");
    if (!fs.existsSync(cpDir)) {
      fs.mkdirSync(cpDir, { recursive: true });
    }
    const timestamp = Date.now();
    const cpName = name ? `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}` : `auto_${timestamp}`;
    
    if (fs.existsSync(this.skillsFile)) {
      fs.copyFileSync(this.skillsFile, path.join(cpDir, `${cpName}_skills.json`));
    }
    
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      fs.copyFileSync(pkgPath, path.join(cpDir, `${cpName}_package.json`));
    }
    
    this.logEvent("CHECKPOINT_CREATED", "system", `Checkpoint ${cpName} created.`, 0);
    return cpName;
  }

  restoreCheckpoint(cpName: string) {
    const cpDir = path.join(this.dataDir, "checkpoints");
    const cpSkills = path.join(cpDir, `${cpName}_skills.json`);
    const cpPkg = path.join(cpDir, `${cpName}_package.json`);
    
    if (!fs.existsSync(cpSkills)) {
      return false;
    }
    
    fs.copyFileSync(cpSkills, this.skillsFile);
    if (fs.existsSync(cpPkg)) {
      fs.copyFileSync(cpPkg, path.join(process.cwd(), "package.json"));
      try {
        require("child_process").execSync("npm install", { stdio: "ignore" });
      } catch (e) {
        console.error("Failed to run npm install during restore", e);
      }
    }
    
    this.logEvent("CHECKPOINT_RESTORED", "system", `Checkpoint ${cpName} restored.`, 0);
    this.loadSkills();
    return true;
  }

  listCheckpoints() {
    const cpDir = path.join(this.dataDir, "checkpoints");
    if (!fs.existsSync(cpDir)) return [];
    const files = fs.readdirSync(cpDir);
    const cps = new Set<string>();
    files.forEach(f => {
      if (f.endsWith("_skills.json")) cps.add(f.replace("_skills.json", ""));
    });
    return Array.from(cps).sort().reverse(); // Newest first
  }

  logEvent(action: string, skillName: string, details: string, version: number) {
    let logs: any[] = [];
    if (fs.existsSync(this.learningLogFile)) {
       try {
         logs = JSON.parse(fs.readFileSync(this.learningLogFile, "utf8"));
       } catch(e) {}
    }
    logs.push({ timestamp: Date.now(), action, skillName, details, version });
    fs.writeFileSync(this.learningLogFile, JSON.stringify(logs, null, 2));
  }
}

export const learningManager = new LearningManager();
