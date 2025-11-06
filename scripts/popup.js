// Popup Chat Interface
class DeskAgentPopup {
  constructor() {
    this.messages = [];
    this.isProcessing = false;

    // AI Worker state
    this.aiWorker = null;
    this.modelLoaded = false;
    this.isModelLoading = false;
    this.workerMessageId = 0;
    this.pendingWorkerMessages = new Map();

    this.init();
  }

  init() {
    // Setup event listeners
    document.getElementById('sendBtn').addEventListener('click', () => {
      this.sendCommand();
    });

    document.getElementById('commandInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isProcessing) {
        this.sendCommand();
      }
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Quick actions
    document.querySelectorAll('.quick-action').forEach(action => {
      action.addEventListener('click', () => {
        const command = action.dataset.command;
        document.getElementById('commandInput').value = command;
        this.sendCommand();
      });
    });

    // Initialize AI Worker
    this.initializeAIWorker();

    // Disable input until model loads
    this.setInputEnabled(false);

    // Load initial state
    this.loadMessages();
  }

  initializeAIWorker() {
    try {
      // Create AI worker from bundled file
      this.aiWorker = new Worker(chrome.runtime.getURL('scripts/ai-worker.bundled.js'));

      // Set up message listener
      this.aiWorker.addEventListener('message', (event) => {
        this.handleWorkerMessage(event.data);
      });

      // Set up error listener
      this.aiWorker.addEventListener('error', (error) => {
        console.error('AI Worker error:', error);
        this.updateModelStatus('error', 'Worker error: ' + error.message);
        this.setInputEnabled(true); // Enable input even on error
      });

      console.log('✅ AI Worker initialized in popup');

      // Automatically load the model
      this.loadAIModel();
    } catch (error) {
      console.error('Failed to initialize AI worker:', error);
      this.updateModelStatus('error', 'Failed to initialize worker');
      this.setInputEnabled(true); // Enable input anyway (will fall back to text matching)
    }
  }

  async loadAIModel() {
    if (this.modelLoaded || this.isModelLoading) {
      console.log('Model already loaded or loading');
      return;
    }

    this.isModelLoading = true;
    this.updateModelStatus('loading', 'Loading Granite 4.0 AI model...');

    try {
      const response = await this.sendWorkerMessage('LOAD_MODEL', {
        modelId: 'onnx-community/granite-4.0-micro-ONNX-web'
      });

      if (response.type === 'MODEL_LOADED' && response.data.success) {
        this.modelLoaded = true;
        this.isModelLoading = false;
        const device = response.data.device || 'unknown';
        this.updateModelStatus('ready', `✅ AI model ready (${device})`);
        this.setInputEnabled(true);
        console.log('✅ Granite 4.0 model loaded successfully');
      } else {
        throw new Error('Model load failed');
      }
    } catch (error) {
      console.error('Failed to load AI model:', error);
      this.isModelLoading = false;
      this.updateModelStatus('error', '⚠️ Model load failed (using text matching)');
      this.setInputEnabled(true); // Enable input anyway
    }
  }

  sendWorkerMessage(type, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.aiWorker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const messageId = ++this.workerMessageId;
      const timeout = setTimeout(() => {
        this.pendingWorkerMessages.delete(messageId);
        reject(new Error('Worker message timeout'));
      }, 300000); // 5 minutes for model loading

      this.pendingWorkerMessages.set(messageId, { resolve, reject, timeout });

      this.aiWorker.postMessage({ type, data, messageId });
    });
  }

  handleWorkerMessage(message) {
    const { messageId, type, data, error } = message;

    // Handle progress updates (no messageId required)
    if (type === 'PROGRESS' && data) {
      const progress = Math.round(data.progress || 0);
      this.updateModelStatus('loading', `Loading ${data.file}: ${progress}%`);
      return;
    }

    // Handle pending message responses
    if (messageId && this.pendingWorkerMessages.has(messageId)) {
      const pending = this.pendingWorkerMessages.get(messageId);
      clearTimeout(pending.timeout);
      this.pendingWorkerMessages.delete(messageId);

      if (error) {
        pending.reject(new Error(error.message));
      } else {
        pending.resolve({ type, data });
      }
    }
  }

  setInputEnabled(enabled) {
    const input = document.getElementById('commandInput');
    const sendBtn = document.getElementById('sendBtn');

    if (enabled) {
      input.disabled = false;
      input.placeholder = 'Type a command in natural language...';
      sendBtn.disabled = false;
    } else {
      input.disabled = true;
      input.placeholder = 'Loading AI model...';
      sendBtn.disabled = true;
    }
  }

  updateModelStatus(status, message) {
    const statusElement = document.getElementById('modelStatus');
    if (!statusElement) return;

    statusElement.className = `model-status model-status-${status}`;
    statusElement.textContent = message;

    // Auto-hide success status after 3 seconds
    if (status === 'ready') {
      setTimeout(() => {
        statusElement.style.opacity = '0';
        setTimeout(() => {
          statusElement.style.display = 'none';
        }, 300);
      }, 3000);
    } else {
      statusElement.style.display = 'block';
      statusElement.style.opacity = '1';
    }
  }

  async sendCommand() {
    const input = document.getElementById('commandInput');
    const command = input.value.trim();

    if (!command || this.isProcessing) return;

    // Clear input
    input.value = '';

    // Add user message
    this.addMessage('user', command);

    // Set processing state
    this.setProcessing(true);

    try {
      // Handle special commands
      if (await this.handleSpecialCommand(command)) {
        return;
      }

      // Process NLP command
      await this.processNLPCommand(command);
    } catch (error) {
      console.error('Error processing command:', error);
      this.addMessage('agent', `Error: ${error.message}`);
    } finally {
      this.setProcessing(false);
    }
  }

  async handleSpecialCommand(command) {
    const lowerCommand = command.toLowerCase();

    // Help command
    if (lowerCommand.includes('help')) {
      this.addMessage('agent', `
        <strong>Choreograph Help</strong><br><br>
        I can help you automate browser tasks! Here's how:<br><br>
        <strong>Commands:</strong><br>
        • "show available scripts" - List all scripts<br>
        • "show available tasks" - List all task workflows<br>
        • "model status" - Check AI model status<br>
        • "execute [script name]" - Run a script<br>
        • Natural language commands that match your scripts<br><br>
        <strong>Features:</strong><br>
        • Upload JSON automation scripts in settings<br>
        • Create task workflows with multiple steps<br>
        • Use natural language to trigger scripts<br>
        • AI-powered command matching with Granite 4.0 model<br>
        • Model loads automatically when popup opens
      `, true);
      return true;
    }

    // Model status command
    if (lowerCommand.includes('model status') || lowerCommand.includes('ai status')) {
      const status = this.modelLoaded ? 'loaded and ready' : (this.isModelLoading ? 'currently loading' : 'not loaded');
      this.addMessage('agent', `AI Model Status: ${status}`);
      return true;
    }

    // Show scripts command
    if (lowerCommand.includes('available scripts') || lowerCommand.includes('list scripts')) {
      await this.showAvailableScripts();
      return true;
    }

    // Show tasks command
    if (lowerCommand.includes('available tasks') || lowerCommand.includes('list tasks') || lowerCommand.includes('show tasks')) {
      await this.showAvailableTasks();
      return true;
    }

    // Execute/Run task command
    if (lowerCommand.includes('run task') || lowerCommand.includes('execute task') ||
        (lowerCommand.includes('run') && lowerCommand.includes('task')) ||
        (lowerCommand.includes('execute') && lowerCommand.includes('task'))) {
      await this.handleTaskExecution(command);
      return true;
    }

    return false;
  }

  async handleTaskExecution(command) {
    // Try to extract task name from command
    const tasks = await this.getStoredTasks();

    if (tasks.length === 0) {
      this.addMessage('agent', 'No tasks available. Create tasks in the settings page first.');
      return;
    }

    // Simple matching: find task name in command
    let matchedTask = null;
    const lowerCommand = command.toLowerCase();

    // Remove common words to extract task name
    const cleanCommand = lowerCommand
      .replace(/run|execute|task|the|my|a|an/g, '')
      .trim();

    // Try exact match first
    for (const task of tasks) {
      const taskTitle = task.title.toLowerCase();
      if (lowerCommand.includes(taskTitle)) {
        matchedTask = task;
        break;
      }
    }

    // Try partial match
    if (!matchedTask) {
      for (const task of tasks) {
        const taskTitle = task.title.toLowerCase();
        const words = cleanCommand.split(/\s+/).filter(w => w.length > 2);

        for (const word of words) {
          if (taskTitle.includes(word) || word.includes(taskTitle)) {
            matchedTask = task;
            break;
          }
        }
        if (matchedTask) break;
      }
    }

    if (matchedTask) {
      this.addMessage('agent', `Found task: <strong>${matchedTask.title}</strong> (${matchedTask.steps?.length || 0} steps)<br>Executing now...`);
      await this.executeTaskById(matchedTask.id);
    } else {
      // Show all available tasks
      let message = 'I couldn\'t find a matching task. Here are your available tasks:<br><br>';
      message += '<strong>Available Tasks:</strong><br><br>';

      tasks.forEach((task, index) => {
        const stepCount = task.steps ? task.steps.length : 0;
        message += `${index + 1}. <strong>${task.title}</strong><br>`;
        message += `   ${stepCount} steps<br>`;
        message += `   <button class="script-suggestion-btn btn-execute-task" data-task-id="${task.id}">Execute</button><br><br>`;
      });

      message += '<br>Try: "run task [task name]" or click Execute button above.';

      this.addMessage('agent', message, true);
      this.attachExecuteHandlers();
    }
  }

  async showAvailableScripts() {
    const scripts = await this.getStoredScripts();

    if (scripts.length === 0) {
      this.addMessage('agent', 'No scripts available. Upload scripts in the settings page.');
      return;
    }

    let message = '<strong>Available Scripts:</strong><br><br>';

    scripts.forEach((script, index) => {
      message += `${index + 1}. <strong>${script.title || script.fileName}</strong><br>`;
      if (script.description) {
        message += `   ${script.description}<br>`;
      }
      message += `   <button class="script-suggestion-btn btn-execute-script" data-script-id="${script.id}">Execute</button><br><br>`;
    });

    this.addMessage('agent', message, true);
    this.attachExecuteHandlers();
  }

  async showAvailableTasks() {
    const tasks = await this.getStoredTasks();

    if (tasks.length === 0) {
      this.addMessage('agent', 'No tasks available. Create tasks in the settings page.');
      return;
    }

    let message = '<strong>Available Tasks:</strong><br><br>';

    tasks.forEach((task, index) => {
      const stepCount = task.steps ? task.steps.length : 0;
      message += `${index + 1}. <strong>${task.title}</strong><br>`;
      if (task.description) {
        message += `   ${task.description}<br>`;
      }
      message += `   ${stepCount} steps<br>`;
      message += `   <button class="script-suggestion-btn btn-execute-task" data-task-id="${task.id}">Execute</button><br><br>`;
    });

    this.addMessage('agent', message, true);
    this.attachExecuteHandlers();
  }

  // Attach event handlers to dynamically created buttons
  attachExecuteHandlers() {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      // Attach script execute handlers
      const scriptButtons = document.querySelectorAll('.btn-execute-script');
      scriptButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const scriptId = btn.getAttribute('data-script-id');
          if (scriptId) {
            await this.executeScriptById(scriptId);
          }
        });
      });

      // Attach task execute handlers
      const taskButtons = document.querySelectorAll('.btn-execute-task');
      taskButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const taskId = btn.getAttribute('data-task-id');
          if (taskId) {
            await this.executeTaskById(taskId);
          }
        });
      });
    }, 0);
  }

  async processNLPCommand(command) {
    this.addMessage('agent', 'Processing your command...');

    try {
      // Get available scripts
      const scripts = await this.getStoredScripts();

      if (scripts.length === 0) {
        this.addMessage('agent', 'No scripts available. Upload scripts in the settings page.');
        return;
      }

      // Try using AI model if loaded
      let result = null;
      if (this.modelLoaded && this.aiWorker) {
        try {
          const response = await this.sendWorkerMessage('PROCESS_COMMAND', {
            command,
            scripts,
            options: {
              maxTokens: 10,
              temperature: 0.3
            }
          });

          if (response.type === 'COMMAND_RESULT' && response.data) {
            result = response.data;
          }
        } catch (error) {
          console.error('AI worker processing failed, falling back to text matching:', error);
        }
      }

      // Fallback to text matching if AI model not available or failed
      if (!result) {
        result = await this.fallbackScriptMatching(command, scripts);
      }

      if (result.matched) {
        const { script, confidence, parameters } = result;

        const confidencePercent = ((confidence || 0.5) * 100).toFixed(1);

        // Store parameters for execution
        this.lastMatchedParameters = parameters || {};

        let parametersInfo = '';
        if (parameters && Object.keys(parameters).length > 0) {
          parametersInfo = `<div style="font-size: 11px; color: #666; margin-top: 5px;">
            Parameters: ${JSON.stringify(parameters)}
          </div>`;
        }

        const suggestion = `
          <div class="script-suggestion">
            <div class="script-suggestion-title">📋 Found matching script (${confidencePercent}% match)</div>
            <div><strong>${script.title || script.fileName}</strong></div>
            <div style="font-size: 12px; margin-top: 5px;">
              ${script.description || `${script.steps?.length || 0} steps`}
            </div>
            ${parametersInfo}
            <div class="script-suggestion-actions">
              <button class="script-suggestion-btn btn-execute-script" data-script-id="${script.id}">
                Execute Now
              </button>
            </div>
          </div>
        `;

        this.addMessage('agent', suggestion, true);
        this.attachExecuteHandlers();
      } else {
        this.addMessage('agent', `
          I couldn't find a matching script for your command.<br><br>
          Try:<br>
          • "show available scripts" to see all scripts<br>
          • Upload more scripts in settings<br>
          • Rephrase your command
        `, true);
      }
    } catch (error) {
      console.error('NLP processing error:', error);
      this.addMessage('agent', `Error: ${error.message}`);
    }
  }

  async fallbackScriptMatching(command, scripts) {
    // Simple keyword-based matching as fallback
    const lowerCommand = command.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const script of scripts) {
      const title = (script.title || '').toLowerCase();
      const description = (script.description || '').toLowerCase();
      const fileName = (script.fileName || '').toLowerCase();

      let score = 0;

      // Check for exact title match
      if (lowerCommand.includes(title) && title.length > 2) {
        score += 1.0;
      }

      // Check for word matches
      const commandWords = lowerCommand.split(/\s+/);
      const titleWords = title.split(/\s+/);
      const descWords = description.split(/\s+/);

      for (const word of commandWords) {
        if (word.length < 3) continue;
        if (titleWords.includes(word)) score += 0.3;
        if (descWords.includes(word)) score += 0.2;
        if (fileName.includes(word)) score += 0.2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = script;
      }
    }

    // Threshold for accepting a match
    if (bestScore > 0.3) {
      return {
        matched: true,
        script: bestMatch,
        confidence: Math.min(bestScore, 0.9),
        reasoning: 'Text matching'
      };
    }

    return { matched: false };
  }

  async executeScriptById(scriptId, customParameters = null) {
    // Use custom parameters if provided, otherwise use last matched parameters
    const parameters = customParameters || this.lastMatchedParameters || {};

    if (Object.keys(parameters).length > 0) {
      this.addMessage('system', `Executing script with parameters: ${JSON.stringify(parameters)}`);
    } else {
      this.addMessage('system', `Executing script...`);
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_SCRIPT',
        scriptId: scriptId,
        parameters: parameters
      });

      if (response.success) {
        this.addMessage('agent', '✅ Script execution started successfully!');
      } else {
        this.addMessage('agent', `❌ Script execution failed: ${response.error}`);
      }
    } catch (error) {
      this.addMessage('agent', `❌ Error: ${error.message}`);
    }
  }

  async executeTaskById(taskId, customParameters = null) {
    // Use custom parameters if provided, otherwise use last matched parameters
    const parameters = customParameters || this.lastMatchedParameters || {};

    if (Object.keys(parameters).length > 0) {
      this.addMessage('system', `Executing task with parameters: ${JSON.stringify(parameters)}`);
    } else {
      this.addMessage('system', `Executing task...`);
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_TASK',
        taskId: taskId,
        parameters: parameters
      });

      if (response.success) {
        this.addMessage('agent', '✅ Task execution started successfully!');
      } else {
        this.addMessage('agent', `❌ Task execution failed: ${response.error}`);
      }
    } catch (error) {
      this.addMessage('agent', `❌ Error: ${error.message}`);
    }
  }

  addMessage(type, content, isHtml = false) {
    // Remove empty state if present
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    const messagesContainer = document.getElementById('messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    if (type === 'user') {
      messageDiv.innerHTML = `
        <div class="message-content">${this.escapeHtml(content)}</div>
        <div class="message-avatar">👤</div>
      `;
    } else if (type === 'agent') {
      messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">${isHtml ? content : this.escapeHtml(content)}</div>
      `;
    } else if (type === 'system') {
      messageDiv.innerHTML = `
        <div class="message-content">${isHtml ? content : this.escapeHtml(content)}</div>
      `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Store message
    this.messages.push({ type, content, timestamp: Date.now() });
    this.saveMessages();
  }

  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('commandInput');

    sendBtn.disabled = isProcessing;
    input.disabled = isProcessing;

    if (isProcessing) {
      sendBtn.textContent = '⏳';
    } else {
      sendBtn.textContent = '▶';
    }
  }

  async getStoredScripts() {
    const result = await chrome.storage.local.get(['jsonScripts']);
    return result.jsonScripts || [];
  }

  async getStoredTasks() {
    const result = await chrome.storage.local.get(['tasks']);
    return result.tasks || [];
  }

  loadMessages() {
    const stored = localStorage.getItem('deskagent_messages');
    if (stored) {
      try {
        this.messages = JSON.parse(stored);

        // Clear messages container
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';

        // Render stored messages (limit to last 20)
        const recentMessages = this.messages.slice(-20);
        recentMessages.forEach(msg => {
          this.addMessage(msg.type, msg.content, msg.type === 'agent');
        });

        // If no messages, show empty state
        if (recentMessages.length === 0) {
          messagesContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">💬</div>
              <div class="empty-state-text">Welcome to Choreograph!</div>
              <div class="empty-state-subtext">AI model is loading... You can type when ready</div>
            </div>
          `;
        }
      } catch (e) {
        console.error('Error loading messages:', e);
      }
    }
  }

  saveMessages() {
    // Keep only last 50 messages
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(-50);
    }
    localStorage.setItem('deskagent_messages', JSON.stringify(this.messages));
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

// Make executeScriptById available globally for button clicks
window.executeScriptById = async function(scriptId) {
  const popup = window.deskAgentPopup;
  if (popup) {
    await popup.executeScriptById(scriptId);
  }
};

// Make executeTaskById available globally for button clicks
window.executeTaskById = async function(taskId) {
  const popup = window.deskAgentPopup;
  if (popup) {
    await popup.executeTaskById(taskId);
  }
};

// Initialize popup
window.deskAgentPopup = new DeskAgentPopup();
