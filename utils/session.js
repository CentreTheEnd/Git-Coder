const userSessions = new Map();

class SessionManager {
  static createSession(userInfo, token) {
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const session = {
      id: sessionId,
      user: userInfo,
      token: token,
      createdAt: new Date(),
    };
    
    userSessions.set(sessionId, session);
    return sessionId;
  }

  static getSession(sessionId) {
    return userSessions.get(sessionId);
  }

  static deleteSession(sessionId) {
    return userSessions.delete(sessionId);
  }

  static cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = new Date();
    for (const [sessionId, session] of userSessions.entries()) {
      if (now - session.createdAt > maxAge) {
        userSessions.delete(sessionId);
      }
    }
  }
}

export default SessionManager;
