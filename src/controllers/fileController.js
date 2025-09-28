import GitHubAPI from '../utils/github.js';
import SessionManager from '../utils/session.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

export const getRepositoryContents = async (req, res) => {
  try {
    const { sessionId, owner, repo, path } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const github = new GitHubAPI(session.token);
    const contents = await github.getContents(owner, repo, path);
    
    res.json({ contents });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch repository contents', 
      details: error.message 
    });
  }
};

export const getFile = async (req, res) => {
  try {
    const { sessionId, owner, repo, path } = req.query;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const github = new GitHubAPI(session.token);
    const file = await github.getFileContent(owner, repo, path);
    
    res.json({ file });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch file', 
      details: error.message 
    });
  }
};

export const updateFile = async (req, res) => {
  try {
    const { sessionId, owner, repo, path, content, message, sha } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const github = new GitHubAPI(session.token);
    const result = await github.updateFile(owner, repo, path, content, message, sha);
    
    res.json({ result });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update file', 
      details: error.message 
    });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { sessionId, owner, repo, path, message, sha } = req.body;
    const session = SessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const github = new GitHubAPI(session.token);
    const result = await github.deleteFile(owner, repo, path, message, sha);
    
    res.json({ result });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete file', 
      details: error.message 
    });
  }
};

export const runCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    
    let command;
    const tempFile = join(tmpdir(), `temp_${Date.now()}`);
    
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
      default:
        return res.status(400).json({ error: 'Unsupported language' });
    }

    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    
    // Clean up temporary files
    try {
      unlinkSync(`${tempFile}.${language === 'javascript' ? 'js' : language === 'python' ? 'py' : 'sh'}`);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    res.json({ 
      output: stdout || stderr,
      success: !stderr 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to run code', 
      details: error.message 
    });
  }
};
