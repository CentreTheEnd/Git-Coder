import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';

export const getRepositories = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const github = new GitHubAPI(session.token);
    const repos = await github.getRepos();
    
    res.json({ repos });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch repositories', 
      details: error.message 
    });
  }
};

export const createRepository = async (req, res) => {
  try {
    const { sessionId, name, description, isPrivate } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const github = new GitHubAPI(session.token);
    const newRepo = await github.createRepo(name, description, isPrivate);
    
    res.json({ repo: newRepo });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create repository', 
      details: error.message 
    });
  }
};
