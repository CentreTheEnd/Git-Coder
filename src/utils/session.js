const userSessions = new Map();

class SessionManager {
  static createSession(userInfo, token) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      user: userInfo,
      token: token,
      createdAt: new Date(),
      lastAccessed: new Date()
    };
    
    userSessions.set(sessionId, session);
    this.cleanupExpiredSessions();
    return sessionId;
  }

  static getSession(sessionId) {
    const session = userSessions.get(sessionId);
    if (session) {
      session.lastAccessed = new Date();
    }
    return session;
  }

  static deleteSession(sessionId) {
    return userSessions.delete(sessionId);
  }

  static generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  static cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = new Date();
    for (const [sessionId, session] of userSessions.entries()) {
      if (now - session.lastAccessed > maxAge) {
        userSessions.delete(sessionId);
      }
    }
  }

  static getActiveSessionsCount() {
    return userSessions.size;
  }
}

export default SessionManager;
