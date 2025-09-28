import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';

export const getBranches = async (req, res) => {
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
    const branches = await github.getBranches(owner, repo);
    
    res.json({ 
      success: true,
      branches 
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch branches', 
      details: error.message 
    });
  }
};

export const createBranch = async (req, res) => {
  try {
    const { sessionId, owner, repo, branch, sourceBranch } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!branch) {
      return res.status(400).json({ 
        success: false,
        error: 'Branch name is required' 
      });
    }

    const github = new GitHubAPI(session.token);
    const newBranch = await github.createBranch(owner, repo, branch, sourceBranch || 'main');
    
    res.json({ 
      success: true,
      branch: newBranch 
    });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create branch', 
      details: error.message 
    });
  }
};

export const switchBranch = async (req, res) => {
  try {
    const { sessionId, owner, repo, branch } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!branch) {
      return res.status(400).json({ 
        success: false,
        error: 'Branch name is required' 
      });
    }

    const github = new GitHubAPI(session.token);
    const branchInfo = await github.getBranch(owner, repo, branch);
    
    res.json({ 
      success: true,
      branch: branchInfo 
    });
  } catch (error) {
    console.error('Switch branch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to switch branch', 
      details: error.message 
    });
  }
};
