import axios from 'axios';

class GitHubAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.github.com';
    this.headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  async getUser() {
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  async getRepos() {
    try {
      const response = await axios.get(`${this.baseURL}/user/repos`, {
        headers: this.headers,
        params: {
          sort: 'updated',
          per_page: 100,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get repositories: ${error.message}`);
    }
  }

  async createRepo(name, description = '', isPrivate = false) {
    try {
      const response = await axios.post(
        `${this.baseURL}/user/repos`,
        {
          name,
          description,
          private: isPrivate,
          auto_init: true,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }

  async getContents(owner, repo, path = '') {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get contents: ${error.message}`);
    }
  }

  async getFileContent(owner, repo, path) {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.headers }
      );
      
      // Decode base64 content
      const content = Buffer.from(response.data.content, 'base64').toString('utf8');
      return {
        ...response.data,
        decoded_content: content,
      };
    } catch (error) {
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }

  async updateFile(owner, repo, path, content, message, sha = null) {
    try {
      const encodedContent = Buffer.from(content).toString('base64');
      
      const body = {
        message,
        content: encodedContent,
        ...(sha && { sha }),
      };

      const response = await axios.put(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        body,
        { headers: this.headers }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update file: ${error.message}`);
    }
  }

  async deleteFile(owner, repo, path, message, sha) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: this.headers,
          data: {
            message,
            sha,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

export default GitHubAPI;
