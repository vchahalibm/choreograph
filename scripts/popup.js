// Popup Chat Interface
class DeskAgentPopup {
  constructor() {
    this.messages = [];
    this.isProcessing = false;

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

    // Load initial state
    this.loadMessages();
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
        <strong>DeskAgent Help</strong><br><br>
        I can help you automate browser tasks! Here's how:<br><br>
        <strong>Commands:</strong><br>
        • "show available scripts" - List all scripts<br>
        • "show available tasks" - List all task workflows<br>
        • "load model" - Load AI model<br>
        • "execute [script name]" - Run a script<br>
        • Natural language commands that match your scripts<br><br>
        <strong>Features:</strong><br>
        • Upload JSON automation scripts in settings<br>
        • Create task workflows with multiple steps<br>
        • Use natural language to trigger scripts<br>
        • AI-powered command matching
      `, true);
      return true;
    }

    // Load model command
    if (lowerCommand.includes('load model')) {
      this.addMessage('agent', 'Loading AI model... This may take a moment.');

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'LOAD_NLP_MODEL'
        });

        if (response.success) {
          this.addMessage('agent', '✅ AI model loaded successfully! You can now use natural language commands.');
        } else {
          this.addMessage('agent', `❌ Failed to load model: ${response.error}`);
        }
      } catch (error) {
        this.addMessage('agent', `❌ Error loading model: ${error.message}`);
      }
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
      const response = await chrome.runtime.sendMessage({
        type: 'PROCESS_NLP_COMMAND',
        command: command
      });

      if (response.success && response.result.matched) {
        const { script, confidence, parameters } = response.result;

        const confidencePercent = (confidence * 100).toFixed(1);

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
              <div class="empty-state-text">Welcome to DeskAgent!</div>
              <div class="empty-state-subtext">Type a command to get started</div>
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
