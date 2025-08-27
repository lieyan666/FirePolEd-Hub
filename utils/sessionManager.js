const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SessionManager {
  constructor(options = {}) {
    this.sessionTimeout = options.sessionTimeout || 3600000; // 1 hour
    this.sessionFile = options.sessionFile || path.join(__dirname, '../data/sessions.json');
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
    this.maxSessions = options.maxSessions || 100;
    
    // Ensure data directory exists
    const dir = path.dirname(this.sessionFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.loadSessions();
    this.startCleanupTimer();
  }

  loadSessions() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const data = fs.readFileSync(this.sessionFile, 'utf8');
        this.sessions = new Map(Object.entries(JSON.parse(data)));
        console.log(`Session manager loaded ${this.sessions.size} sessions`);
      } else {
        this.sessions = new Map();
        console.log('Session manager initialized with empty session store');
      }
    } catch (error) {
      console.error('Failed to load sessions, starting with empty store:', error.message);
      this.sessions = new Map();
    }
  }

  saveSessions() {
    try {
      const data = Object.fromEntries(this.sessions);
      fs.writeFileSync(this.sessionFile, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save sessions:', error.message);
      return false;
    }
  }

  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  createSession(userAgent, ip) {
    // Clean up expired sessions first
    this.cleanupExpired();
    
    // Check session limit
    if (this.sessions.size >= this.maxSessions) {
      console.warn(`Session limit reached (${this.maxSessions}), cleaning up oldest sessions`);
      this.cleanupOldest(10);
    }

    const sessionId = this.generateSessionId();
    const session = {
      createdAt: Date.now(),
      lastAccess: Date.now(),
      userAgent: userAgent || '',
      ip: ip || ''
    };

    this.sessions.set(sessionId, session);
    
    if (this.saveSessions()) {
      console.log(`Session created: ${sessionId} from IP ${ip}`);
      return { sessionId, session };
    } else {
      this.sessions.delete(sessionId);
      throw new Error('Failed to persist session');
    }
  }

  verifySession(sessionId) {
    if (!sessionId) return false;
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`Session verification failed: session not found ${sessionId}`);
      return false;
    }

    // Check if expired
    if (Date.now() - session.createdAt > this.sessionTimeout) {
      console.log(`Session expired: ${sessionId}`);
      this.deleteSession(sessionId);
      return false;
    }

    // Update last access time
    session.lastAccess = Date.now();
    this.sessions.set(sessionId, session);
    
    // Save periodically (every 10 accesses or so)
    if (Math.random() < 0.1) {
      this.saveSessions();
    }
    
    return true;
  }

  deleteSession(sessionId) {
    if (this.sessions.delete(sessionId)) {
      console.log(`Session deleted: ${sessionId}`);
      this.saveSessions();
      return true;
    }
    return false;
  }

  getSessionInfo(sessionId) {
    return this.sessions.get(sessionId);
  }

  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (now - session.createdAt > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
      this.saveSessions();
    }
    
    return cleaned;
  }

  cleanupOldest(count = 10) {
    const sessions = Array.from(this.sessions.entries())
      .sort(([,a], [,b]) => a.lastAccess - b.lastAccess)
      .slice(0, count);
    
    sessions.forEach(([sessionId]) => {
      this.sessions.delete(sessionId);
    });
    
    if (sessions.length > 0) {
      console.log(`Cleaned up ${sessions.length} oldest sessions`);
      this.saveSessions();
    }
  }

  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);
    
    console.log(`Session cleanup timer started (${this.cleanupInterval}ms interval)`);
  }

  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    
    for (const session of this.sessions.values()) {
      if (now - session.createdAt > this.sessionTimeout) {
        expired++;
      } else {
        active++;
      }
    }
    
    return { total: this.sessions.size, active, expired };
  }
}

module.exports = SessionManager;