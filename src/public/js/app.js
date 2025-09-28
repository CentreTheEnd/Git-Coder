class GitEditor {
    constructor() {
        this.sessionId = localStorage.getItem('gitEditorSession');
        this.currentRepo = null;
        this.openFiles = new Map();
        this.activeFile = null;
        this.editor = null;
        this.isMonacoReady = false;
        
        this.initializeEventListeners();
        this.initializeMonaco();
        this.checkAuthentication();
    }

    initializeEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // New repository
        document.getElementById('new-repo-btn').addEventListener('click', () => {
            this.showNewRepoModal();
        });

        document.getElementById('new-repo-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRepository();
        });

        document.getElementById('cancel-repo-btn').addEventListener('click', () => {
            this.hideNewRepoModal();
        });

        // Editor actions
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveFile();
        });

        document.getElementById('run-btn').addEventListener('click', () => {
            this.runCode();
        });

        // Theme selector
        document.getElementById('theme-selector').addEventListener('change', (e) => {
            this.changeTheme(e.target.value);
        });
    }

    initializeMonaco() {
        // Configure Monaco Editor
        require.config({ 
            paths: { 
                'vs': 'https://unpkg.com/monaco-editor@0.45.0/min/vs' 
            } 
        });

        require(['vs/editor/editor.main'], () => {
            this.isMonacoReady = true;
            this.createEditor();
        });
    }

    createEditor() {
        if (!this.isMonacoReady) return;

        const container = document.getElementById('monaco-container');
        
        this.editor = monaco.editor.create(container, {
            value: '// Select a file to start editing\n',
            language: 'javascript',
            theme: 'vs-dark',
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            minimap: {
                enabled: true
            },
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true
        });

        // Add keyboard shortcuts
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            this.saveFile();
        });

        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            this.runCode();
        });
    }

    changeTheme(theme) {
        if (this.editor) {
            monaco.editor.setTheme(theme);
        }
    }

    getLanguageFromFilename(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'yml': 'yaml',
            'yaml': 'yaml',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell',
            'ps1': 'powershell',
            'dockerfile': 'dockerfile'
        };

        return languageMap[extension] || 'plaintext';
    }

    async checkAuthentication() {
        if (this.sessionId) {
            try {
                await this.loadRepositories();
                this.showEditorScreen();
            } catch (error) {
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('editor-screen').classList.remove('active');
    }

    showEditorScreen() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('editor-screen').classList.add('active');
        
        // Ensure Monaco editor is properly sized
        setTimeout(() => {
            if (this.editor) {
                this.editor.layout();
            }
        }, 100);
    }

    async handleLogin() {
        const githubUrl = document.getElementById('github-url').value;
        const token = document.getElementById('github-token').value;

        // Show loading state
        const submitBtn = document.querySelector('#login-form button');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<div class="loading"></div> Connecting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ githubUrl, token }),
            });

            const data = await response.json();

            if (data.success) {
                this.sessionId = data.sessionId;
                localStorage.setItem('gitEditorSession', this.sessionId);
                
                document.getElementById('user-info').textContent = 
                    `Logged in as ${data.user.login}`;
                
                await this.loadRepositories();
                this.showEditorScreen();
            } else {
                alert('Login failed: ' + data.error);
            }
        } catch (error) {
            alert('Login error: ' + error.message);
        } finally {
            // Restore button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleLogout() {
        if (this.sessionId) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: this.sessionId }),
            });
        }

        this.sessionId = null;
        localStorage.removeItem('gitEditorSession');
        this.showLoginScreen();
    }

    async loadRepositories() {
        try {
            const response = await fetch(`/api/repos?sessionId=${this.sessionId}`);
            const data = await response.json();

            if (data.repos) {
                this.renderRepositories(data.repos);
            }
        } catch (error) {
            console.error('Failed to load repositories:', error);
        }
    }

    renderRepositories(repos) {
        const reposList = document.getElementById('repos-list');
        reposList.innerHTML = '';

        repos.forEach(repo => {
            const repoElement = document.createElement('div');
            repoElement.className = 'repo-item';
            repoElement.textContent = repo.name;
            repoElement.title = repo.description || repo.name;
            repoElement.addEventListener('click', () => {
                this.selectRepository(repo);
            });

            reposList.appendChild(repoElement);
        });
    }

    async selectRepository(repo) {
        this.currentRepo = repo;
        
        // Update active repo in UI
        document.querySelectorAll('.repo-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.classList.add('active');

        await this.loadRepositoryContents();
    }

    async loadRepositoryContents(path = '') {
        try {
            const response = await fetch(
                `/api/files/contents?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}&path=${path}`
            );
            const data = await response.json();

            if (data.contents) {
                this.renderFileTree(data.contents, path);
            }
        } catch (error) {
            console.error('Failed to load repository contents:', error);
        }
    }

    renderFileTree(contents, basePath = '') {
        const fileTree = document.getElementById('file-tree');
        
        if (!basePath) {
            fileTree.innerHTML = '';
        }

        // Separate files and folders
        const folders = contents.filter(item => item.type === 'dir');
        const files = contents.filter(item => item.type === 'file');

        // Render folders first
        folders.forEach(item => {
            const element = document.createElement('div');
            element.className = 'folder-item';
            element.textContent = item.name;
            element.addEventListener('click', () => {
                this.loadRepositoryContents(item.path);
            });

            fileTree.appendChild(element);
        });

        // Then render files
        files.forEach(item => {
            const element = document.createElement('div');
            element.className = 'file-item';
            element.textContent = item.name;
            element.addEventListener('click', () => {
                this.openFile(item);
            });

            fileTree.appendChild(element);
        });
    }

    async openFile(file) {
        try {
            const response = await fetch(
                `/api/files/file?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}&path=${file.path}`
            );
            const data = await response.json();

            if (data.file) {
                this.addFileToEditor(data.file);
            }
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    }

    addFileToEditor(file) {
        if (!this.openFiles.has(file.path)) {
            this.openFiles.set(file.path, file);
            this.createTab(file);
        }
        
        this.activateTab(file.path);
        this.loadFileContent(file);
    }

    createTab(file) {
        const tabsList = document.getElementById('editor-tabs-list');
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.filePath = file.path;
        
        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        fileName.style.flex = '1';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(file.path);
        });
        
        tab.appendChild(fileName);
        tab.appendChild(closeBtn);
        
        tab.addEventListener('click', () => {
            this.activateTab(file.path);
        });

        tabsList.appendChild(tab);
    }

    activateTab(filePath) {
        // Update tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-file-path="${filePath}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Load file content
        const file = this.openFiles.get(filePath);
        this.loadFileContent(file);
    }

    closeTab(filePath) {
        const tab = document.querySelector(`[data-file-path="${filePath}"]`);
        if (tab) {
            tab.remove();
        }
        
        this.openFiles.delete(filePath);
        
        // If we're closing the active tab, activate another one
        if (this.activeFile && this.activeFile.path === filePath) {
            const remainingFiles = Array.from(this.openFiles.keys());
            if (remainingFiles.length > 0) {
                this.activateTab(remainingFiles[0]);
            } else {
                this.activeFile = null;
                this.clearEditor();
            }
        }
    }

    loadFileContent(file) {
        this.activeFile = file;
        
        document.getElementById('current-file').textContent = file.path;
        
        if (this.editor) {
            const language = this.getLanguageFromFilename(file.name);
            const model = monaco.editor.createModel(
                file.decoded_content || '',
                language
            );
            
            this.editor.setModel(model);
            
            // Store the model with the file
            file.model = model;
        }
    }

    clearEditor() {
        if (this.editor) {
            const model = monaco.editor.createModel('', 'plaintext');
            this.editor.setModel(model);
        }
        document.getElementById('current-file').textContent = 'No file selected';
    }

    async saveFile() {
        if (!this.activeFile || !this.editor) return;

        const content = this.editor.getValue();
        const message = `Update ${this.activeFile.path}`;

        // Show loading state
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '<div class="loading"></div> Saving...';
        saveBtn.disabled = true;

        try {
            const response = await fetch('/api/files/file', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    owner: this.currentRepo.owner.login,
                    repo: this.currentRepo.name,
                    path: this.activeFile.path,
                    content: content,
                    message: message,
                    sha: this.activeFile.sha,
                }),
            });

            const data = await response.json();

            if (data.result) {
                console.log('File saved successfully!');
                // Update the SHA for future saves
                this.activeFile.sha = data.result.content.sha;
                this.activeFile.decoded_content = content;
            }
        } catch (error) {
            console.error('Failed to save file:', error);
            alert('Failed to save file: ' + error.message);
        } finally {
            // Restore button state
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    async runCode() {
        if (!this.activeFile || !this.editor) return;

        const content = this.editor.getValue();
        const language = this.getFileLanguage(this.activeFile.name);

        // Show loading state
        const runBtn = document.getElementById('run-btn');
        const originalText = runBtn.textContent;
        runBtn.innerHTML = '<div class="loading"></div> Running...';
        runBtn.disabled = true;

        try {
            const response = await fetch('/api/files/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: content,
                    language: language,
                }),
            });

            const data = await response.json();
            document.getElementById('output').textContent = data.output || 'No output';
            
            if (!data.success) {
                document.getElementById('output').style.color = '#f85149';
            } else {
                document.getElementById('output').style.color = '#c9d1d9';
            }
        } catch (error) {
            document.getElementById('output').textContent = 'Error: ' + error.message;
            document.getElementById('output').style.color = '#f85149';
        } finally {
            // Restore button state
            runBtn.textContent = originalText;
            runBtn.disabled = false;
        }
    }

    getFileLanguage(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        
        const languageMap = {
            'js': 'javascript',
            'py': 'python',
            'sh': 'bash',
            'html': 'html',
            'css': 'css',
        };

        return languageMap[extension] || 'javascript';
    }

    showNewRepoModal() {
        document.getElementById('new-repo-modal').classList.add('active');
    }

    hideNewRepoModal() {
        document.getElementById('new-repo-modal').classList.remove('active');
        document.getElementById('new-repo-form').reset();
    }

    async createRepository() {
        const name = document.getElementById('repo-name').value;
        const description = document.getElementById('repo-desc').value;
        const isPrivate = document.getElementById('repo-private').checked;

        // Show loading state
        const createBtn = document.querySelector('#new-repo-form button[type="submit"]');
        const originalText = createBtn.textContent;
        createBtn.innerHTML = '<div class="loading"></div> Creating...';
        createBtn.disabled = true;

        try {
            const response = await fetch('/api/repos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    name: name,
                    description: description,
                    isPrivate: isPrivate,
                }),
            });

            const data = await response.json();

            if (data.repo) {
                alert('Repository created successfully!');
                this.hideNewRepoModal();
                await this.loadRepositories();
            }
        } catch (error) {
            alert('Failed to create repository: ' + error.message);
        } finally {
            // Restore button state
            createBtn.textContent = originalText;
            createBtn.disabled = false;
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GitEditor();
});
