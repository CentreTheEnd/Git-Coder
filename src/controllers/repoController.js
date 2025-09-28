import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';

export const getRepositories = async (req, res) => {
  try {
    const { sessionId, type } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    const github = new GitHubAPI(session.token);
    
    let repos;
    if (type === 'public') {
      repos = await github.getPublicRepos(session.user.login);
    } else if (type === 'private') {
      repos = await github.getRepos('private');
    } else {
      // Get all repos and separate them
      const allRepos = await github.getRepos('all');
      const publicRepos = allRepos.filter(repo => !repo.private);
      const privateRepos = allRepos.filter(repo => repo.private);
      
      return res.json({ 
        success: true,
        public: publicRepos,
        private: privateRepos,
        all: allRepos
      });
    }

    res.json({ 
      success: true,
      repos 
    });
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch repositories', 
      details: error.message 
    });
  }
};

export const createRepository = async (req, res) => {
  try {
    const { sessionId, name, description, isPrivate, autoInit } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!name) {
      return res.status(400).json({ 
        success: false,
        error: 'Repository name is required' 
      });
    }

    const github = new GitHubAPI(session.token);
    const newRepo = await github.createRepo(name, description, isPrivate, autoInit);
    
    res.json({ 
      success: true,
      repo: newRepo 
    });
  } catch (error) {
    console.error('Create repository error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create repository', 
      details: error.message 
    });
  }
};

export const getRepository = async (req, res) => {
  try {
    const { sessionId, owner, repo } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    const github = new GitHubAPI(session.token);
    const repository = await github.getRepo(owner, repo);
    
    res.json({ 
      success: true,
      repo: repository 
    });
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch repository', 
      details: error.message 
    });
  }
};
