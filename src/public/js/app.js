class GitEditor {
    constructor() {
        this.sessionId = localStorage.getItem('gitEditorSession');
        this.currentRepo = null;
        this.currentBranch = 'main';
        this.currentPath = '';
        this.openFiles = new Map();
        this.activeFile = null;
        this.editor = null;
        this.isMonacoReady = false;
        this.changedFiles = new Set();
        this.settings = this.loadSettings();
        this.user = null;
        
        this.initializeEventListeners();
        this.initializeMonaco();
        
        // بدء فحص حالة التحميل كإجراء احتياطي
        this.startLoadCheck();
        
        // بدء فحص المصادقة مع تأخير أطول لضمان تحميل DOM بالكامل
        setTimeout(() => {
            this.checkAuthentication();
        }, 1000); // زيادة التأخير إلى ثانية واحدة
    }

    loadSettings() {
        const defaultSettings = {
            fontSize: 14,
            tabSize: 2,
            wordWrap: true,
            lineNumbers: true,
            theme: 'vs-dark',
            autoSave: true,
            formatOnSave: true
        };
        
        const saved = localStorage.getItem('gitEditorSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        localStorage.setItem('gitEditorSettings', JSON.stringify(this.settings));
    }

    startLoadCheck() {
        // Backup procedure: If loading screen stays too long, go to Login
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen && loadingScreen.style.display !== 'none') {
                console.log('Load timeout - showing login screen');
                this.clearSessionAndShowLogin();
            }
        }, 5000); // 5 seconds - reduced time for faster response
    }

    async initializeEventListeners() {
        // الانتظار حتى يكتمل تحميل DOM
        await this.waitForDOM();
        
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Sidebar tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchSidebarTab(e.currentTarget.dataset.tab);
            });
        });

        // Repository tabs
        document.querySelectorAll('.repo-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchRepoType(e.currentTarget.dataset.repoType);
            });
        });

        // Output tabs
        document.querySelectorAll('.output-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchOutputTab(e.currentTarget.dataset.output);
            });
        });

        // Git actions
        document.getElementById('pull-btn').addEventListener('click', () => {
            this.pullChanges();
        });

        document.getElementById('push-btn').addEventListener('click', () => {
            this.pushChanges();
        });

        document.getElementById('commit-btn').addEventListener('click', () => {
            this.showCommitModal();
        });

        // Repository actions
        document.getElementById('new-repo-btn').addEventListener('click', () => {
            this.showNewRepoModal();
        });

        document.getElementById('refresh-repos-btn').addEventListener('click', () => {
            this.loadRepositories();
        });

        // File actions
        document.getElementById('new-file-btn').addEventListener('click', () => {
            this.showNewFileModal();
        });

        document.getElementById('upload-file-btn').addEventListener('click', () => {
            this.showUploadModal();
        });

        document.getElementById('refresh-files-btn').addEventListener('click', () => {
            if (this.currentRepo) {
                this.loadRepositoryContents();
            }
        });

        // Branch management
        document.getElementById('new-branch-btn').addEventListener('click', () => {
            this.showNewBranchModal();
        });

        document.getElementById('branch-select').addEventListener('change', (e) => {
            this.switchBranch(e.target.value);
        });

        // Editor actions
        document.getElementById('edit-file-btn').addEventListener('click', () => {
            this.enableEditMode();
        });

        document.getElementById('download-file-btn').addEventListener('click', () => {
            this.downloadFile();
        });

        document.getElementById('delete-file-btn').addEventListener('click', () => {
            this.deleteFile();
        });

        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveFile();
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.disableEditMode();
        });

        document.getElementById('run-btn').addEventListener('click', () => {
            this.runCode();
        });

        document.getElementById('format-btn').addEventListener('click', () => {
            this.formatCode();
        });

        // Search
        document.getElementById('search-btn').addEventListener('click', () => {
            this.searchInRepo();
        });

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchInRepo();
            }
        });

        // Terminal
        document.getElementById('terminal-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeTerminalCommand(e.target.value);
                e.target.value = '';
            }
        });

        document.getElementById('clear-terminal-btn').addEventListener('click', () => {
            this.clearTerminal();
        });

        // Modals
        this.initializeModalEvents();
        
        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        // تحميل Feather Icons
        this.loadFeatherIcons();

        console.log('Git Editor event listeners initialized');
    }

    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    loadFeatherIcons() {
        if (window.feather) {
            feather.replace();
        } else {
            // إعادة المحاولة إذا لم تكن الأيقونات جاهزة
            setTimeout(() => this.loadFeatherIcons(), 100);
        }
    }

    initializeModalEvents() {
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAllModals();
            });
        });

        // New repository modal
        document.getElementById('new-repo-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRepository();
        });

        document.getElementById('cancel-repo-btn').addEventListener('click', () => {
            this.hideAllModals();
        });

        // New file modal
        document.getElementById('new-file-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createFile();
        });

        document.getElementById('cancel-file-btn').addEventListener('click', () => {
            this.hideAllModals();
        });

        // Commit modal
        document.getElementById('commit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createCommit();
        });

        document.getElementById('cancel-commit-btn').addEventListener('click', () => {
            this.hideAllModals();
        });

        // Upload modal
        document.getElementById('upload-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadFiles();
        });

        document.getElementById('cancel-upload-btn').addEventListener('click', () => {
            this.hideAllModals();
        });

        // Upload dropzone
        const dropzone = document.getElementById('upload-dropzone');
        const fileInput = document.getElementById('file-upload');
        
        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => {
                fileInput.click();
            });

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--accent-blue)';
                dropzone.style.background = 'var(--tertiary-bg)';
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.style.borderColor = 'var(--border-color)';
                dropzone.style.background = 'transparent';
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.style.borderColor = 'var(--border-color)';
                dropzone.style.background = 'transparent';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    this.showNotification('Files selected', `${files.length} file(s) ready for upload`, 'success');
                }
            });
        }
    }

    initializeMonaco() {
        if (typeof require === 'undefined') {
            console.log('Monaco Editor loader not available');
            // إعادة المحاولة بعد فترة
            setTimeout(() => this.initializeMonaco(), 1000);
            return;
        }

        require.config({ 
            paths: { 
                'vs': 'https://unpkg.com/monaco-editor@0.45.0/min/vs' 
            } 
        });

        require(['vs/editor/editor.main'], () => {
            this.isMonacoReady = true;
            this.createEditor();
            console.log('Monaco Editor initialized');
        });
    }

    createEditor() {
        if (!this.isMonacoReady) return;

        const container = document.getElementById('monaco-container');
        if (!container) {
            console.error('Monaco container not found');
            return;
        }

        try {
            this.editor = monaco.editor.create(container, {
                value: '// Select a file to start editing\n',
                language: 'javascript',
                theme: this.settings.theme,
                fontSize: this.settings.fontSize,
                tabSize: this.settings.tabSize,
                insertSpaces: true,
                lineNumbers: this.settings.lineNumbers ? 'on' : 'off',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: true,
                minimap: {
                    enabled: true
                },
                wordWrap: this.settings.wordWrap ? 'on' : 'off',
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

            this.applySettings();
        } catch (error) {
            console.error('Failed to create Monaco editor:', error);
        }
    }

    applySettings() {
        if (this.editor) {
            this.editor.updateOptions({
                fontSize: this.settings.fontSize,
                tabSize: this.settings.tabSize,
                wordWrap: this.settings.wordWrap ? 'on' : 'off',
                lineNumbers: this.settings.lineNumbers ? 'on' : 'off'
            });
            
            try {
                monaco.editor.setTheme(this.settings.theme);
            } catch (error) {
                console.error('Failed to set theme:', error);
            }
        }
    }

    async checkAuthentication() {
        this.showScreen('loading-screen');
        
        // إضافة تأخير أطول لضمان تحميل DOM بالكامل
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // تحقق إضافي من أن العناصر موجودة
        const loginScreen = document.getElementById('login-screen');
        const editorScreen = document.getElementById('editor-screen');
        
        if (!loginScreen || !editorScreen) {
            console.error('Required screens not found, retrying...');
            setTimeout(() => this.checkAuthentication(), 500);
            return;
        }
        
        if (this.sessionId) {
            try {
                console.log('Validating session:', this.sessionId);
                const url = `/api/auth/validate?sessionId=${this.sessionId}`;
                console.log('Making request to:', url);
                
                const response = await fetch(url);
                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                
                if (!response.ok) {
                    console.error('HTTP error response:', response.status, response.statusText);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.success) {
                    this.user = data.user;
                    await this.initializeApp();
                } else {
                    console.log('Session validation failed:', data.error);
                    this.clearSessionAndShowLogin();
                }
            } catch (error) {
                console.error('Session validation error:', error);
                console.error('Error details:', error.message);
                this.clearSessionAndShowLogin();
            }
        } else {
            console.log('No session ID found');
            this.showScreen('login-screen');
        }
    }

    clearSessionAndShowLogin() {
        // Clear session data
        this.sessionId = null;
        this.user = null;
        localStorage.removeItem('gitEditorSession');
        
        // Show login screen
        this.showScreen('login-screen');
        this.loadFeatherIcons();
    }

    showScreen(screenName) {
        try {
            console.log('Attempting to show screen:', screenName);
            
            // First, explicitly hide the loading screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.remove('active');
                loadingScreen.style.display = 'none';
                console.log('Loading screen hidden');
            }

            const screens = document.querySelectorAll('.screen');
            console.log('Found screens:', screens.length);
            
            if (screens.length === 0) {
                console.error('No screens found in DOM, retrying...');
                // Fallback: try to show login screen after DOM is ready
                setTimeout(() => this.showScreen(screenName), 200);
                return;
            }

            screens.forEach(screen => {
                screen.classList.remove('active');
                screen.style.display = 'none';
            });
            
            const targetScreen = document.getElementById(screenName);
            if (targetScreen) {
                targetScreen.classList.add('active');
                targetScreen.style.display = 'block';
                console.log('Successfully switched to screen:', screenName);
                
                // Ensure Feather icons are loaded for the new screen
                if (screenName === 'login-screen' || screenName === 'editor-screen') {
                    setTimeout(() => this.loadFeatherIcons(), 100);
                }
            } else {
                console.error(`Screen with id '${screenName}' not found`);
                // Fallback to login screen if target screen not found
                if (screenName !== 'login-screen') {
                    console.log('Falling back to login screen');
                    this.showScreen('login-screen');
                }
            }
        } catch (error) {
            console.error('Error switching screens:', error);
            // Fallback to login screen on error
            if (screenName !== 'login-screen') {
                console.log('Error fallback to login screen');
                this.showScreen('login-screen');
            }
        }
    }

    showLoginScreen() {
        this.showScreen('login-screen');
        this.loadFeatherIcons();
    }

    async initializeApp() {
        try {
            this.showScreen('editor-screen');
            this.updateUserInfo();
            await this.loadRepositories();
            
            this.loadFeatherIcons();
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showLoginScreen();
        }
    }

    updateUserInfo() {
        if (!this.user) return;

        try {
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');
            
            if (userAvatar) {
                userAvatar.src = this.user.avatar_url;
                userAvatar.alt = this.user.login;
            }
            
            if (userName) {
                userName.textContent = this.user.login;
            }
        } catch (error) {
            console.error('Error updating user info:', error);
        }
    }

    async handleLogin() {
        const tokenInput = document.getElementById('github-token');
        if (!tokenInput) {
            this.showNotification('Error', 'Login form not found', 'error');
            return;
        }

        const token = tokenInput.value.trim();
        
        if (!token) {
            this.showNotification('Error', 'Please enter a GitHub token', 'error');
            return;
        }

        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        if (!submitBtn) {
            this.showNotification('Error', 'Submit button not found', 'error');
            return;
        }

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner small"></div> Connecting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ githubToken: token }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.sessionId = data.sessionId;
                this.user = data.user;
                localStorage.setItem('gitEditorSession', this.sessionId);
                this.showNotification('Success', 'Successfully connected to GitHub', 'success');
                await this.initializeApp();
            } else {
                this.showNotification('Authentication Failed', data.error, 'error');
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Connection Error', 'Failed to connect to GitHub', 'error');
            this.showLoginScreen();
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.loadFeatherIcons();
        }
    }

    async handleLogout() {
        if (this.sessionId) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sessionId: this.sessionId }),
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        this.sessionId = null;
        this.user = null;
        this.currentRepo = null;
        localStorage.removeItem('gitEditorSession');
        this.showLoginScreen();
        this.showNotification('Logged Out', 'You have been successfully logged out', 'info');
    }

    async loadRepositories() {
        if (!this.sessionId) {
            console.log('No session ID for loading repositories');
            return;
        }

        try {
            const response = await fetch(`/api/repos?sessionId=${this.sessionId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.renderRepositories(data);
            } else {
                this.showNotification('Error', 'Failed to load repositories', 'error');
            }
        } catch (error) {
            console.error('Load repositories error:', error);
            this.showNotification('Connection Error', 'Failed to load repositories', 'error');
        }
    }

    renderRepositories(data) {
        const reposList = document.getElementById('repos-list');
        if (!reposList) {
            console.error('Repos list container not found');
            return;
        }

        const repoType = document.querySelector('.repo-tab.active')?.dataset.repoType || 'all';
        
        let repos = [];
        if (repoType === 'public') {
            repos = data.public || [];
        } else if (repoType === 'private') {
            repos = data.private || [];
        } else {
            repos = data.all || [];
        }

        if (repos.length === 0) {
            reposList.innerHTML = `
                <div class="empty-state">
                    <i data-feather="folder"></i>
                    <p>No ${repoType} repositories found</p>
                </div>
            `;
        } else {
            reposList.innerHTML = repos.map(repo => `
                <div class="repo-item" data-repo="${repo.full_name}" data-owner="${repo.owner.login}" data-name="${repo.name}">
                    <i data-feather="${repo.private ? 'lock' : 'folder'}"></i>
                    <div class="repo-info">
                        <div class="repo-name">${repo.name}</div>
                        <div class="repo-description">${repo.description || 'No description'}</div>
                    </div>
                </div>
            `).join('');

            // Add event listeners
            reposList.querySelectorAll('.repo-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.selectRepository({
                        name: item.dataset.name,
                        full_name: item.dataset.repo,
                        owner: { login: item.dataset.owner }
                    });
                });
            });
        }

        this.loadFeatherIcons();
    }

    switchRepoType(type) {
        document.querySelectorAll('.repo-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = document.querySelector(`[data-repo-type="${type}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        this.loadRepositories();
    }

    async selectRepository(repo) {
        this.currentRepo = repo;
        this.currentPath = '';
        
        // Update UI
        document.querySelectorAll('.repo-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const repoElement = document.querySelector(`[data-repo="${repo.full_name}"]`);
        if (repoElement) {
            repoElement.classList.add('active');
        }
        
        const currentRepoElement = document.getElementById('current-repo');
        if (currentRepoElement) {
            currentRepoElement.textContent = repo.full_name;
        }
        
        await this.loadBranches();
        await this.loadRepositoryContents();
        await this.loadGitStatus();
        
        this.showNotification('Repository Selected', `Now viewing ${repo.name}`, 'success');
    }

    async loadBranches() {
        if (!this.currentRepo || !this.sessionId) return;

        try {
            const response = await fetch(
                `/api/branches?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.renderBranches(data.branches);
            }
        } catch (error) {
            console.error('Load branches error:', error);
        }
    }

    renderBranches(branches) {
        const branchSelect = document.getElementById('branch-select');
        if (!branchSelect) return;

        branchSelect.innerHTML = branches.map(branch => `
            <option value="${branch.name}" ${branch.name === this.currentBranch ? 'selected' : ''}>
                ${branch.name}
            </option>
        `).join('');

        // Update branch display
        const branchTag = document.getElementById('current-branch');
        if (branchTag) {
            const span = branchTag.querySelector('span');
            if (span) {
                span.textContent = this.currentBranch;
            }
        }
    }

    async switchBranch(branchName) {
        this.currentBranch = branchName;
        
        // Update UI
        const branchTag = document.getElementById('current-branch');
        if (branchTag) {
            const span = branchTag.querySelector('span');
            if (span) {
                span.textContent = branchName;
            }
        }
        
        if (this.currentRepo) {
            await this.loadRepositoryContents();
            await this.loadGitStatus();
        }
    }

    async loadRepositoryContents(path = '') {
        if (!this.currentRepo || !this.sessionId) return;

        try {
            const response = await fetch(
                `/api/files/contents?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}&path=${path}&branch=${this.currentBranch}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.renderFileExplorer(data.contents, path);
            }
        } catch (error) {
            console.error('Load contents error:', error);
            this.showNotification('Error', 'Failed to load repository contents', 'error');
        }
    }

    renderFileExplorer(contents, currentPath) {
        const fileExplorer = document.getElementById('file-explorer');
        if (!fileExplorer) return;

        const { folders, files } = contents;

        if (folders.length === 0 && files.length === 0) {
            fileExplorer.innerHTML = `
                <div class="empty-state">
                    <i data-feather="folder"></i>
                    <p>This folder is empty</p>
                </div>
            `;
        } else {
            let html = '';

            // Add ".." for navigation (if not in root)
            if (currentPath) {
                html += `
                    <div class="folder-item" data-path="${this.getParentPath(currentPath)}">
                        <i data-feather="arrow-up"></i>
                        <span class="file-name">..</span>
                    </div>
                `;
            }

            // Add folders
            folders.forEach(folder => {
                html += `
                    <div class="folder-item" data-path="${folder.path}">
                        <i data-feather="folder"></i>
                        <span class="file-name">${folder.name}</span>
                    </div>
                `;
            });

            // Add files
            files.forEach(file => {
                html += `
                    <div class="file-item" data-path="${file.path}" data-type="file">
                        <i data-feather="file"></i>
                        <span class="file-name">${file.name}</span>
                    </div>
                `;
            });

            fileExplorer.innerHTML = html;

            // Add event listeners
            fileExplorer.querySelectorAll('.folder-item').forEach(item => {
                item.addEventListener('click', () => {
                    const path = item.dataset.path;
                    this.loadRepositoryContents(path);
                });
            });

            fileExplorer.querySelectorAll('.file-item').forEach(item => {
                item.addEventListener('click', () => {
                    const path = item.dataset.path;
                    this.viewFile(path);
                });
            });
        }

        this.loadFeatherIcons();
    }

    getParentPath(path) {
        const parts = path.split('/');
        parts.pop();
        return parts.join('/');
    }

    async viewFile(path) {
        if (!this.currentRepo || !this.sessionId) return;

        try {
            const response = await fetch(
                `/api/files/file?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}&path=${path}&branch=${this.currentBranch}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.displayFile(data.file, path);
            } else {
                this.showNotification('Error', 'Failed to load file', 'error');
            }
        } catch (error) {
            console.error('View file error:', error);
            this.showNotification('Error', 'Failed to load file', 'error');
        }
    }

    displayFile(file, path) {
        // Update file viewer
        const viewerFilePath = document.getElementById('viewer-file-path');
        if (viewerFilePath) {
            viewerFilePath.textContent = path;
        }
        
        const contentDisplay = document.getElementById('file-content-display');
        const codeElement = contentDisplay?.querySelector('code');
        
        if (codeElement) {
            // Syntax highlighting based on file extension
            const language = this.getLanguageFromFilename(file.name);
            codeElement.className = `language-${language}`;
            codeElement.textContent = file.decoded_content;
            
            // Apply simple syntax highlighting
            this.applySyntaxHighlighting(codeElement, language);
        }
        
        // Store file data for editing
        this.activeFile = {
            ...file,
            path: path,
            language: this.getLanguageFromFilename(file.name)
        };
        
        // Show file viewer, hide editor
        const fileViewer = document.getElementById('file-viewer');
        const codeEditorContainer = document.getElementById('code-editor-container');
        
        if (fileViewer) fileViewer.classList.add('active');
        if (codeEditorContainer) codeEditorContainer.classList.remove('active');
        
        // Update editor content if needed
        if (this.editor && this.activeFile.decoded_content) {
            try {
                const model = monaco.editor.createModel(this.activeFile.decoded_content, this.activeFile.language);
                this.editor.setModel(model);
            } catch (error) {
                console.error('Error setting editor model:', error);
            }
        }
    }

    applySyntaxHighlighting(element, language) {
        if (!element) return;
        
        const content = element.textContent;
        
        if (language === 'javascript') {
            // Simple JS highlighting
            let highlighted = content
                .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
                .replace(/(\b(function|return|if|else|for|while|var|let|const)\b)/g, '<span class="keyword">$1</span>')
                .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
            
            element.innerHTML = highlighted;
        } else {
            element.innerHTML = content;
        }
    }

    enableEditMode() {
        if (!this.activeFile) return;
        
        const fileViewer = document.getElementById('file-viewer');
        const codeEditorContainer = document.getElementById('code-editor-container');
        
        if (fileViewer) fileViewer.classList.remove('active');
        if (codeEditorContainer) codeEditorContainer.classList.add('active');
        
        const editorFilePath = document.getElementById('editor-file-path');
        if (editorFilePath) {
            editorFilePath.textContent = `Editing: ${this.activeFile.path}`;
        }
        
        // Set language selector
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            languageSelector.value = this.activeFile.language;
        }
    }

    disableEditMode() {
        const fileViewer = document.getElementById('file-viewer');
        const codeEditorContainer = document.getElementById('code-editor-container');
        
        if (fileViewer) fileViewer.classList.add('active');
        if (codeEditorContainer) codeEditorContainer.classList.remove('active');
    }

    async saveFile() {
        if (!this.activeFile || !this.editor || !this.currentRepo || !this.sessionId) return;

        const content = this.editor.getValue();
        const message = `Update ${this.activeFile.path}`;

        const saveBtn = document.getElementById('save-btn');
        if (!saveBtn) return;

        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<div class="loading-spinner small"></div> Saving...';
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
                    branch: this.currentBranch,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.activeFile.sha = data.result.content.sha;
                this.activeFile.decoded_content = content;
                this.showNotification('Success', 'File saved successfully', 'success');
                this.trackFileChange(this.activeFile.path);
                this.disableEditMode();
                this.displayFile(this.activeFile, this.activeFile.path);
            } else {
                this.showNotification('Error', 'Failed to save file', 'error');
            }
        } catch (error) {
            console.error('Save file error:', error);
            this.showNotification('Error', 'Failed to save file', 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            this.loadFeatherIcons();
        }
    }

    async runCode() {
        if (!this.activeFile || !this.editor) return;

        const content = this.editor.getValue();
        const language = this.activeFile.language;

        const runBtn = document.getElementById('run-btn');
        if (!runBtn) return;

        const originalText = runBtn.innerHTML;
        runBtn.innerHTML = '<div class="loading-spinner small"></div> Running...';
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                const outputContent = document.getElementById('output-content');
                if (outputContent) {
                    outputContent.textContent = data.output || 'No output';
                    outputContent.className = data.hasError ? 'text-error' : 'text-success';
                }
                
                this.switchOutputTab('output');
                this.showNotification('Code Executed', 'Code ran successfully', 'success');
            } else {
                this.showNotification('Error', 'Failed to run code', 'error');
            }
        } catch (error) {
            console.error('Run code error:', error);
            const outputContent = document.getElementById('output-content');
            if (outputContent) {
                outputContent.textContent = `Error: ${error.message}`;
                outputContent.className = 'text-error';
            }
            this.switchOutputTab('output');
        } finally {
            runBtn.innerHTML = originalText;
            runBtn.disabled = false;
            this.loadFeatherIcons();
        }
    }

    async downloadFile() {
        if (!this.activeFile) return;

        const content = this.activeFile.decoded_content;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.activeFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Download Started', `Downloading ${this.activeFile.name}`, 'success');
    }

    async deleteFile() {
        if (!this.activeFile || !this.currentRepo || !this.sessionId) return;

        if (!confirm(`Are you sure you want to delete ${this.activeFile.path}?`)) {
            return;
        }

        try {
            const response = await fetch('/api/files/file', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    owner: this.currentRepo.owner.login,
                    repo: this.currentRepo.name,
                    path: this.activeFile.path,
                    message: `Delete ${this.activeFile.path}`,
                    sha: this.activeFile.sha,
                    branch: this.currentBranch,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('Success', 'File deleted successfully', 'success');
                this.activeFile = null;
                const fileViewer = document.getElementById('file-viewer');
                if (fileViewer) fileViewer.classList.remove('active');
                await this.loadRepositoryContents(this.currentPath);
            } else {
                this.showNotification('Error', 'Failed to delete file', 'error');
            }
        } catch (error) {
            console.error('Delete file error:', error);
            this.showNotification('Error', 'Failed to delete file', 'error');
        }
    }

    formatCode() {
        if (this.editor) {
            try {
                const action = this.editor.getAction('editor.action.formatDocument');
                if (action) {
                    action.run();
                } else {
                    this.showNotification('Info', 'Formatting not available for this language', 'info');
                }
            } catch (error) {
                console.error('Format code error:', error);
                this.showNotification('Error', 'Failed to format code', 'error');
            }
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
            'bash': 'shell'
        };

        return languageMap[extension] || 'plaintext';
    }

    switchSidebarTab(tabName) {
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        document.querySelectorAll('.sidebar-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        // Load data for specific tabs
        if (tabName === 'git' && this.currentRepo) {
            this.loadGitStatus();
            this.loadCommitHistory();
        }
    }

    switchOutputTab(tabName) {
        document.querySelectorAll('.output-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const targetTab = document.querySelector(`[data-output="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        document.querySelectorAll('.output-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        let paneId = '';
        switch(tabName) {
            case 'output': paneId = 'output-pane'; break;
            case 'problems': paneId = 'problems-pane'; break;
            case 'console': paneId = 'console-pane'; break;
        }
        
        if (paneId) {
            const targetPane = document.getElementById(paneId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        }
    }

    async loadGitStatus() {
        if (!this.currentRepo || !this.sessionId) return;

        try {
            const response = await fetch(
                `/api/git/status?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.renderGitStatus(data.status);
            }
        } catch (error) {
            console.error('Load git status error:', error);
        }
    }

    renderGitStatus(status) {
        const currentBranch = document.getElementById('current-branch-status');
        const changesCount = document.getElementById('changes-count');
        
        if (currentBranch && status) {
            currentBranch.textContent = status.currentBranch || 'main';
        }
        
        if (changesCount && status) {
            changesCount.textContent = status.hasChanges ? '1+' : '0';
            changesCount.className = `status-value ${status.hasChanges ? 'text-warning' : ''}`;
        }
    }

    async loadCommitHistory() {
        if (!this.currentRepo || !this.sessionId) return;

        try {
            const response = await fetch(
                `/api/git/history?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}&branch=${this.currentBranch}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.renderCommitHistory(data.history);
            }
        } catch (error) {
            console.error('Load commit history error:', error);
        }
    }

    renderCommitHistory(commits) {
        const historyContainer = document.getElementById('commit-history');
        if (!historyContainer) return;

        if (!commits || commits.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <i data-feather="git-commit"></i>
                    <p>No commit history</p>
                </div>
            `;
        } else {
            historyContainer.innerHTML = commits.slice(0, 10).map(commit => `
                <div class="commit-item">
                    <div class="commit-message">${commit.commit.message.split('\n')[0]}</div>
                    <div class="commit-meta">
                        ${commit.commit.author.name} - ${new Date(commit.commit.author.date).toLocaleDateString()}
                    </div>
                </div>
            `).join('');
        }

        this.loadFeatherIcons();
    }

    trackFileChange(filePath) {
        this.changedFiles.add(filePath);
        
        const commitBtn = document.getElementById('commit-btn');
        if (commitBtn) {
            if (this.changedFiles.size > 0) {
                commitBtn.innerHTML = `<i data-feather="save"></i> Commit (${this.changedFiles.size})`;
                commitBtn.classList.add('btn-warning');
            } else {
                commitBtn.innerHTML = '<i data-feather="save"></i> Commit';
                commitBtn.classList.remove('btn-warning');
            }
            
            this.loadFeatherIcons();
        }
    }

    // Modal methods
    showNewRepoModal() {
        this.showModal('new-repo-modal');
    }

    showNewFileModal() {
        if (!this.currentRepo) {
            this.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }
        this.showModal('new-file-modal');
    }

    showUploadModal() {
        if (!this.currentRepo) {
            this.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }
        this.showModal('upload-modal');
    }

    showCommitModal() {
        if (this.changedFiles.size === 0) {
            this.showNotification('Info', 'No changes to commit', 'info');
            return;
        }
        this.showModal('commit-modal');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    async createRepository() {
        const nameInput = document.getElementById('repo-name');
        const descInput = document.getElementById('repo-desc');
        const privateInput = document.getElementById('repo-private');
        const autoInitInput = document.getElementById('repo-auto-init');

        if (!nameInput || !descInput || !privateInput || !autoInitInput) {
            this.showNotification('Error', 'Form elements not found', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        const isPrivate = privateInput.checked;
        const autoInit = autoInitInput.checked;

        if (!name) {
            this.showNotification('Error', 'Repository name is required', 'error');
            return;
        }

        const submitBtn = document.querySelector('#new-repo-form button[type="submit"]');
        if (!submitBtn) return;

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner small"></div> Creating...';
        submitBtn.disabled = true;

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
                    autoInit: autoInit,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('Success', 'Repository created successfully', 'success');
                this.hideAllModals();
                await this.loadRepositories();
            } else {
                this.showNotification('Error', data.error, 'error');
            }
        } catch (error) {
            console.error('Create repository error:', error);
            this.showNotification('Error', 'Failed to create repository', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.loadFeatherIcons();
        }
    }

    async createFile() {
        const pathInput = document.getElementById('file-path');
        const contentInput = document.getElementById('file-content');
        const messageInput = document.getElementById('file-commit-message');

        if (!pathInput || !contentInput || !messageInput) {
            this.showNotification('Error', 'Form elements not found', 'error');
            return;
        }

        const path = pathInput.value.trim();
        const content = contentInput.value;
        const message = messageInput.value.trim();

        if (!path || !message) {
            this.showNotification('Error', 'File path and commit message are required', 'error');
            return;
        }

        const submitBtn = document.querySelector('#new-file-form button[type="submit"]');
        if (!submitBtn) return;

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner small"></div> Creating...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/files/file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    owner: this.currentRepo.owner.login,
                    repo: this.currentRepo.name,
                    path: path,
                    content: content,
                    message: message,
                    branch: this.currentBranch,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('Success', 'File created successfully', 'success');
                this.hideAllModals();
                await this.loadRepositoryContents(this.currentPath);
            } else {
                this.showNotification('Error', data.error, 'error');
            }
        } catch (error) {
            console.error('Create file error:', error);
            this.showNotification('Error', 'Failed to create file', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.loadFeatherIcons();
        }
    }

    async createCommit() {
        const messageInput = document.getElementById('commit-message');
        if (!messageInput) {
            this.showNotification('Error', 'Commit message input not found', 'error');
            return;
        }

        const message = messageInput.value.trim();

        if (!message) {
            this.showNotification('Error', 'Commit message is required', 'error');
            return;
        }

        // In a real implementation, you would collect changed files and their content
        // For now, we'll use a simplified approach
        const files = Array.from(this.changedFiles).map(filePath => ({
            path: filePath,
            operation: 'update',
            content: this.activeFile?.decoded_content || '',
            sha: this.activeFile?.sha
        }));

        const submitBtn = document.querySelector('#commit-form button[type="submit"]');
        if (!submitBtn) return;

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner small"></div> Committing...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/git/commit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    owner: this.currentRepo.owner.login,
                    repo: this.currentRepo.name,
                    message: message,
                    files: files,
                    branch: this.currentBranch,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showNotification('Success', 'Changes committed successfully', 'success');
                this.hideAllModals();
                this.changedFiles.clear();
                await this.loadGitStatus();
            } else {
                this.showNotification('Error', data.error, 'error');
            }
        } catch (error) {
            console.error('Commit error:', error);
            this.showNotification('Error', 'Failed to commit changes', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.loadFeatherIcons();
        }
    }

    async uploadFiles() {
        const fileInput = document.getElementById('file-upload');
        const messageInput = document.getElementById('upload-commit-message');

        if (!fileInput || !messageInput) {
            this.showNotification('Error', 'Upload form elements not found', 'error');
            return;
        }

        const message = messageInput.value.trim();

        if (!fileInput.files.length) {
            this.showNotification('Error', 'Please select files to upload', 'error');
            return;
        }

        if (!message) {
            this.showNotification('Error', 'Commit message is required', 'error');
            return;
        }

        // Note: This is a simplified implementation
        // In a real app, you'd need to handle file uploads properly
        this.showNotification('Info', 'File upload would be implemented here', 'info');
        this.hideAllModals();
    }

    async searchInRepo() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) {
            this.showNotification('Error', 'Search input not found', 'error');
            return;
        }

        const query = searchInput.value.trim();
        
        if (!query) {
            this.showNotification('Warning', 'Please enter a search term', 'warning');
            return;
        }

        if (!this.currentRepo) {
            this.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }

        try {
            const response = await fetch(
                `/api/files/search?sessionId=${this.sessionId}&owner=${this.currentRepo.owner.login}&repo=${this.currentRepo.name}&query=${encodeURIComponent(query)}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.renderSearchResults(data.results);
            } else {
                this.showNotification('Error', 'Search failed', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Error', 'Search failed', 'error');
        }
    }

    renderSearchResults(results) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        if (!results.items || results.items.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i data-feather="search"></i>
                    <p>No results found</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = results.items.map(item => `
                <div class="search-result" data-path="${item.path}">
                    <div class="result-file">${item.path}</div>
                    <div class="result-preview">${item.name}</div>
                </div>
            `).join('');

            resultsContainer.querySelectorAll('.search-result').forEach(item => {
                item.addEventListener('click', () => {
                    this.viewFile(item.dataset.path);
                    this.switchSidebarTab('explorer');
                });
            });
        }

        this.loadFeatherIcons();
    }

    executeTerminalCommand(command) {
        const terminalContent = document.getElementById('terminal-content');
        if (!terminalContent) return;

        // Add the command to terminal history
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `
            <span class="terminal-prompt">$ </span>
            <span>${command}</span>
        `;
        terminalContent.appendChild(commandLine);

        // Execute command and show output
        const outputLine = document.createElement('div');
        outputLine.className = 'terminal-output';
        
        let output = '';
        switch(command.trim()) {
            case 'help':
                output = `Available commands:
help - Show this help message
clear - Clear terminal
status - Show git status
ls - List files
pwd - Show current directory`;
                break;
            case 'clear':
                terminalContent.innerHTML = `
                    <div class="terminal-welcome">
                        <p>Welcome to Git Editor Terminal</p>
                        <p>Type 'help' for available commands</p>
                    </div>
                `;
                // Re-attach event listener
                const newInput = terminalContent.querySelector('.terminal-input');
                if (newInput) {
                    newInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            this.executeTerminalCommand(e.target.value);
                            e.target.value = '';
                        }
                    });
                }
                return; // Exit early for clear command
            case 'status':
                output = 'Git status would be shown here';
                break;
            case 'ls':
                output = 'file1.txt\nfile2.js\nsrc/\nREADME.md';
                break;
            case 'pwd':
                output = this.currentRepo ? `/workspace/${this.currentRepo.name}` : '/workspace';
                break;
            default:
                output = `Command not found: ${command}. Type 'help' for available commands.`;
        }

        if (output) {
            outputLine.textContent = output;
            terminalContent.appendChild(outputLine);
        }

        // Add new input line
        const newInputLine = document.createElement('div');
        newInputLine.className = 'terminal-line';
        newInputLine.innerHTML = `
            <span class="terminal-prompt">$ </span>
            <input type="text" class="terminal-input">
        `;
        terminalContent.appendChild(newInputLine);

        // Focus new input
        const newInput = newInputLine.querySelector('.terminal-input');
        if (newInput) {
            newInput.focus();

            // Update event listener
            newInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.executeTerminalCommand(e.target.value);
                    e.target.value = '';
                }
            });
        }

        // Scroll to bottom
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    clearTerminal() {
        const terminalContent = document.getElementById('terminal-content');
        if (terminalContent) {
            terminalContent.innerHTML = `
                <div class="terminal-welcome">
                    <p>Welcome to Git Editor Terminal</p>
                    <p>Type 'help' for available commands</p>
                </div>
                <div class="terminal-line">
                    <span class="terminal-prompt">$ </span>
                    <input type="text" class="terminal-input">
                </div>
            `;

            // Re-attach event listener
            const input = terminalContent.querySelector('.terminal-input');
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.executeTerminalCommand(e.target.value);
                        e.target.value = '';
                    }
                });
                input.focus();
            }
        }
    }

    async pullChanges() {
        if (!this.currentRepo) {
            this.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }

        this.showNotification('Info', 'Pull functionality would be implemented here', 'info');
    }

    async pushChanges() {
        if (!this.currentRepo) {
            this.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }

        this.showNotification('Info', 'Push functionality would be implemented here', 'info');
    }

    showSettingsModal() {
        // This would show a settings modal in a real implementation
        this.showNotification('Info', 'Settings would be available here', 'info');
    }

    showNotification(title, message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i data-feather="${this.getNotificationIcon(type)}"></i>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i data-feather="x"></i>
            </button>
        `;

        notifications.appendChild(notification);

        // Add close event
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        this.loadFeatherIcons();
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type] || 'info';
    }
}

// معالجة الأخطاء العامة
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Git Editor...');
    
    // تحميل Feather Icons فوراً
    if (window.feather) {
        feather.replace();
    }
    
    // تأخير إضافي لضمان تحميل جميع العناصر
    setTimeout(() => {
        console.log('Starting Git Editor initialization...');
        new GitEditor();
    }, 500);
});

// إجراء احتياطي: إذا بقيت شاشة التحميل، انتقل لشاشة Login
setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    const loginScreen = document.getElementById('login-screen');
    
    if (loadingScreen && loadingScreen.classList.contains('active') && loginScreen) {
        console.log('Fallback: Switching to login screen due to timeout');
        loadingScreen.classList.remove('active');
        loadingScreen.style.display = 'none';
        loginScreen.classList.add('active');
        loginScreen.style.display = 'block';
        
        // Clear any existing session data
        localStorage.removeItem('gitEditorSession');
        
        if (window.feather) {
            feather.replace();
        }
    }
}, 10000); // 10 ثواني - زيادة الوقت قليلاً للسماح بالتحميل الكامل
