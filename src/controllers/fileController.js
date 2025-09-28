import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

export const getRepositoryContents = async (req, res) => {
  try {
    const { sessionId, owner, repo, path, branch } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    const github = new GitHubAPI(session.token);
    const contents = await github.getContents(owner, repo, path, branch);
    
    // Separate files and folders
    const folders = contents.filter(item => item.type === 'dir');
    const files = contents.filter(item => item.type === 'file');
    
    res.json({ 
      success: true,
      contents: {
        folders,
        files,
        all: contents
      }
    });
  } catch (error) {
    console.error('Get contents error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch repository contents', 
      details: error.message 
    });
  }
};

export const getFile = async (req, res) => {
  try {
    const { sessionId, owner, repo, path, branch } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    const github = new GitHubAPI(session.token);
    const file = await github.getFileContent(owner, repo, path, branch);
    
    res.json({ 
      success: true,
      file 
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch file', 
      details: error.message 
    });
  }
};

export const updateFile = async (req, res) => {
  try {
    const { sessionId, owner, repo, path, content, message, sha, branch } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!content || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'Content and commit message are required' 
      });
    }

    const github = new GitHubAPI(session.token);
    const result = await github.updateFile(owner, repo, path, content, message, sha, branch);
    
    res.json({ 
      success: true,
      result 
    });
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update file', 
      details: error.message 
    });
  }
};

export const createFile = async (req, res) => {
  try {
    const { sessionId, owner, repo, path, content, message, branch } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!path || !content || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'Path, content and commit message are required' 
      });
    }

    const github = new GitHubAPI(session.token);
    const result = await github.createFile(owner, repo, path, content, message, branch);
    
    res.json({ 
      success: true,
      result 
    });
  } catch (error) {
    console.error('Create file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create file', 
      details: error.message 
    });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { sessionId, owner, repo, path, message, sha, branch } = req.body;
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
    const result = await github.deleteFile(owner, repo, path, message, sha, branch);
    
    res.json({ 
      success: true,
      result 
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete file', 
      details: error.message 
    });
  }
};

export const runCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ 
        success: false,
        error: 'Code and language are required' 
      });
    }

    let command;
    const tempFile = join(tmpdir(), `run_${Date.now()}`);
    
    switch (language) {
      case 'javascript':
        writeFileSync(`${tempFile}.js`, code);
        command = `node ${tempFile}.js`;
        break;
      case 'python':
        writeFileSync(`${tempFile}.py`, code);
        command = `python ${tempFile}.py`;
        break;
      case 'bash':
        writeFileSync(`${tempFile}.sh`, code);
        command = `bash ${tempFile}.sh`;
        break;
      case 'html':
        // For HTML, we'll create a simple server to serve the file
        writeFileSync(`${tempFile}.html`, code);
        command = `echo "HTML file created at ${tempFile}.html"`;
        break;
      default:
        return res.status(400).json({ 
          success: false,
          error: 'Unsupported language' 
        });
    }

    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    
    // Clean up temporary files
    try {
      if (existsSync(`${tempFile}.js`)) unlinkSync(`${tempFile}.js`);
      if (existsSync(`${tempFile}.py`)) unlinkSync(`${tempFile}.py`);
      if (existsSync(`${tempFile}.sh`)) unlinkSync(`${tempFile}.sh`);
      if (existsSync(`${tempFile}.html`)) unlinkSync(`${tempFile}.html`);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    res.json({ 
      success: true,
      output: stdout || stderr,
      hasError: !!stderr
    });
  } catch (error) {
    console.error('Run code error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to run code', 
      details: error.message,
      output: error.stderr || error.message
    });
  }
};

export const searchInRepo = async (req, res) => {
  try {
    const { sessionId, owner, repo, query } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session' 
      });
    }

    if (!query) {
      return res.status(400).json({ 
        success: false,
        error: 'Search query is required' 
      });
    }

    const github = new GitHubAPI(session.token);
    const results = await github.searchCode(owner, repo, query);
    
    res.json({ 
      success: true,
      results 
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search in repository', 
      details: error.message 
    });
  }
};
