import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SessionData {
  id: string;
  model: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

const SESSION_DIR = path.join(os.homedir(), '.ocoder-code', 'sessions');

export function getSessionDir(): string {
  return SESSION_DIR;
}

export function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

export function saveSession(session: SessionData): void {
  ensureSessionDir();
  const filePath = path.join(SESSION_DIR, `${session.id}.json`);
  session.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
}

export function loadSession(sessionId: string): SessionData | null {
  const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

export function listSessions(): SessionData[] {
  ensureSessionDir();
  const files = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.json'));
  const sessions: SessionData[] = [];
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, file), 'utf-8'));
      sessions.push(data);
    } catch (e) {
    }
  }
  
  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function deleteSession(sessionId: string): boolean {
  const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

export function getMostRecentSession(): SessionData | null {
  const sessions = listSessions();
  return sessions.length > 0 ? sessions[0] : null;
}
