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
        
        // Initialize when DOM is ready
        this.init();
    }

    async init() {
        await this.waitForDOM();
        this.initializeEventListeners();
        this.initializeMonaco();
        this.checkAuthentication();
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

    async initializeEventListeners() {
        // Safe DOM element access with null checks
        this.initializeLoginEvents();
        this.initializeSidebarEvents();
        this.initializeEditorEvents();
        this.initializeModalEvents();
        this.initializeGitEvents();
        
        console.log('Git Editor event listeners initialized');
    }

    initializeLoginEvents() {
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    initializeSidebarEvents() {
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
    }

    initializeEditorEvents() {
        // File actions
        this.addEventListenerSafe('new-file-btn', 'click', () => {
            this.showNewFileModal();
        });

        this.addEventListenerSafe('upload-file-btn', 'click', () => {
            this.showUploadModal();
        });

        this.addEventListenerSafe('refresh-files-btn', 'click', () => {
            if (this.currentRepo) {
                this.loadRepositoryContents();
            }
        });

        // Editor actions
        this.addEventListenerSafe('edit-file-btn', 'click', () => {
            this.enableEditMode();
        });

        this.addEventListenerSafe('download-file-btn', 'click', () => {
            this.downloadFile();
        });

        this.addEventListenerSafe('delete-file-btn', 'click', () => {
            this.deleteFile();
        });

        this.addEventListenerSafe('save-btn', 'click', () => {
            this.saveFile();
        });

        this.addEventListenerSafe('cancel-edit-btn', 'click', () => {
            this.disableEditMode();
        });

        this.addEventListenerSafe('run-btn', 'click', () => {
            this.runCode();
        });

        this.addEventListenerSafe('format-btn', 'click', () => {
            this.formatCode();
        });
    }

    initializeGitEvents() {
        // Git actions
        this.addEventListenerSafe('pull-btn', 'click', () => {
            this.pullChanges();
        });

        this.addEventListenerSafe('push-btn', 'click', () => {
            this.pushChanges();
        });

        this.addEventListenerSafe('commit-btn', 'click', () => {
            this.showCommitModal();
        });

        // Repository actions
        this.addEventListenerSafe('new-repo-btn', 'click', () => {
            this.showNewRepoModal();
        });

        this.addEventListenerSafe('refresh-repos-btn', 'click', () => {
            this.loadRepositories();
        });

        // Branch management
        const branchSelect = document.getElementById('branch-select');
        if (branchSelect) {
            branchSelect.addEventListener('change', (e) => {
                this.switchBranch(e.target.value);
            });
        }

        this.addEventListenerSafe('new-branch-btn', 'click', () => {
            this.showNewBranchModal();
        });

        // Search
        this.addEventListenerSafe('search-btn', 'click', () => {
            this.searchInRepo();
        });

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchInRepo();
                }
            });
        }

        // Terminal
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.executeTerminalCommand(e.target.value);
                    e.target.value = '';
                }
            });
        }

        this.addEventListenerSafe('clear-terminal-btn', 'click', () => {
            this.clearTerminal();
        });

        // Settings
        this.addEventListenerSafe('settings-btn', 'click', () => {
            this.showSettingsModal();
        });
    }

    // Helper method to safely add event listeners
    addEventListenerSafe(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with id '${elementId}' not found`);
        }
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
        document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideAllModals();
            });
        });

        // New repository modal
        const newRepoForm = document.getElementById('new-repo-form');
        if (newRepoForm) {
            newRepoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createRepository();
            });
        }

        // New file modal
        const newFileForm = document.getElementById('new-file-form');
        if (newFileForm) {
            newFileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createFile();
            });
        }

        // Commit modal
        const commitForm = document.getElementById('commit-form');
        if (commitForm) {
            commitForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createCommit();
            });
        }

        // Upload modal
        const uploadForm = document.getElementById('upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.uploadFiles();
            });
        }

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
            // Try loading Monaco from CDN
            this.loadMonacoFromCDN();
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

    loadMonacoFromCDN() {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/monaco-editor@0.45.0/min/vs/loader.js';
        script.onload = () => {
            this.initializeMonaco();
        };
        document.head.appendChild(script);
    }

    createEditor() {
        if (!this.isMonacoReady) {
            console.warn('Monaco Editor not ready yet');
            return;
        }

        const container = document.getElementById('monaco-container');
        if (!container) {
            console.warn('Monaco container not found');
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
            
            if (monaco.editor.setTheme) {
                monaco.editor.setTheme(this.settings.theme);
            }
        }
    }

    async checkAuthentication() {
        this.showScreen('loading-screen');
        
        if (this.sessionId) {
            try {
                const response = await fetch(`/api/auth/validate?sessionId=${this.sessionId}`);
                const data = await response.json();
                
                if (data.success) {
                    this.user = data.user;
                    await this.initializeApp();
                } else {
                    this.showLoginScreen();
                }
            } catch (error) {
                console.error('Session validation failed:', error);
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const screenElement = document.getElementById(screenName);
        if (screenElement) {
            screenElement.classList.add('active');
        }
    }

    showLoginScreen() {
        this.showScreen('login-screen');
        this.refreshFeatherIcons();
    }

    async initializeApp() {
        this.showScreen('editor-screen');
        this.updateUserInfo();
        await this.loadRepositories();
        
        this.refreshFeatherIcons();
    }

    refreshFeatherIcons() {
        if (window.feather) {
            setTimeout(() => feather.replace(), 100);
        }
    }

    updateUserInfo() {
        if (!this.user) return;

        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        
        if (userAvatar && this.user.avatar_url) {
            userAvatar.src = this.user.avatar_url;
            userAvatar.alt = this.user.login;
        }
        
        if (userName) {
            userName.textContent = this.user.login;
        }
    }

    // ... rest of the methods remain largely the same, but with added null checks

    async handleLogin() {
        const tokenInput = document.getElementById('github-token');
        if (!tokenInput) return;

        const token = tokenInput.value.trim();
        
        if (!token) {
            this.showNotification('Error', 'Please enter a GitHub token', 'error');
            return;
        }

        const submitBtn = document.querySelector('#login-form button[type="submit"]');
        if (!submitBtn) return;

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

            const data = await response.json();

            if (data.success) {
                this.sessionId = data.sessionId;
                this.user = data.user;
                localStorage.setItem('gitEditorSession', this.sessionId);
                this.showNotification('Success', 'Successfully connected to GitHub', 'success');
                await this.initializeApp();
            } else {
                this.showNotification('Authentication Failed', data.error, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Connection Error', 'Failed to connect to GitHub', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.refreshFeatherIcons();
        }
    }

    // ... continue with the rest of your methods, adding similar null checks

    // Helper method to safely get element by ID
    getElementSafe(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    }

    // Update other methods to use safe element access
    displayFile(file, path) {
        const viewerFilePath = this.getElementSafe('viewer-file-path');
        const contentDisplay = this.getElementSafe('file-content-display');
        
        if (!viewerFilePath || !contentDisplay) return;

        viewerFilePath.textContent = path;
        
        const codeElement = contentDisplay.querySelector('code');
        if (!codeElement) return;
        
        const language = this.getLanguageFromFilename(file.name);
        codeElement.className = `language-${language}`;
        codeElement.textContent = file.decoded_content;
        
        this.applySyntaxHighlighting(codeElement, language);
        
        this.activeFile = {
            ...file,
            path: path,
            language: language
        };
        
        const fileViewer = this.getElementSafe('file-viewer');
        const editorContainer = this.getElementSafe('code-editor-container');
        
        if (fileViewer) fileViewer.classList.add('active');
        if (editorContainer) editorContainer.classList.remove('active');
        
        if (this.editor && file.decoded_content) {
            const model = monaco.editor.createModel(file.decoded_content, language);
            this.editor.setModel(model);
        }
    }

    // ... continue updating other methods with safe DOM access

    showNotification(title, message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) {
            console.warn('Notifications container not found');
            return;
        }

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

        this.refreshFeatherIcons();
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GitEditor();
});
