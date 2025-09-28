import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';

export const authenticate = async (req, res) => {
  try {
    const { githubUrl, token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required' });
    }

    const github = new GitHubAPI(token);
    const userInfo = await github.getUser();
    
    const sessionId = SessionManager.createSession(userInfo, token);
    
    res.json({
      success: true,
      sessionId,
      user: userInfo,
    });
  } catch (error) {
    res.status(401).json({ 
      error: 'Authentication failed', 
      details: error.message 
    });
  }
};

export const logout = (req, res) => {
  const { sessionId } = req.body;
  
  if (sessionId) {
    SessionManager.deleteSession(sessionId);
  }
  
  res.json({ success: true });
};
