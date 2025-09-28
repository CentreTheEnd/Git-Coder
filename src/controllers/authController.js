import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';

export const authenticate = async (req, res) => {
  try {
    const { githubToken } = req.body;
    
    if (!githubToken) {
      return res.status(400).json({ 
        success: false,
        error: 'GitHub token is required' 
      });
    }

    const github = new GitHubAPI(githubToken);
    const userInfo = await github.getUser();
    
    const sessionId = SessionManager.createSession(userInfo, githubToken);
    
    res.json({
      success: true,
      sessionId,
      user: {
        id: userInfo.id,
        login: userInfo.login,
        name: userInfo.name,
        avatar_url: userInfo.avatar_url,
        html_url: userInfo.html_url,
        bio: userInfo.bio,
        public_repos: userInfo.public_repos,
        total_private_repos: userInfo.total_private_repos
      },
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      success: false,
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
  
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
};

export const validateSession = (req, res) => {
  const { sessionId } = req.query;
  const session = SessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid session' 
    });
  }

  res.json({ 
    success: true,
    user: session.user 
  });
};
