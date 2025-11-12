// Popup Chat Interface
class DeskAgentPopup {
  constructor() {
    this.messages = [];
    this.isProcessing = false;

    // AI Worker state (via sendMessage - no ports!)
    this.modelLoaded = false;
    this.isModelLoading = false;

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

    // Listen for MODEL_STATUS broadcasts from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'MODEL_STATUS') {
        this.handleWorkerMessage(message);
      }
    });

    // Initialize AI Worker connection
    this.initializeAIWorker();

    // Disable input until model loads
    this.setInputEnabled(false);

    // Load initial state
    this.loadMessages();
  }

  async initializeAIWorker() {
    console.log('✅ [Popup] Using chrome.runtime.sendMessage for communication (no ports!)');

    // Check if model is already loaded in offscreen document
    await this.checkOffscreenModelStatus();
  }

  async checkOffscreenModelStatus() {
    try {
      // Ask background script about offscreen model status
      const status = await chrome.runtime.sendMessage({
        type: 'CHECK_OFFSCREEN_STATUS'
      });

      if (status && status.modelLoaded) {
        // Model already loaded in offscreen document
        this.modelLoaded = true;
        this.isModelLoading = false;
        this.updateModelStatus('ready', '✅ AI model ready (cached)');
        this.setInputEnabled(true);
        console.log('✅ Model already loaded in offscreen document');
      } else if (status && status.modelLoading) {
        // Model currently loading
        this.isModelLoading = true;
        this.updateModelStatus('loading', 'Loading Granite 4.0 AI model...');
        this.setInputEnabled(false);
        console.log('⏳ Model loading in offscreen document');
      } else {
        // Model not loaded, trigger load
        this.loadAIModel();
      }
    } catch (error) {
      console.error('Failed to check offscreen model status:', error);
      // Fall back to loading
      this.loadAIModel();
    }
  }

  async loadAIModel() {
    if (this.modelLoaded || this.isModelLoading) {
      console.log('Model already loaded or loading');
      return;
    }

    this.isModelLoading = true;
    this.updateModelStatus('loading', 'Loading Granite 4.0 AI model...');
    this.setInputEnabled(false);

    try {
      // Request model reload in offscreen document
      const response = await chrome.runtime.sendMessage({
        type: 'RELOAD_MODEL'
      });

      if (response && response.success) {
        console.log('✅ Model load triggered in offscreen document');
        // Will receive MODEL_STATUS update through background
      } else {
        throw new Error('Model load request failed');
      }
    } catch (error) {
      console.error('Failed to load AI model:', error);
      this.isModelLoading = false;
      this.updateModelStatus('error', '⚠️ Model load failed (using text matching)');
      this.setInputEnabled(true); // Enable input anyway
    }
  }

  async sendWorkerMessage(type, data = {}) {
    console.log('📨 [Popup] sendWorkerMessage() START');
    console.log('   Type:', type);
    console.log('   Data keys:', Object.keys(data));

    try {
      // Use simple sendMessage instead of ports
      console.log('📤 [Popup] Sending message to background...');
      const response = await chrome.runtime.sendMessage({
        type: type,
        data: data
      });

      console.log('✅ [Popup] Received response from background:', response);
      return response;
    } catch (error) {
      console.error('❌ [Popup] Error sending message:', error);
      throw error;
    }
  }

  handleWorkerMessage(message) {
    console.log('📬 [Popup] handleWorkerMessage() called');
    console.log('   Message:', message);

    const { messageId, requestId, type, data, error } = message;

    // Use requestId (port messages) or messageId (legacy) as the identifier
    const msgId = requestId || messageId;
    console.log('🆔 [Popup] Message ID:', msgId, 'Type:', type);

    // Handle progress updates (no msgId required)
    if (type === 'PROGRESS' && data) {
      console.log('📊 [Popup] Progress update:', data);
      const progress = Math.round(data.progress || 0);
      this.updateModelStatus('loading', `Loading ${data.file}: ${progress}%`);
      return;
    }

    // Handle model status updates from background/offscreen
    if (type === 'MODEL_STATUS') {
      console.log('📊 [Popup] Model status update:', data);
      if (data && data.loaded) {
        this.modelLoaded = true;
        this.isModelLoading = false;
        const device = data.device || 'unknown';
        this.updateModelStatus('ready', `✅ AI model ready (${device})`);
        this.setInputEnabled(true);
        console.log('✅ Model loaded in offscreen document');
      }
      return;
    }

    // Handle pending message responses
    console.log('🔍 [Popup] Checking pending requests for msgId:', msgId);
    console.log('📊 [Popup] Pending requests:', Array.from(this.pendingWorkerMessages.keys()));

    if (msgId && this.pendingWorkerMessages.has(msgId)) {
      console.log('✅ [Popup] Found pending request for msgId:', msgId);
      const pending = this.pendingWorkerMessages.get(msgId);
      clearTimeout(pending.timeout);
      this.pendingWorkerMessages.delete(msgId);

      if (error) {
        console.error('❌ [Popup] Resolving with error:', error);
        pending.reject(new Error(error.message));
      } else {
        console.log('✅ [Popup] Resolving with data');
        pending.resolve({ type, data });
      }
    } else if (msgId) {
      console.warn('⚠️ [Popup] No pending request found for msgId:', msgId);
    } else {
      console.warn('⚠️ [Popup] Message has no ID');
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
    console.log('🚀 [Popup] sendCommand() called');
    const input = document.getElementById('commandInput');
    const command = input.value.trim();

    console.log('📝 [Popup] Command:', command);
    console.log('🔒 [Popup] isProcessing:', this.isProcessing);

    if (!command || this.isProcessing) {
      console.warn('⚠️ [Popup] Command rejected - empty or already processing');
      return;
    }

    // Clear input
    input.value = '';

    // Add user message
    this.addMessage('user', command);
    console.log('👤 [Popup] User message added to UI');

    // Set processing state
    this.setProcessing(true);
    console.log('⏳ [Popup] Processing state set to true');

    try {
      // Handle special commands
      console.log('🔍 [Popup] Checking for special commands...');
      const isSpecial = await this.handleSpecialCommand(command);
      console.log('🔍 [Popup] Is special command:', isSpecial);

      if (isSpecial) {
        console.log('✅ [Popup] Special command handled, returning');
        return;
      }

      // Process NLP command
      console.log('🤖 [Popup] Processing NLP command...');
      await this.processNLPCommand(command);
      console.log('✅ [Popup] NLP command processing complete');
    } catch (error) {
      console.error('❌ [Popup] Error processing command:', error);
      console.error('❌ [Popup] Error stack:', error.stack);
      this.addMessage('agent', `Error: ${error.message}`);
    } finally {
      console.log('🏁 [Popup] Finally block - setting processing to false');
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
    console.log('🧠 [Popup] processNLPCommand() START - command:', command);
    this.addMessage('agent', 'Processing your command...');
    console.log('💬 [Popup] Added "Processing..." message to UI');

    try {
      // Get available scripts (may be empty - that's OK for non-ACTION intents)
      console.log('📂 [Popup] Getting stored scripts...');
      const scripts = await this.getStoredScripts();
      console.log('📂 [Popup] Retrieved scripts:', scripts.length, 'scripts');

      // Try using AI model if loaded
      let result = null;
      console.log('🔍 [Popup] Checking AI model availability...');
      console.log('   modelLoaded:', this.modelLoaded);

      if (this.modelLoaded) {
        console.log('✅ [Popup] AI model available, sending to worker...');
        try {
          console.log('📤 [Popup] Calling sendWorkerMessage...');
          const response = await this.sendWorkerMessage('PROCESS_COMMAND', {
            command,
            scripts,
            options: {
              maxTokens: 250,        // Increased for intent classification
              responseTokens: 100,   // For LLM-generated responses
              temperature: 0.3
            }
          });

          console.log('🔍 [Popup] Received response from worker:', response);

          if (response.type === 'COMMAND_RESULT' && response.data) {
            result = response.data;
            console.log('✅ [Popup] Result data:', result);
          } else {
            console.warn('⚠️ [Popup] Unexpected response format:', response);
          }
        } catch (error) {
          console.error('❌ [Popup] AI worker processing failed, falling back to text matching:', error);
          console.error('❌ [Popup] Error stack:', error.stack);
        }
      } else {
        console.warn('⚠️ [Popup] Model not loaded. modelLoaded:', this.modelLoaded);
      }

      // Fallback to text matching if AI model not available or failed
      if (!result) {
        console.log('🔄 [Popup] No result from AI, using fallback matching...');
        result = await this.fallbackScriptMatching(command, scripts);
        console.log('🔄 [Popup] Fallback result:', result);
      }

      // Handle result based on intent category
      console.log('🎯 [Popup] Handling intent result...');
      await this.handleIntentResult(result);
      console.log('✅ [Popup] Intent result handled');
    } catch (error) {
      console.error('❌ [Popup] NLP processing error:', error);
      console.error('❌ [Popup] Error stack:', error.stack);
      this.addMessage('agent', `Error: ${error.message}`);
    }
    console.log('🧠 [Popup] processNLPCommand() END');
  }

  async handleIntentResult(result) {
    const { matched, intent_category, response, script, confidence, parameters, classification } = result;

    // Log intent for debugging
    if (intent_category) {
      console.log(`📊 Intent: ${intent_category}`, classification);
    }

    // Handle different intent types
    switch (intent_category) {
      case 'INFORMATIONAL':
      case 'EXTRACTION':
      case 'ANALYSIS':
      case 'CONVERSATIONAL':
      case 'META':
      case 'CONFIGURATION':
        // Display LLM-generated response
        if (response) {
          const iconMap = {
            'INFORMATIONAL': '💡',
            'EXTRACTION': '📊',
            'ANALYSIS': '📈',
            'CONVERSATIONAL': '💬',
            'META': 'ℹ️',
            'CONFIGURATION': '⚙️'
          };
          const icon = iconMap[intent_category] || '🤖';
          this.addMessage('agent', `${icon} ${response}`, true);
        } else {
          this.addMessage('agent', 'I understand your request, but I need more information to help you.');
        }
        break;

      case 'ACTION':
      default:
        // Handle ACTION intents (script matching) - original behavior
        if (matched && script) {
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
          // Use custom message if provided, otherwise default
          const errorMessage = result.message || `
            I couldn't find a matching script for your command.<br><br>
            Try:<br>
            • "show available scripts" to see all scripts<br>
            • Upload more scripts in settings<br>
            • Rephrase your command
          `;
          this.addMessage('agent', errorMessage, true);
        }
        break;
    }
  }

  async fallbackScriptMatching(command, scripts) {
    // Smart fallback: detect intent type even without AI
    const lowerCommand = command.toLowerCase();

    // Detect CONVERSATIONAL intents
    if (lowerCommand.match(/^(hello|hi|hey|thanks|thank you|bye|goodbye|good morning|good evening)$/i)) {
      return {
        matched: true,
        intent_category: 'CONVERSATIONAL',
        response: this.getConversationalResponseFallback(lowerCommand)
      };
    }

    // Detect INFORMATIONAL intents (questions)
    if (lowerCommand.match(/^(what|how|why|when|where|who|which|can you explain|tell me about)/i)) {
      return {
        matched: true,
        intent_category: 'INFORMATIONAL',
        response: 'I can help answer questions! However, my AI model seems to be having trouble right now. Try asking again, or rephrase your question.'
      };
    }

    // Detect META intents
    if (lowerCommand.match(/(what can you do|help|show commands|capabilities|model status)/i)) {
      return {
        matched: true,
        intent_category: 'META',
        response: this.getMetaResponseFallback(lowerCommand)
      };
    }

    // For ACTION intents, try script matching
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
        intent_category: 'ACTION',
        script: bestMatch,
        confidence: Math.min(bestScore, 0.9),
        reasoning: 'Text matching'
      };
    }

    return {
      matched: false,
      intent_category: 'ACTION',
      message: scripts.length === 0 ? 'No scripts available. Upload scripts in the settings page.' : 'No matching script found.'
    };
  }

  getConversationalResponseFallback(command) {
    const lowerCommand = command.toLowerCase();
    if (lowerCommand.match(/^(hello|hi|hey|good morning|good evening)/i)) {
      return 'Hello! I\'m Choreograph AI. How can I help you today?';
    }
    if (lowerCommand.match(/^(thanks|thank you)/i)) {
      return 'You\'re welcome! Let me know if you need anything else.';
    }
    if (lowerCommand.match(/^(bye|goodbye)/i)) {
      return 'Goodbye! Feel free to come back anytime.';
    }
    return 'I\'m here to help!';
  }

  getMetaResponseFallback(command) {
    const lowerCommand = command.toLowerCase();
    if (lowerCommand.match(/model status/i)) {
      const status = this.modelLoaded ? 'loaded and ready' : (this.isModelLoading ? 'currently loading' : 'not loaded');
      return `AI Model Status: ${status}`;
    }
    if (lowerCommand.match(/what can you do|capabilities/i)) {
      return `I'm Choreograph AI! I can help you with:

🤖 **Browser Automation**: Navigate websites, click buttons, fill forms
📊 **Data Extraction**: Scrape data from web pages
💬 **Questions**: Answer general questions
⚙️ **Configuration**: Manage scripts and settings

Try commands like:
• "Go to amazon.com" (if you have scripts)
• "What is machine learning?"
• "Show available scripts"`;
    }
    return `**Choreograph Help**

Available commands:
• "show available scripts" - List all automation scripts
• "show available tasks" - List all workflows
• "model status" - Check AI model status
• Natural language commands for automation

Upload scripts in the settings page to create custom automations!`;
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
    console.log('📂 [Popup] getStoredScripts() called');
    try {
      console.log('📂 [Popup] Calling chrome.storage.local.get...');
      const result = await chrome.storage.local.get(['jsonScripts']);
      console.log('📂 [Popup] chrome.storage.local.get returned:', result);
      const scripts = result.jsonScripts || [];
      console.log('📂 [Popup] Returning', scripts.length, 'scripts');
      return scripts;
    } catch (error) {
      console.error('❌ [Popup] getStoredScripts error:', error);
      return [];
    }
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
