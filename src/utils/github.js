import axios from 'axios';

class GitHubAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.github.com';
    this.headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Git-Editor/2.0.0'
    };
  }

  async getUser() {
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user: ${error.response?.data?.message || error.message}`);
    }
  }

  async getRepos(type = 'all', sort = 'updated', direction = 'desc') {
    try {
      const response = await axios.get(`${this.baseURL}/user/repos`, {
        headers: this.headers,
        params: {
          type: type,
          sort: sort,
          direction: direction,
          per_page: 100,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get repositories: ${error.response?.data?.message || error.message}`);
    }
  }

  async getPublicRepos(username) {
    try {
      const response = await axios.get(`${this.baseURL}/users/${username}/repos`, {
        headers: this.headers,
        params: {
          type: 'public',
          sort: 'updated',
          per_page: 100,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get public repositories: ${error.response?.data?.message || error.message}`);
    }
  }

  async createRepo(name, description = '', isPrivate = false, autoInit = true) {
    try {
      const response = await axios.post(
        `${this.baseURL}/user/repos`,
        {
          name,
          description,
          private: isPrivate,
          auto_init: autoInit,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create repository: ${error.response?.data?.message || error.message}`);
    }
  }

  async getContents(owner, repo, path = '', ref = '') {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { 
          headers: this.headers,
          params: ref ? { ref } : {}
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get contents: ${error.response?.data?.message || error.message}`);
    }
  }

  async getFileContent(owner, repo, path, ref = '') {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { 
          headers: this.headers,
          params: ref ? { ref } : {}
        }
      );
      
      // Decode base64 content
      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      return {
        ...response.data,
        decoded_content: content,
      };
    } catch (error) {
      throw new Error(`Failed to get file content: ${error.response?.data?.message || error.message}`);
    }
  }

  async updateFile(owner, repo, path, content, message, sha = null, branch = '') {
    try {
      const encodedContent = Buffer.from(content).toString('base64');
      
      const body = {
        message,
        content: encodedContent,
        ...(sha && { sha }),
        ...(branch && { branch })
      };

      const response = await axios.put(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        body,
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update file: ${error.response?.data?.message || error.message}`);
    }
  }

  async deleteFile(owner, repo, path, message, sha, branch = '') {
    try {
      const response = await axios.delete(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: this.headers,
          data: {
            message,
            sha,
            ...(branch && { branch })
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.response?.data?.message || error.message}`);
    }
  }

  async createFile(owner, repo, path, content, message, branch = '') {
    try {
      const encodedContent = Buffer.from(content).toString('base64');
      
      const body = {
        message,
        content: encodedContent,
        ...(branch && { branch })
      };

      const response = await axios.put(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        body,
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create file: ${error.response?.data?.message || error.message}`);
    }
  }

  async getBranches(owner, repo) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/branches`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get branches: ${error.response?.data?.message || error.message}`);
    }
  }

  async getBranch(owner, repo, branch) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/branches/${branch}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get branch: ${error.response?.data?.message || error.message}`);
    }
  }

  async createBranch(owner, repo, branch, sourceBranch = 'main') {
    try {
      // First get the SHA of the source branch
      const sourceRef = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/git/refs/heads/${sourceBranch}`,
        { headers: this.headers }
      );

      // Create new branch
      const response = await axios.post(
        `${this.baseURL}/repos/${owner}/${repo}/git/refs`,
        {
          ref: `refs/heads/${branch}`,
          sha: sourceRef.data.object.sha,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create branch: ${error.response?.data?.message || error.message}`);
    }
  }

  async getCommitHistory(owner, repo, branch = 'main', path = '') {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/commits`,
        {
          headers: this.headers,
          params: {
            sha: branch,
            path: path,
            per_page: 50,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get commit history: ${error.response?.data?.message || error.message}`);
    }
  }

  async createPullRequest(owner, repo, title, body, head, base) {
    try {
      const response = await axios.post(
        `${this.baseURL}/repos/${owner}/${repo}/pulls`,
        {
          title,
          body,
          head,
          base,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create pull request: ${error.response?.data?.message || error.message}`);
    }
  }

  async getPullRequests(owner, repo, state = 'open') {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/pulls`,
        {
          headers: this.headers,
          params: { state, per_page: 20 },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get pull requests: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchCode(owner, repo, query) {
    try {
      const response = await axios.get(
        `${this.baseURL}/search/code`,
        {
          headers: this.headers,
          params: {
            q: `${query} repo:${owner}/${repo}`,
            per_page: 30,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search code: ${error.response?.data?.message || error.message}`);
    }
  }

  async getRepo(owner, repo) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get repository: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default GitHubAPI;
