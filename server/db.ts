import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dbPath = path.resolve(process.cwd(), "ruvi_memory.json");

interface DBState {
  memory: any[];
  chat_history: any[];
}

let db: DBState = { memory: [], chat_history: [] };

export function initDb() {
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    } catch (err) {
      console.error("Failed to parse DB, starting fresh", err);
    }
  } else {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }
  console.log("Ruvi JSON Database initialized at", dbPath);
}

function saveDb() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export function saveMemory(type: string, content: string, metadata: any = {}, importance: number = 1) {
  return new Promise((resolve, reject) => {
    try {
      const id = uuidv4();
      db.memory.push({
        id, type, content, metadata: JSON.stringify(metadata), importance, timestamp: new Date().toISOString()
      });
      saveDb();
      resolve(id);
    } catch (err) {
      reject(err);
    }
  });
}

export function getMemories(limit: number = 50) {
  return new Promise((resolve, reject) => {
    try {
      const sorted = [...db.memory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(sorted.slice(0, limit));
    } catch (err) {
      reject(err);
    }
  });
}

export function saveChatMessage(role: string, content: string) {
  return new Promise((resolve, reject) => {
    try {
      const id = uuidv4();
      db.chat_history.push({
        id, role, content, timestamp: new Date().toISOString()
      });
      saveDb();
      resolve(id);
    } catch (err) {
      reject(err);
    }
  });
}

export function getChatHistory(limit: number = 20) {
  return new Promise((resolve, reject) => {
    try {
      const sorted = [...db.chat_history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      resolve(sorted.slice(-limit));
    } catch (err) {
      reject(err);
    }
  });
}
