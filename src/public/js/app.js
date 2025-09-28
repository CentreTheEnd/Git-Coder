import { Utils } from './modules/utils.js';
import { UIManager } from './modules/ui.js';
import { AuthManager } from './modules/auth.js';
import { RepoManager } from './modules/repos.js';
import { FileManager } from './modules/files.js';
import { EditorManager } from './modules/editor.js';
import { GitManager } from './modules/git.js';

// Main Application Class
class GitEditor {
    constructor() {
        this.utils = new Utils();
        this.ui = new UIManager();
        this.auth = new AuthManager();
        this.repo = new RepoManager(this.auth);
        this.files = new FileManager(this.auth, this.repo);
        this.editor = new EditorManager(this.auth, this.repo, this.files);
        this.git = new GitManager(this.auth, this.repo);
        
        this.setupEventHandlers();
        this.initializeApp();
    }
    
    async initializeApp() {
        // Add global error handling
        this.utils.addGlobalErrorHandler();
        
        // Wait for DOM to be ready
        await this.utils.waitForDOM();
        
        // Check authentication
        const isAuthenticated = await this.auth.checkAuthentication();
        
        if (isAuthenticated) {
            await this.startApp();
        }
        
        // Setup load timeout as fallback
        this.setupLoadTimeout();
    }
    
    async startApp() {
        try {
            this.ui.showScreen('editor-screen');
            this.auth.updateUserInfo();
            
            // Load repositories
            await this.repo.loadRepositories();
            
            // Setup repository event handlers
            this.setupRepoEventHandlers();
            
            // Setup other event handlers
            this.setupAdditionalEventHandlers();
            
            console.log('Git Editor started successfully');
        } catch (error) {
            console.error('Failed to start app:', error);
            this.auth.showLoginScreen();
        }
    }
    
    setupEventHandlers() {
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.auth.handleLogout();
            });
        }
        
        // Repository type tabs
        document.querySelectorAll('.repo-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchRepoType(e.currentTarget.dataset.repoType);
            });
        });
        
        // Sidebar tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchSidebarTab(e.currentTarget.dataset.tab);
            });
        });
        
        // Output tabs
        document.querySelectorAll('.output-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchOutputTab(e.currentTarget.dataset.output);
            });
        });
        
        // Branch selector
        const branchSelect = document.getElementById('branch-select');
        if (branchSelect) {
            branchSelect.addEventListener('change', (e) => {
                this.repo.switchBranch(e.target.value);
            });
        }
        
        // Git actions
        const pullBtn = document.getElementById('pull-btn');
        if (pullBtn) {
            pullBtn.addEventListener('click', () => {
                this.pullChanges();
            });
        }
        
        const pushBtn = document.getElementById('push-btn');
        if (pushBtn) {
            pushBtn.addEventListener('click', () => {
                this.pushChanges();
            });
        }
        
        const commitBtn = document.getElementById('commit-btn');
        if (commitBtn) {
            commitBtn.addEventListener('click', () => {
                this.showCommitModal();
            });
        }
        
        // Repository actions
        const newRepoBtn = document.getElementById('new-repo-btn');
        if (newRepoBtn) {
            newRepoBtn.addEventListener('click', () => {
                this.showNewRepoModal();
            });
        }
        
        const refreshReposBtn = document.getElementById('refresh-repos-btn');
        if (refreshReposBtn) {
            refreshReposBtn.addEventListener('click', () => {
                this.repo.loadRepositories();
            });
        }
        
        // File actions
        const newFileBtn = document.getElementById('new-file-btn');
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => {
                this.showNewFileModal();
            });
        }
        
        const uploadFileBtn = document.getElementById('upload-file-btn');
        if (uploadFileBtn) {
            uploadFileBtn.addEventListener('click', () => {
                this.showUploadModal();
            });
        }
        
        const refreshFilesBtn = document.getElementById('refresh-files-btn');
        if (refreshFilesBtn) {
            refreshFilesBtn.addEventListener('click', () => {
                this.files.loadRepositoryContents(this.files.getCurrentPath());
            });
        }
        
        // File operations
        const deleteFileBtn = document.getElementById('delete-file-btn');
        if (deleteFileBtn) {
            deleteFileBtn.addEventListener('click', () => {
                this.files.deleteFile();
            });
        }
        
        const downloadFileBtn = document.getElementById('download-file-btn');
        if (downloadFileBtn) {
            downloadFileBtn.addEventListener('click', () => {
                this.files.downloadFile();
            });
        }
        
        // Modal forms
        this.setupModalForms();
    }
    
    setupRepoEventHandlers() {
        // Override repository event handlers
        this.repo.onRepositoryChange = (repo) => {
            this.onRepositoryChange(repo);
        };
        
        this.repo.onBranchChange = (branchName) => {
            this.onBranchChange(branchName);
        };
        
        // Override file event handlers
        this.files.onFileView = (file) => {
            this.onFileView(file);
        };
        
        // Override editor event handlers
        this.editor.onFileSave = (file) => {
            this.onFileSave(file);
        };
    }
    
    setupAdditionalEventHandlers() {
        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        
        if (searchBtn && searchInput) {
            const performSearch = this.utils.debounce(() => {
                this.searchInRepo(searchInput.value);
            }, 300);
            
            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('input', performSearch);
        }
        
        // Terminal functionality
        this.setupTerminal();
    }
    
    setupModalForms() {
        // New repository modal
        const newRepoForm = document.getElementById('new-repo-form');
        if (newRepoForm) {
            newRepoForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    name: document.getElementById('repo-name').value.trim(),
                    description: document.getElementById('repo-desc').value.trim(),
                    isPrivate: document.getElementById('repo-private').checked,
                    autoInit: document.getElementById('repo-auto-init').checked
                };
                
                if (!formData.name) {
                    this.ui.showNotification('Error', 'Repository name is required', 'error');
                    return;
                }
                
                const success = await this.repo.createRepository(formData);
                if (success) {
                    this.ui.hideAllModals();
                    newRepoForm.reset();
                }
            });
        }
        
        // New file modal
        const newFileForm = document.getElementById('new-file-form');
        if (newFileForm) {
            newFileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    path: document.getElementById('file-path').value.trim(),
                    content: document.getElementById('file-content').value,
                    message: document.getElementById('file-commit-message').value.trim()
                };
                
                if (!formData.path || !formData.message) {
                    this.ui.showNotification('Error', 'File path and commit message are required', 'error');
                    return;
                }
                
                const success = await this.files.createFile(formData);
                if (success) {
                    this.ui.hideAllModals();
                    newFileForm.reset();
                }
            });
        }
        
        // Commit modal
        const commitForm = document.getElementById('commit-form');
        if (commitForm) {
            commitForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const message = document.getElementById('commit-message').value.trim();
                
                if (!message) {
                    this.ui.showNotification('Error', 'Commit message is required', 'error');
                    return;
                }
                
                const commitData = {
                    message: message,
                    files: this.git.getChangedFiles().map(filePath => ({
                        path: filePath,
                        operation: 'update'
                    }))
                };
                
                const success = await this.git.createCommit(commitData);
                if (success) {
                    this.ui.hideAllModals();
                    commitForm.reset();
                }
            });
        }
        
        // Modal close buttons
        document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.ui.hideAllModals();
            });
        });
    }
    
    setupTerminal() {
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            terminalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.executeTerminalCommand(e.target.value);
                    e.target.value = '';
                }
            });
        }
        
        const clearTerminalBtn = document.getElementById('clear-terminal-btn');
        if (clearTerminalBtn) {
            clearTerminalBtn.addEventListener('click', () => {
                this.clearTerminal();
            });
        }
    }
    
    // Event handlers
    async onRepositoryChange(repo) {
        await this.files.loadRepositoryContents();
        await this.git.loadGitStatus();
        await this.git.loadCommitHistory();
    }
    
    async onBranchChange(branchName) {
        await this.files.loadRepositoryContents(this.files.getCurrentPath());
        await this.git.loadGitStatus();
    }
    
    onFileView(file) {
        // Reset changed files tracking when viewing a new file
        this.git.clearChangedFiles();
    }
    
    onFileSave(file) {
        // Track file change for git
        this.git.trackFileChange(file.path);
    }
    
    // UI Actions
    switchRepoType(type) {
        document.querySelectorAll('.repo-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-repo-type="${type}"]`).classList.add('active');
        
        this.repo.renderRepositories();
    }
    
    switchSidebarTab(tabName) {
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        document.querySelectorAll('.sidebar-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load data for specific tabs
        if (tabName === 'git' && this.repo.getCurrentRepo()) {
            this.git.loadGitStatus();
            this.git.loadCommitHistory();
        }
    }
    
    switchOutputTab(tabName) {
        document.querySelectorAll('.output-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-output="${tabName}"]`).classList.add('active');
        
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
            document.getElementById(paneId).classList.add('active');
        }
    }
    
    showNewRepoModal() {
        this.ui.showModal('new-repo-modal');
    }
    
    showNewFileModal() {
        if (!this.repo.getCurrentRepo()) {
            this.ui.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }
        this.ui.showModal('new-file-modal');
    }
    
    showUploadModal() {
        if (!this.repo.getCurrentRepo()) {
            this.ui.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }
        this.ui.showModal('upload-modal');
    }
    
    showCommitModal() {
        if (this.git.getChangedFiles().length === 0) {
            this.ui.showNotification('Info', 'No changes to commit', 'info');
            return;
        }
        this.ui.showModal('commit-modal');
    }
    
    async searchInRepo(query) {
        // Search functionality would be implemented here
        this.ui.showNotification('Info', 'Search functionality would be implemented here', 'info');
    }
    
    executeTerminalCommand(command) {
        // Basic terminal emulation
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
                break;
            case 'status':
                output = 'Git status would be shown here';
                break;
            case 'ls':
                output = 'file1.txt\nfile2.js\nsrc/\nREADME.md';
                break;
            case 'pwd':
                output = this.repo.getCurrentRepo() ? `/workspace/${this.repo.getCurrentRepo().name}` : '/workspace';
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
        newInput.focus();
        
        // Update event listener
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeTerminalCommand(e.target.value);
                e.target.value = '';
            }
        });
        
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
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.executeTerminalCommand(e.target.value);
                    e.target.value = '';
                }
            });
        }
    }
    
    async pullChanges() {
        if (!this.repo.getCurrentRepo()) {
            this.ui.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }
        this.ui.showNotification('Info', 'Pull functionality would be implemented here', 'info');
    }
    
    async pushChanges() {
        if (!this.repo.getCurrentRepo()) {
            this.ui.showNotification('Warning', 'Please select a repository first', 'warning');
            return;
        }
        this.ui.showNotification('Info', 'Push functionality would be implemented here', 'info');
    }
    
    setupLoadTimeout() {
        // Fallback in case loading gets stuck
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen && loadingScreen.classList.contains('active')) {
                console.log('Load timeout - forcing login screen');
                this.auth.showLoginScreen();
            }
        }, 10000);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GitEditor();
});
