import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';

export const getStatus = async (req, res) => {
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
    
    // Get repo info to find default branch
    const repoInfo = await github.getRepo(owner, repo);
    const defaultBranch = repoInfo.default_branch;
    
    // Get the current branch (we'll assume main for simplicity)
    // In a real implementation, you'd track the current branch
    const currentBranch = await github.getBranch(owner, repo, defaultBranch);
    
    // Get recent commits to show status
    const commits = await github.getCommitHistory(owner, repo, defaultBranch);
    
    res.json({
      success: true,
      status: {
        currentBranch: defaultBranch,
        ahead: 0, // Simplified
        behind: 0, // Simplified
        hasChanges: commits.length > 0,
        lastCommit: commits[0] || null
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get status', 
      details: error.message 
    });
  }
};

export const commitChanges = async (req, res) => {
  try {
    const { sessionId, owner, repo, message, files, branch } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: 'Commit message is required' 
      });
    }

    const github = new GitHubAPI(session.token);
    
    // For each file in the commit, update it via GitHub API
    const results = [];
    for (const file of files || []) {
      let result;
      if (file.operation === 'update') {
        result = await github.updateFile(owner, repo, file.path, file.content, message, file.sha, branch);
      } else if (file.operation === 'create') {
        result = await github.createFile(owner, repo, file.path, file.content, message, branch);
      } else if (file.operation === 'delete') {
        result = await github.deleteFile(owner, repo, file.path, message, file.sha, branch);
      }
      results.push(result);
    }

    res.json({ 
      success: true,
      results 
    });
  } catch (error) {
    console.error('Commit error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to commit changes', 
      details: error.message 
    });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { sessionId, owner, repo, branch } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    const github = new GitHubAPI(session.token);
    const history = await github.getCommitHistory(owner, repo, branch);
    
    res.json({ 
      success: true,
      history 
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get history', 
      details: error.message 
    });
  }
};

export const createPullRequest = async (req, res) => {
  try {
    const { sessionId, owner, repo, title, body, head, base } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!title || !head || !base) {
      return res.status(400).json({ 
        success: false,
        error: 'Title, head and base branches are required' 
      });
    }

    const github = new GitHubAPI(session.token);
    const pullRequest = await github.createPullRequest(owner, repo, title, body, head, base);
    
    res.json({ 
      success: true,
      pullRequest 
    });
  } catch (error) {
    console.error('Create PR error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create pull request', 
      details: error.message 
    });
  }
};

export const getPullRequests = async (req, res) => {
  try {
    const { sessionId, owner, repo, state } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    const github = new GitHubAPI(session.token);
    const pullRequests = await github.getPullRequests(owner, repo, state);
    
    res.json({ 
      success: true,
      pullRequests 
    });
  } catch (error) {
    console.error('Get PRs error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get pull requests', 
      details: error.message 
    });
  }
};
