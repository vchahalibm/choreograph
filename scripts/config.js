// Configuration Page Script
class ConfigManager {
  constructor() {
    this.jsonScripts = [];
    this.jsScripts = [];
    this.settings = {};
    this.aiWorker = null;
    this.workerCallbacks = new Map();
    this.workerMessageId = 0;

    this.init();
  }

  async init() {
    // Make instance globally available
    window.configManager = this;

    // Load stored data
    await this.loadData();

    // Setup event listeners
    this.setupEventListeners();

    // Render lists
    this.renderJsonScripts();
    this.renderJsScripts();
    this.loadSettings();

    // Initialize Task UI Manager
    if (typeof TaskUIManager !== 'undefined') {
      window.taskUIManager = new TaskUIManager(this);
      await window.taskUIManager.init();
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  // Handle messages from background script requesting NLP processing
  async handleBackgroundMessage(message, sender, sendResponse) {
    if (message.type === 'PROCESS_COMMAND_IN_CONFIG') {
      try {
        if (!this.aiWorker) {
          sendResponse({ success: false, error: 'AI Worker not initialized. Please load the model first from Settings tab.' });
          return;
        }

        const response = await this.sendWorkerMessage('PROCESS_COMMAND', {
          command: message.command,
          scripts: message.scripts,
          options: message.options || {}
        });

        sendResponse({ success: true, result: response.data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // JSON file upload
    document.getElementById('jsonFileInput').addEventListener('change', (e) => {
      this.handleJsonUpload(e.target.files);
    });

    // JS file upload
    document.getElementById('jsFileInput').addEventListener('change', (e) => {
      this.handleJsUpload(e.target.files);
    });

    // Load NLP Model
    document.getElementById('loadModelBtn').addEventListener('click', () => {
      this.loadNLPModel();
    });

    // Save settings
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    // Clear all data
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      this.clearAllData();
    });

    // Reset clickable defaults
    document.getElementById('resetClickableDefaults').addEventListener('click', () => {
      this.resetClickableDefaults();
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
  }

  async handleJsonUpload(files) {
    const statusEl = document.getElementById('jsonStatus');
    const fileNameEl = document.getElementById('jsonFileName');

    if (!files || files.length === 0) return;

    try {
      for (const file of files) {
        const content = await this.readFile(file);
        const script = JSON.parse(content);

        // Generate unique ID
        script.id = this.generateId();
        script.fileName = file.name;
        script.uploadedAt = new Date().toISOString();

        this.jsonScripts.push(script);
      }

      await this.saveData();
      this.renderJsonScripts();

      statusEl.textContent = `Successfully uploaded ${files.length} script(s)`;
      statusEl.className = 'status-message success';
      statusEl.style.display = 'block';

      fileNameEl.textContent = `${files.length} file(s) uploaded`;

      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    } catch (error) {
      statusEl.textContent = `Error: ${error.message}`;
      statusEl.className = 'status-message error';
      statusEl.style.display = 'block';
    }
  }

  async handleJsUpload(files) {
    const statusEl = document.getElementById('jsStatus');
    const fileNameEl = document.getElementById('jsFileName');

    if (!files || files.length === 0) return;

    try {
      for (const file of files) {
        const code = await this.readFile(file);

        const script = {
          id: this.generateId(),
          fileName: file.name,
          name: file.name.replace('.js', ''),
          code: code,
          uploadedAt: new Date().toISOString()
        };

        this.jsScripts.push(script);
      }

      await this.saveData();
      this.renderJsScripts();

      statusEl.textContent = `Successfully uploaded ${files.length} script(s)`;
      statusEl.className = 'status-message success';
      statusEl.style.display = 'block';

      fileNameEl.textContent = `${files.length} file(s) uploaded`;

      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    } catch (error) {
      statusEl.textContent = `Error: ${error.message}`;
      statusEl.className = 'status-message error';
      statusEl.style.display = 'block';
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  renderJsonScripts() {
    const listEl = document.getElementById('jsonScriptList');

    if (this.jsonScripts.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No JSON scripts saved yet</div>';
      return;
    }

    listEl.innerHTML = this.jsonScripts.map(script => `
      <div class="script-item" data-id="${script.id}">
        <div class="script-info">
          <div class="script-title">${script.title || script.fileName}</div>
          <div class="script-description">
            ${script.description || `${script.steps?.length || 0} steps`} •
            Uploaded: ${new Date(script.uploadedAt).toLocaleDateString()}
          </div>
        </div>
        <div class="script-actions">
          <button class="btn btn-primary execute-btn" data-id="${script.id}">Execute</button>
          <button class="btn btn-secondary view-btn" data-id="${script.id}">View</button>
          <button class="btn btn-danger delete-btn" data-id="${script.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    listEl.querySelectorAll('.execute-btn').forEach(btn => {
      btn.addEventListener('click', () => this.executeScript(btn.dataset.id));
    });

    listEl.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => this.viewScript(btn.dataset.id, 'json'));
    });

    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteScript(btn.dataset.id, 'json'));
    });
  }

  renderJsScripts() {
    const listEl = document.getElementById('jsScriptList');

    if (this.jsScripts.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No JavaScript scripts saved yet</div>';
      return;
    }

    listEl.innerHTML = this.jsScripts.map(script => `
      <div class="script-item" data-id="${script.id}">
        <div class="script-info">
          <div class="script-title">${script.name}</div>
          <div class="script-description">
            ${script.code.split('\n').length} lines •
            Uploaded: ${new Date(script.uploadedAt).toLocaleDateString()}
          </div>
        </div>
        <div class="script-actions">
          <button class="btn btn-secondary view-btn" data-id="${script.id}">View</button>
          <button class="btn btn-danger delete-btn" data-id="${script.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    listEl.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => this.viewScript(btn.dataset.id, 'js'));
    });

    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteScript(btn.dataset.id, 'js'));
    });
  }

  async executeScript(scriptId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_SCRIPT',
        scriptId: scriptId
      });

      if (response.success) {
        alert('Script execution started!');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert(`Error executing script: ${error.message}`);
    }
  }

  viewScript(scriptId, type) {
    const script = type === 'json'
      ? this.jsonScripts.find(s => s.id === scriptId)
      : this.jsScripts.find(s => s.id === scriptId);

    if (!script) return;

    const content = type === 'json'
      ? JSON.stringify(script, null, 2)
      : script.code;

    const newWindow = window.open('', '_blank', 'width=800,height=600');
    newWindow.document.write(`
      <html>
        <head>
          <title>${script.title || script.name}</title>
          <style>
            body {
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              margin: 0;
              padding: 20px;
              background: #1e1e1e;
              color: #d4d4d4;
            }
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <pre>${this.escapeHtml(content)}</pre>
        </body>
      </html>
    `);
  }

  async deleteScript(scriptId, type) {
    if (!confirm('Are you sure you want to delete this script?')) return;

    if (type === 'json') {
      this.jsonScripts = this.jsonScripts.filter(s => s.id !== scriptId);
      await this.saveData();
      this.renderJsonScripts();
    } else {
      this.jsScripts = this.jsScripts.filter(s => s.id !== scriptId);
      await this.saveData();
      this.renderJsScripts();
    }
  }

  async loadNLPModel() {
    const btn = document.getElementById('loadModelBtn');
    const statusEl = document.getElementById('modelStatus');
    const statusText = document.getElementById('modelStatusText');
    const indicator = statusEl.querySelector('.status-indicator');

    btn.disabled = true;
    statusEl.style.display = 'flex';
    statusText.textContent = 'Creating AI Worker...';
    indicator.classList.add('loading');

    try {
      // Create Web Worker directly in config page (no CSP restrictions here!)
      if (!this.aiWorker) {
        console.log('Creating Web Worker for AI model...');
        // Use webpack-bundled worker with @huggingface/transformers for Granite 4.0 support
        this.aiWorker = new Worker(chrome.runtime.getURL('scripts/ai-worker.bundled.js'));

        // Listen for messages from worker
        this.aiWorker.addEventListener('message', (event) => {
          this.handleWorkerMessage(event.data);
        });

        this.aiWorker.addEventListener('error', (error) => {
          console.error('AI Worker error:', error);
        });

        this.workerCallbacks = new Map();
        this.workerMessageId = 0;

        console.log('✅ Web Worker created successfully');
      }

      statusText.textContent = 'Loading Granite 4.0 model...';

      // Send load model command to worker
      const response = await this.sendWorkerMessage('LOAD_MODEL', {
        modelId: 'onnx-community/granite-4.0-micro-ONNX-web'
      }, (progress) => {
        statusText.textContent = `Loading ${progress.file}: ${Math.round(progress.progress)}%`;
      });

      if (response.type === 'MODEL_LOADED' && response.data.success) {
        statusText.textContent = `Model loaded successfully on ${response.data.device}`;
        indicator.classList.remove('loading');

        // Notify background script that model is ready
        await chrome.runtime.sendMessage({
          type: 'MODEL_READY_IN_CONFIG',
          device: response.data.device
        });

        console.log('✅ Model loaded and background script notified');
      } else {
        throw new Error('Model loading failed');
      }
    } catch (error) {
      console.error('❌ Error loading model:', error);
      statusText.textContent = `Error: ${error.message}`;
      indicator.style.background = '#ea4335';
      indicator.classList.remove('loading');
    } finally {
      btn.disabled = false;
    }
  }

  // Send message to AI Worker
  sendWorkerMessage(type, data, onProgress = null) {
    return new Promise((resolve, reject) => {
      if (!this.aiWorker) {
        reject(new Error('AI Worker not initialized'));
        return;
      }

      const messageId = ++this.workerMessageId;
      this.workerCallbacks.set(messageId, { resolve, reject, onProgress });

      this.aiWorker.postMessage({ type, data, messageId });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.workerCallbacks.has(messageId)) {
          this.workerCallbacks.delete(messageId);
          reject(new Error('AI Worker timeout'));
        }
      }, 300000);
    });
  }

  // Handle messages from AI Worker
  handleWorkerMessage(data) {
    const { messageId, type, data: responseData, error } = data;

    const callback = this.workerCallbacks.get(messageId);
    if (!callback) {
      console.warn('No callback found for worker message:', messageId);
      return;
    }

    if (type === 'ERROR') {
      this.workerCallbacks.delete(messageId);
      callback.reject(new Error(error.message));
    } else if (type === 'PROGRESS') {
      // Progress updates don't resolve the promise
      if (callback.onProgress) {
        callback.onProgress(responseData);
      }
      // Keep callback for final response
    } else {
      this.workerCallbacks.delete(messageId);
      callback.resolve({ type, data: responseData });
    }
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['settings']);
    this.settings = result.settings || {};

    document.getElementById('defaultTimeout').value = this.settings.defaultTimeout || 30000;
    document.getElementById('defaultTargetUrl').value = this.settings.defaultTargetUrl || '';
    document.getElementById('debugDelayEnabled').checked = this.settings.debugDelayEnabled || false;
    document.getElementById('debugDelaySeconds').value = this.settings.debugDelaySeconds || 5;

    // Load clickable element settings with defaults
    const defaults = this.getClickableDefaults();
    document.getElementById('clickableTags').value = this.settings.clickableTags || defaults.tags;
    document.getElementById('clickableRoles').value = this.settings.clickableRoles || defaults.roles;
    document.getElementById('clickableDataAttrs').value = this.settings.clickableDataAttrs || defaults.dataAttrs;
    document.getElementById('clickableClassNames').value = this.settings.clickableClassNames || defaults.classNames;
  }

  getClickableDefaults() {
    return {
      tags: 'a, button',
      roles: 'button, link, row, gridcell, listitem, option, menuitem',
      dataAttrs: 'click, action, cell, row, item, chat',
      classNames: 'click, link, button, action'
    };
  }

  resetClickableDefaults() {
    const defaults = this.getClickableDefaults();
    document.getElementById('clickableTags').value = defaults.tags;
    document.getElementById('clickableRoles').value = defaults.roles;
    document.getElementById('clickableDataAttrs').value = defaults.dataAttrs;
    document.getElementById('clickableClassNames').value = defaults.classNames;
  }

  async saveSettings() {
    const statusEl = document.getElementById('settingsStatus');

    this.settings = {
      defaultTimeout: parseInt(document.getElementById('defaultTimeout').value),
      defaultTargetUrl: document.getElementById('defaultTargetUrl').value,
      debugDelayEnabled: document.getElementById('debugDelayEnabled').checked,
      debugDelaySeconds: parseInt(document.getElementById('debugDelaySeconds').value),
      clickableTags: document.getElementById('clickableTags').value,
      clickableRoles: document.getElementById('clickableRoles').value,
      clickableDataAttrs: document.getElementById('clickableDataAttrs').value,
      clickableClassNames: document.getElementById('clickableClassNames').value
    };

    await chrome.storage.local.set({ settings: this.settings });

    // Notify content scripts to reload their configuration
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'RELOAD_CLICKABLE_CONFIG'
          });
        } catch (e) {
          // Tab might not have content script, ignore
        }
      }
    } catch (e) {
      console.log('Could not notify tabs:', e);
    }

    statusEl.textContent = 'Settings saved successfully';
    statusEl.className = 'status-message success';
    statusEl.style.display = 'block';

    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }

  async clearAllData() {
    if (!confirm('This will delete ALL scripts and settings. Are you sure?')) return;

    this.jsonScripts = [];
    this.jsScripts = [];
    this.settings = {};

    await chrome.storage.local.clear();

    this.renderJsonScripts();
    this.renderJsScripts();
    this.loadSettings();

    alert('All data cleared');
  }

  async loadData() {
    const result = await chrome.storage.local.get(['jsonScripts', 'jsScripts']);
    this.jsonScripts = result.jsonScripts || [];
    this.jsScripts = result.jsScripts || [];
  }

  async saveData() {
    await chrome.storage.local.set({
      jsonScripts: this.jsonScripts,
      jsScripts: this.jsScripts
    });
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Initialize
new ConfigManager();
