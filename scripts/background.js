// DeskAgent Background Service Worker
// AI model loading happens in config page (Web Worker support)

class DeskAgentBackground {
  constructor() {
    this.attachedTabs = new Map();
    this.nlpModel = null;
    this.isModelLoading = false;
    this.scriptExecutor = null;
    this.debuggerVersion = '1.3';
    this.keepDebuggerAttached = true; // Don't auto-detach debugger

    // AI model runs in config page (has Web Worker support)
    this.modelReadyInConfig = false;

    this.init();
  }

  async init() {
    console.log('DeskAgent Background initialized');
    console.log('💡 AI model can be loaded from Settings/Config page');

    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Listen for debugger events
    chrome.debugger.onEvent.addListener((source, method, params) => {
      this.handleDebuggerEvent(source, method, params);
    });

    // Listen for debugger detach
    chrome.debugger.onDetach.addListener((source, reason) => {
      this.handleDebuggerDetach(source, reason);
    });

    // Initialize script executor
    this.scriptExecutor = new ScriptExecutor(this);
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'EXECUTE_SCRIPT':
          await this.executeScript(message.scriptId, message.parameters);
          sendResponse({ success: true });
          break;

        case 'PROCESS_NLP_COMMAND':
          const result = await this.processNLPCommand(message.command);
          sendResponse({ success: true, result });
          break;

        case 'EXECUTE_TASK':
          await this.executeTask(message.taskId, message.parameters);
          sendResponse({ success: true });
          break;

        case 'ATTACH_DEBUGGER':
          await this.attachDebugger(message.tabId || message.url);
          sendResponse({ success: true });
          break;

        case 'DETACH_DEBUGGER':
          await this.detachDebugger(message.tabId);
          sendResponse({ success: true });
          break;

        case 'INJECT_SCRIPT':
          await this.injectScript(message.tabId, message.code);
          sendResponse({ success: true });
          break;

        case 'MODEL_READY_IN_CONFIG':
          // Config page notifies that model is loaded
          this.modelReadyInConfig = true;
          this.nlpModel = { ready: true, device: message.device };
          console.log(`✅ AI model ready in config page on ${message.device}`);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Tab finder and debugger attachment
  async attachDebugger(tabIdOrUrl) {
    let tabId;

    if (typeof tabIdOrUrl === 'number') {
      console.log(`📍 Using provided tab ID: ${tabIdOrUrl}`);
      tabId = tabIdOrUrl;
    } else {
      console.log(`🔍 Searching for tab with URL: ${tabIdOrUrl}`);
      // Find tab by URL
      tabId = await this.findTabByUrl(tabIdOrUrl);

      if (!tabId) {
        console.log(`❌ Tab not found, creating new tab and navigating to: ${tabIdOrUrl}`);
        // Navigate to URL in new tab
        const tab = await chrome.tabs.create({ url: tabIdOrUrl });
        tabId = tab.id;
        console.log(`✨ Created new tab ${tabId}, waiting for page to load...`);

        // Wait for page to load
        await this.waitForTabLoad(tabId);
        console.log(`✅ Page loaded in tab ${tabId}`);
      } else {
        console.log(`✅ Found existing tab ${tabId}`);
      }
    }

    // Attach debugger
    try {
      // Check if already attached
      if (this.attachedTabs.has(tabId)) {
        console.log(`Debugger already attached to tab ${tabId}, reusing connection`);
        return tabId;
      }

      await chrome.debugger.attach({ tabId }, this.debuggerVersion);

      // Get tab info for better logging
      const tab = await chrome.tabs.get(tabId);
      this.attachedTabs.set(tabId, { attached: true, timestamp: Date.now() });
      console.log(`✅ Debugger attached to tab ${tabId}`);
      console.log(`   📄 Tab: "${tab.title}"`);
      console.log(`   🔗 URL: ${tab.url}`);

      // Small delay to let debugger fully attach
      await new Promise(resolve => setTimeout(resolve, 100));

      // Enable necessary domains - we don't actually need these for basic automation
      // Commenting out to avoid the hanging issue
      // console.log('Enabling Runtime domain...');
      // await this.sendDebuggerCommand(tabId, 'Runtime.enable');
      // console.log('Enabling Page domain...');
      // await this.sendDebuggerCommand(tabId, 'Page.enable');
      // console.log('Enabling DOM domain...');
      // await this.sendDebuggerCommand(tabId, 'DOM.enable');
      console.log('Debugger ready, returning tabId:', tabId);

      return tabId;
    } catch (error) {
      console.error('Error attaching debugger:', error);
      this.attachedTabs.delete(tabId);
      throw error;
    }
  }

  async detachDebugger(tabId) {
    try {
      await chrome.debugger.detach({ tabId });
      this.attachedTabs.delete(tabId);
      console.log(`Debugger detached from tab ${tabId}`);
    } catch (error) {
      console.error('Error detaching debugger:', error);
    }
  }

  async findTabByUrl(urlPattern) {
    const tabs = await chrome.tabs.query({});
    console.log(`   Scanning ${tabs.length} open tabs...`);

    for (const tab of tabs) {
      if (tab.url && (tab.url.includes(urlPattern) || tab.url === urlPattern)) {
        console.log(`   ✓ Match found: "${tab.title}" (${tab.url})`);
        console.log(`   📊 Tab status: ${tab.status}`);

        // If tab is not fully loaded, wait for it
        if (tab.status !== 'complete') {
          console.log(`   ⏳ Tab not fully loaded, waiting...`);
          await this.waitForTabLoad(tab.id);
          console.log(`   ✅ Tab now fully loaded`);
        }

        return tab.id;
      }
    }

    console.log(`   ✗ No matching tab found for: ${urlPattern}`);
    return null;
  }

  async waitForTabLoad(tabId, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkStatus = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (tab.status === 'complete') {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Tab load timeout'));
          } else {
            setTimeout(checkStatus, 100);
          }
        });
      };

      checkStatus();
    });
  }

  // Debugger command wrapper
  async sendDebuggerCommand(tabId, method, params = {}) {
    try {
      console.log(`Sending debugger command: ${method} to tab ${tabId}`);
      const result = await chrome.debugger.sendCommand({ tabId }, method, params);
      console.log(`Command ${method} succeeded`);
      return result;
    } catch (error) {
      console.error(`Debugger command failed: ${method}`, error);
      throw error;
    }
  }

  // Script injection
  async injectScript(tabId, code) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (scriptCode) => {
          eval(scriptCode);
        },
        args: [code]
      });
    } catch (error) {
      console.error('Error injecting script:', error);
      throw error;
    }
  }

  // Script execution
  async executeScript(scriptId, parameters = {}) {
    try {
      const scripts = await this.getStoredScripts();
      const script = scripts.find(s => s.id === scriptId);

      if (!script) {
        throw new Error(`Script not found: ${scriptId}`);
      }

      await this.scriptExecutor.execute(script, parameters);
    } catch (error) {
      console.error('Error executing script:', error);
      throw error;
    }
  }

  // Task execution - runs multiple scripts in sequence with data passing
  async executeTask(taskId, initialParameters = {}) {
    try {
      console.log(`🎯 Starting task execution: ${taskId}`);

      // Load task
      const tasks = await this.getStoredTasks();
      const task = tasks.find(t => t.id === taskId);

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (!task.steps || task.steps.length === 0) {
        throw new Error(`Task has no steps: ${task.title}`);
      }

      console.log(`📋 Task: ${task.title}`);
      console.log(`📊 Steps: ${task.steps.length}`);

      // Initialize payload with initial parameters
      let payload = { ...initialParameters };

      // Load all scripts upfront
      const scripts = await this.getStoredScripts();

      // Execute each step in sequence
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        console.log(`\n▶️  Step ${i + 1}/${task.steps.length}`);

        // Find the script for this step
        const script = scripts.find(s => s.id === step.scriptId);
        if (!script) {
          console.error(`❌ Script not found for step: ${step.scriptId}`);
          throw new Error(`Script not found for step ${i + 1}`);
        }

        console.log(`   📄 Script: ${script.name}`);

        // Check condition if present
        if (step.condition) {
          const conditionMet = await this.evaluateCondition(step.condition, payload);
          console.log(`   🔍 Condition: ${conditionMet ? 'PASS' : 'FAIL'}`);

          if (!conditionMet) {
            const action = step.condition.onFalse || 'skip';
            console.log(`   ⏭️  Action: ${action}`);

            if (action === 'stop') {
              console.log('🛑 Task stopped due to condition');
              break;
            } else if (action === 'skip') {
              console.log('⏩ Step skipped due to condition');
              continue;
            }
            // 'continue' - just proceed without executing
            continue;
          }
        }

        // Execute with or without loop
        if (step.loop) {
          payload = await this.executeStepWithLoop(script, step, payload);
        } else {
          payload = await this.executeStepOnce(script, step, payload);
        }

        console.log(`   ✅ Step completed`);
      }

      console.log(`\n✅ Task completed: ${task.title}`);
      return payload;

    } catch (error) {
      console.error('❌ Error executing task:', error);
      throw error;
    }
  }

  async executeStepOnce(script, step, inputPayload) {
    // Map data from input payload to step parameters
    const parameters = this.mapData(step.dataMapping, inputPayload, step.parameters);

    console.log(`   📥 Parameters:`, parameters);

    // Execute the script
    await this.scriptExecutor.execute(script, parameters);

    // For now, return the input payload merged with the parameters
    // In future, we could capture actual script output
    const outputPayload = {
      ...inputPayload,
      lastStep: {
        scriptId: script.id,
        scriptName: script.name,
        parameters: parameters,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`   📤 Output payload updated`);

    return outputPayload;
  }

  async executeStepWithLoop(script, step, inputPayload) {
    const loopConfig = step.loop;
    console.log(`   🔁 Loop type: ${loopConfig.type}`);

    let outputPayload = { ...inputPayload };
    let iterations = 0;
    const maxIterations = loopConfig.maxIterations || 100;

    if (loopConfig.type === 'forEach') {
      // Extract array from payload using data source path
      const dataArray = this.getNestedValue(inputPayload, loopConfig.dataSource);

      if (!Array.isArray(dataArray)) {
        console.warn(`   ⚠️  Data source is not an array: ${loopConfig.dataSource}`);
        return outputPayload;
      }

      console.log(`   📊 Iterating over ${dataArray.length} items`);

      for (const item of dataArray) {
        if (iterations >= maxIterations) {
          console.warn(`   ⚠️  Max iterations reached: ${maxIterations}`);
          break;
        }

        // Create payload with current item
        const itemPayload = {
          ...inputPayload,
          loopItem: item,
          loopIndex: iterations
        };

        outputPayload = await this.executeStepOnce(script, step, itemPayload);
        iterations++;
      }

    } else if (loopConfig.type === 'while') {
      console.log(`   🔄 While loop with condition`);

      while (iterations < maxIterations) {
        // Evaluate loop condition
        const conditionMet = await this.evaluateCondition(
          { expression: loopConfig.condition },
          outputPayload
        );

        if (!conditionMet) {
          console.log(`   🛑 Loop condition false, exiting`);
          break;
        }

        outputPayload = await this.executeStepOnce(script, step, outputPayload);
        iterations++;
      }

    } else if (loopConfig.type === 'fixed') {
      const count = parseInt(loopConfig.dataSource) || 1;
      console.log(`   🔢 Fixed loop: ${count} iterations`);

      for (let i = 0; i < count && i < maxIterations; i++) {
        const itemPayload = {
          ...outputPayload,
          loopIndex: i
        };

        outputPayload = await this.executeStepOnce(script, step, itemPayload);
        iterations++;
      }
    }

    console.log(`   ✅ Loop completed: ${iterations} iterations`);

    return outputPayload;
  }

  // Evaluate condition expression
  async evaluateCondition(condition, payload) {
    try {
      if (!condition || !condition.expression) {
        return true; // No condition means always execute
      }

      // Simple expression evaluation
      // For safety, we only support basic comparisons
      const expression = condition.expression;

      // Replace $.path references with actual values
      const evaluatedExpression = expression.replace(/\$\.[\w.]+/g, (match) => {
        const path = match.substring(2); // Remove $. prefix
        const value = this.getNestedValue(payload, path);
        return JSON.stringify(value);
      });

      console.log(`   🔍 Evaluating: ${evaluatedExpression}`);

      // Use Function constructor for safe evaluation (no access to scope)
      const result = new Function('return ' + evaluatedExpression)();

      return Boolean(result);

    } catch (error) {
      console.error('   ❌ Condition evaluation error:', error);
      return false;
    }
  }

  // Map data from source payload to target parameters
  mapData(dataMapping, sourcePayload, defaultParameters) {
    const result = { ...defaultParameters };

    if (!dataMapping || Object.keys(dataMapping).length === 0) {
      return result;
    }

    // dataMapping format: { "targetParam": "$.source.path" }
    for (const [targetKey, sourcePath] of Object.entries(dataMapping)) {
      if (sourcePath.startsWith('$.')) {
        // Extract value from payload using path
        const path = sourcePath.substring(2);
        const value = this.getNestedValue(sourcePayload, path);

        if (value !== undefined) {
          result[targetKey] = value;
        }
      }
    }

    return result;
  }

  // Get nested value from object using dot notation path
  getNestedValue(obj, path) {
    if (!path) return obj;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  async getStoredScripts() {
    const result = await chrome.storage.local.get(['jsonScripts']);
    return result.jsonScripts || [];
  }

  async getStoredTasks() {
    const result = await chrome.storage.local.get(['tasks']);
    return result.tasks || [];
  }

  async processNLPCommand(command, options = {}) {
    const scripts = await this.getStoredScripts();

    if (scripts.length === 0) {
      return { matched: false, message: 'No scripts available' };
    }

    console.log('🤖 Processing command:', command);

    // Try to use AI model in config page
    if (this.modelReadyInConfig) {
      try {
        console.log('📤 Routing NLP processing to config page...');

        // Send command to config page for processing
        const response = await chrome.runtime.sendMessage({
          type: 'PROCESS_COMMAND_IN_CONFIG',
          command,
          scripts,
          options
        });

        if (response && response.success) {
          console.log('✅ NLP processing successful via config page');
          return response.result;
        } else {
          throw new Error(response?.error || 'Config page processing failed');
        }
      } catch (error) {
        console.warn('⚠️ Config page AI processing failed:', error.message);
        console.warn('⚠️ Falling back to text matching');
        return this.fallbackScriptMatching(command, scripts);
      }
    } else {
      console.warn('⚠️ AI model not loaded. Please open Settings page and click "Load NLP Model"');
      console.warn('⚠️ Using fallback text matching');
      return this.fallbackScriptMatching(command, scripts);
    }
  }

  // Extract parameters from natural language command
  extractParameters(command, script) {
    const parameters = {};

    // If script has parameters defined, try to extract values from command
    if (script.parameters) {
      for (const [paramName, defaultValue] of Object.entries(script.parameters)) {
        // Look for quoted strings in command
        const quotedMatch = command.match(/"([^"]+)"|'([^']+)'/);
        if (quotedMatch) {
          parameters[paramName] = quotedMatch[1] || quotedMatch[2];
        }
        // Look for words after "for" or "with"
        else {
          const forMatch = command.match(/(?:for|with|to|named?)\s+(\w+)/i);
          if (forMatch) {
            parameters[paramName] = forMatch[1];
          }
        }
      }
    }

    return parameters;
  }

  // Fallback method using simple text similarity
  fallbackScriptMatching(command, scripts) {
    console.log('⚠️ Using fallback text matching');

    if (scripts.length === 0) {
      return { matched: false, message: 'No scripts available' };
    }

    const commandLower = command.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const script of scripts) {
      if (!script.title && !script.description) continue;

      const scriptText = `${script.title || ''} ${script.description || ''}`.toLowerCase();

      // Simple word matching score
      const commandWords = commandLower.split(/\s+/);
      const matches = commandWords.filter(word => scriptText.includes(word)).length;
      const score = matches / commandWords.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = script;
      }
    }

    if (bestScore > 0.3) {
      return {
        matched: true,
        script: bestMatch,
        confidence: bestScore,
        parameters: {}
      };
    }

    return {
      matched: false,
      message: 'No matching script found',
      bestScore
    };
  }

  handleDebuggerEvent(source, method, params) {
    console.log('Debugger event:', method, params);

    // Broadcast to interested listeners
    chrome.runtime.sendMessage({
      type: 'DEBUGGER_EVENT',
      tabId: source.tabId,
      method,
      params
    }).catch(() => {
      // Ignore errors if no listeners
    });
  }

  handleDebuggerDetach(source, reason) {
    const tabId = source.tabId;
    console.log(`⚠️ Debugger detached from tab ${tabId}, reason: ${reason}`);

    // If debugger was detached during script execution and we want to keep it attached, reattach
    if (this.keepDebuggerAttached && this.scriptExecutor?.currentExecution?.tabId === tabId) {
      console.log(`🔄 Attempting to reattach debugger to tab ${tabId}...`);

      // Reattach after a short delay
      setTimeout(async () => {
        try {
          await chrome.debugger.attach({ tabId }, this.debuggerVersion);
          this.attachedTabs.set(tabId, true);
          console.log(`✅ Debugger reattached to tab ${tabId}`);
        } catch (error) {
          console.error(`❌ Failed to reattach debugger to tab ${tabId}:`, error);
          this.attachedTabs.delete(tabId);
        }
      }, 100);
    } else {
      this.attachedTabs.delete(tabId);
    }
  }
}

// Script Executor - Handles JSON automation scripts
class ScriptExecutor {
  constructor(background) {
    this.background = background;
    this.currentExecution = null;
    this.variables = {};
    this.lastFocusedSelector = null;
  }

  async execute(script, parameters = {}) {
    console.log('Executing script:', script.title);
    console.log('Script steps:', script.steps);

    // Merge script's default parameters with provided parameters (provided takes precedence)
    const defaultParams = script.parameters || {};
    this.variables = { ...defaultParams, ...parameters };

    if (Object.keys(this.variables).length > 0) {
      console.log('📝 Script variables:', this.variables);
    }

    this.currentExecution = {
      script,
      currentStep: 0,
      startTime: Date.now()
    };

    try {
      // Attach debugger to target
      const tabId = await this.background.attachDebugger(script.targetUrl || parameters.targetUrl);
      this.currentExecution.tabId = tabId;

      console.log('Starting to execute steps, tabId:', tabId, 'steps count:', script.steps?.length);

      // Execute steps
      await this.executeSteps(script.steps, tabId);

      console.log('✅ Script execution completed successfully');

      // Keep debugger attached unless explicitly configured to detach
      const shouldDetach = parameters.detachDebugger === true;
      if (shouldDetach) {
        console.log('🔌 Detaching debugger as requested...');
        await this.background.detachDebugger(tabId);
      } else {
        console.log('🔗 Keeping debugger attached for further interaction');
      }

      return { success: true, tabId };
    } catch (error) {
      console.error('❌ Script execution failed:', error);
      throw error;
    } finally {
      // Clear current execution reference after a delay (to allow reattachment if needed)
      setTimeout(() => {
        if (this.currentExecution?.script === script) {
          this.currentExecution = null;
        }
      }, 5000);
    }
  }

  async executeSteps(steps, tabId, loopContext = null) {
    console.log('executeSteps called with:', steps?.length, 'steps for tabId:', tabId);

    if (!steps || steps.length === 0) {
      console.warn('No steps to execute!');
      return;
    }

    // Get debug delay settings from storage
    const settings = await chrome.storage.local.get(['settings']);
    console.log('📦 Loaded settings from storage:', settings);

    const debugDelayEnabled = settings.settings?.debugDelayEnabled || false;
    const debugDelaySeconds = settings.settings?.debugDelaySeconds || 5;
    const debugDelayMs = debugDelaySeconds * 1000;

    console.log('🐛 Debug settings:', {
      enabled: debugDelayEnabled,
      seconds: debugDelaySeconds,
      milliseconds: debugDelayMs
    });

    if (debugDelayEnabled) {
      console.log(`🐛 DEBUG MODE ACTIVE: ${debugDelaySeconds}s delay between steps`);
    } else {
      console.log('⚡ Debug mode disabled - running at full speed');
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.currentExecution.currentStep = i;
      console.log(`\n▶️ Step ${i + 1}/${steps.length}: ${step.type}`);

      // Handle conditional branching
      if (step.condition) {
        const conditionMet = await this.evaluateCondition(step.condition, tabId);
        if (!conditionMet) {
          console.log(`⏭️ Skipping step ${i} - condition not met`);
          continue;
        }
      }

      // Execute step
      console.log(`🔧 Executing: ${step.type}`);
      await this.executeStep(step, tabId, loopContext);
      console.log(`✅ Completed: ${step.type}`);

      // Debug delay AFTER step execution (so you can see what happened)
      if (debugDelayEnabled) {
        console.log(`⏸️ 🐛 DEBUG DELAY: Pausing ${debugDelaySeconds}s after step ${i + 1} (${step.type})...`);
        const startWait = Date.now();
        await this.wait(debugDelayMs);
        const endWait = Date.now();
        const actualDelay = ((endWait - startWait) / 1000).toFixed(1);
        console.log(`✅ Debug pause complete (${actualDelay}s elapsed)`);
      }

      // Handle wait after step (in addition to debug delay)
      if (step.waitAfter) {
        console.log(`⏸️ Step delay: waiting ${step.waitAfter}ms...`);
        await this.wait(step.waitAfter);
      }

      // Handle loop
      if (step.loop) {
        await this.executeLoop(step, tabId);
      }
    }
    console.log('\n🎉 All steps completed');
  }

  async executeStep(step, tabId, loopContext) {
    console.log(`Executing step: ${step.type}`, step);

    // Substitute variables in step before execution
    const processedStep = this.substituteVariables(step);

    switch (processedStep.type) {
      case 'setViewport':
        await this.setViewport(processedStep, tabId);
        break;

      case 'navigate':
        await this.navigate(processedStep, tabId);
        break;

      case 'click':
        await this.click(processedStep, tabId);
        break;

      case 'doubleClick':
        await this.doubleClick(processedStep, tabId);
        break;

      case 'keyDown':
      case 'keyUp':
        await this.keyAction(processedStep, tabId);
        break;

      case 'change':
        await this.changeInput(processedStep, tabId);
        break;

      case 'scroll':
        await this.scroll(processedStep, tabId);
        break;

      case 'waitForElement':
        await this.waitForElement(processedStep, tabId);
        break;

      case 'waitForExpression':
        await this.waitForExpression(processedStep, tabId);
        break;

      case 'waitAfter':
        await this.wait(processedStep.duration || 1000);
        break;

      case 'FIND_ELEMENT':
        await this.findElement(processedStep, tabId);
        break;

      case 'GOTO_ELEMENT':
        await this.gotoElement(processedStep, tabId);
        break;

      case 'executeScript':
        await this.executeScript(processedStep, tabId);
        break;

      case 'childSteps':
        await this.executeSteps(processedStep.steps, tabId, loopContext);
        break;

      default:
        console.warn(`Unknown step type: ${processedStep.type}`);
    }
  }

  // Substitute variables in step properties
  substituteVariables(step) {
    if (!step || typeof step !== 'object') {
      return step;
    }

    const processed = Array.isArray(step) ? [] : {};

    for (const [key, value] of Object.entries(step)) {
      if (typeof value === 'string') {
        // Replace variables in format {{variableName}}
        processed[key] = value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          if (varName in this.variables) {
            console.log(`   🔄 Substituting {{${varName}}} with "${this.variables[varName]}"`);
            return this.variables[varName];
          }
          console.warn(`   ⚠️ Variable {{${varName}}} not found in parameters`);
          return match; // Keep original if variable not found
        });
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects and arrays
        processed[key] = this.substituteVariables(value);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  async setViewport(step, tabId) {
    await this.background.sendDebuggerCommand(tabId, 'Emulation.setDeviceMetricsOverride', {
      width: step.width,
      height: step.height,
      deviceScaleFactor: step.deviceScaleFactor || 1,
      mobile: step.isMobile || false
    });
  }

  async navigate(step, tabId) {
    console.log(`🌐 Navigating to: ${step.url}`);

    // Use chrome.tabs.update for navigation (more reliable than debugger protocol)
    await chrome.tabs.update(tabId, { url: step.url });

    // Wait for navigation to complete using tab status
    console.log(`⏳ Waiting for page to load...`);
    await this.background.waitForTabLoad(tabId);
    console.log(`✅ Navigation complete`);
  }

  async waitForNavigation(tabId, timeout = 30000) {
    // This method is kept for compatibility but won't be used
    // We use chrome.tabs status checking instead
    return this.background.waitForTabLoad(tabId, timeout);
  }

  async click(step, tabId) {
    const element = await this.getElement(step.selectors, tabId);

    if (!element) {
      throw new Error('Element not found for click action');
    }

    const selector = element.selector;
    if (!selector) {
      throw new Error('No selector available for click action');
    }

    // Log element details for debugging
    const tagName = element.info?.tagName || 'unknown';
    const isLink = tagName.toLowerCase() === 'a';
    const isButton = tagName.toLowerCase() === 'button';

    console.log(`   🎯 Target: <${tagName}> using selector: ${selector}`);

    if (!isLink && !isButton) {
      console.warn(`   ⚠️ Clicking on <${tagName}> which may not be clickable. Expected <a> or <button>.`);
    }

    // Check if we should use CDP click (for apps that check isTrusted)
    const forceDebuggerClick = selector.includes('role="row"') ||
                                selector.includes('role=\'row\'') ||
                                selector.includes('role="gridcell"') ||
                                selector.includes('role=\'gridcell\'') ||
                                selector.includes('#pane-side');

    if (forceDebuggerClick) {
      console.log(`   🎯 Using CDP trusted click for WhatsApp element`);
      await this.clickViaDebugger(step, tabId, selector);
      return;
    }

    // Use content script for real DOM click (more reliable for anti-automation)
    console.log(`   📨 Sending CLICK_ELEMENT message to content script...`);
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'CLICK_ELEMENT',
        selector: selector,
        options: {
          offsetX: step.offsetX,
          offsetY: step.offsetY
        }
      });

      if (response && response.success) {
        if (response.result.usedAncestor) {
          console.log(`   ✓ DOM click successful on <${response.result.tagName}> (clickable ancestor of <${response.result.originalTag}>)`);
        } else {
          console.log(`   ✓ DOM click successful on <${response.result.tagName}>`);
        }
        if (response.result.href) {
          console.log(`   🔗 Link: ${response.result.href}`);
        }
        return;
      } else {
        console.warn(`   ⚠️ Content script click failed, falling back to debugger API`);
        await this.clickViaDebugger(step, tabId, selector);
      }
    } catch (error) {
      console.warn(`   ⚠️ Content script not available, using debugger API:`, error.message);
      await this.clickViaDebugger(step, tabId, selector);
    }
  }

  async clickViaDebugger(step, tabId, selector) {
    try {
      // Use DOM API to get element position (more accurate than Runtime.evaluate)
      const doc = await this.background.sendDebuggerCommand(tabId, 'DOM.getDocument');

      // Query for the element
      const element = await this.background.sendDebuggerCommand(tabId, 'DOM.querySelector', {
        nodeId: doc.root.nodeId,
        selector: selector
      });

      if (!element.nodeId) {
        throw new Error(`Element not found: ${selector}`);
      }

      // Get element's box model for precise positioning
      const boxModel = await this.background.sendDebuggerCommand(tabId, 'DOM.getBoxModel', {
        nodeId: element.nodeId
      });

      // Calculate center point from content quad
      const quad = boxModel.model.content;
      const minX = Math.min(quad[0], quad[2], quad[4], quad[6]);
      const minY = Math.min(quad[1], quad[3], quad[5], quad[7]);
      const width = Math.max(quad[0], quad[2], quad[4], quad[6]) - minX;
      const height = Math.max(quad[1], quad[3], quad[5], quad[7]) - minY;

      // Calculate click coordinates (center of element by default)
      const x = step.offsetX !== undefined ? minX + step.offsetX : minX + width / 2;
      const y = step.offsetY !== undefined ? minY + step.offsetY : minY + height / 2;

      console.log(`   🎯 CDP click using DOM.getBoxModel at (${Math.round(x)}, ${Math.round(y)})`);

      // Perform click using Input.dispatchMouseEvent (generates trusted events)
      await this.background.sendDebuggerCommand(tabId, 'Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: x,
        y: y,
        button: step.button || 'left',
        clickCount: 1
      });

      await this.wait(10);

      await this.background.sendDebuggerCommand(tabId, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: x,
        y: y,
        button: step.button || 'left',
        clickCount: 1
      });

      console.log(`   ✓ CDP click complete at (${Math.round(x)}, ${Math.round(y)})`);
    } catch (error) {
      console.error(`   ❌ CDP click failed:`, error.message);
      throw error;
    }
  }

  async doubleClick(step, tabId) {
    await this.click(step, tabId);
    await this.wait(100);
    await this.click(step, tabId);
  }

  async keyAction(step, tabId) {
    if (!step || !step.key) {
      throw new Error('Key action requires a "key" property');
    }

    // Get the element selector for the key action
    let selector = null;

    if (step.selectors && step.selectors.length) {
      const element = await this.getElement(step.selectors, tabId);
      if (element && element.selector) {
        selector = element.selector;
        console.log(`   ⌨️ Pressing ${step.key} on element: ${selector}`);
      }
    } else if (this.lastFocusedSelector) {
      selector = this.lastFocusedSelector;
      console.log(`   ⌨️ Pressing ${step.key} on last focused element: ${selector}`);
    }

    // Use content script to press key via DOM events (more reliable than debugger API)
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'PRESS_KEY',
        selector: selector,
        key: step.key
      });

      if (response && response.success) {
        console.log(`   ✓ Key press successful: ${step.key}`);
      } else {
        console.warn(`   ⚠️ Key press via content script failed, falling back to debugger API`);
        await this.keyActionViaDebugger(step, tabId);
      }
    } catch (error) {
      console.warn(`   ⚠️ Content script not available, using debugger API:`, error.message);
      await this.keyActionViaDebugger(step, tabId);
    }
  }

  async keyActionViaDebugger(step, tabId) {
    const type = step.type === 'keyUp' ? 'keyUp' : 'keyDown';
    await this.ensureFocusForKeyAction(step, tabId);

    const descriptor = this.buildKeyDescriptor(step);
    const modifiers = this.getModifierMask(step);
    const autoRepeat = step.autoRepeat || false;

    const basePayload = {
      key: descriptor.key,
      code: descriptor.code,
      keyCode: descriptor.keyCode,
      windowsVirtualKeyCode: descriptor.keyCode,
      nativeVirtualKeyCode: descriptor.keyCode,
      text: '',
      unmodifiedText: '',
      autoRepeat,
      isKeypad: step.isKeypad || false,
      location: step.location || 0,
      modifiers
    };

    if (type === 'keyDown') {
      const keyDownPayload = {
        ...basePayload,
        type: 'keyDown',
        text: descriptor.textProducesCharacter ? descriptor.text : '',
        unmodifiedText: descriptor.textProducesCharacter ? descriptor.unmodifiedText : ''
      };
      await this.background.sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', keyDownPayload);

      if (descriptor.textProducesCharacter && step.sendCharEvent !== false) {
        const charPayload = {
          ...basePayload,
          type: 'char',
          text: descriptor.text,
          unmodifiedText: descriptor.unmodifiedText || descriptor.text
        };
        await this.background.sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', charPayload);
      }

      if (step.autoKeyUp !== false) {
        await this.wait(step.keyUpDelay ?? 30);
        const keyUpPayload = {
          ...basePayload,
          type: 'keyUp'
        };
        await this.background.sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', keyUpPayload);
      }
    } else {
      const keyUpPayload = {
        ...basePayload,
        type: 'keyUp'
      };
      await this.background.sendDebuggerCommand(tabId, 'Input.dispatchKeyEvent', keyUpPayload);
    }
  }

  async ensureFocusForKeyAction(step, tabId) {
    // Prefer selectors supplied on the step
    if (step && step.selectors && step.selectors.length) {
      console.log(`   🎯 Focusing element for key action using step selectors`);
      const element = await this.getElement(step.selectors, tabId);
      if (element && element.selector) {
        const focused = await this.focusElementBySelector(tabId, element.selector);
        if (focused) {
          console.log(`   ✓ Focused element: ${element.selector}`);
          this.lastFocusedSelector = element.selector;
          return;
        }
      }
    }

    if (step && step.focusSelector) {
      console.log(`   🎯 Focusing element using focusSelector: ${step.focusSelector}`);
      const focused = await this.focusElementBySelector(tabId, step.focusSelector);
      if (focused) {
        console.log(`   ✓ Focused element: ${step.focusSelector}`);
        this.lastFocusedSelector = step.focusSelector;
        return;
      }
    }

    if (this.lastFocusedSelector) {
      console.log(`   🎯 Re-focusing last element: ${this.lastFocusedSelector}`);
      const focused = await this.focusElementBySelector(tabId, this.lastFocusedSelector);
      if (focused) {
        console.log(`   ✓ Re-focused last element`);
        return;
      }
      this.lastFocusedSelector = null;
    }

    await this.focusAnyFocusableElement(tabId);
  }

  async focusElementBySelector(tabId, selector) {
    if (!selector) {
      return false;
    }

    const safeSelector = this.escapeSelectorForEval(selector);
    const script = this.buildFocusScript(safeSelector);
    const result = await this.background.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
      expression: script,
      returnByValue: true
    });

    return !!(result && result.result && result.result.value);
  }

  buildFocusScript(selector) {
    return `
      (function() {
        var target = document.querySelector('${selector}');
        if (!target || typeof target.focus !== 'function') {
          return false;
        }

        var active = document.activeElement;
        if (active && active !== document.body && active !== target && typeof active.blur === 'function') {
          try { active.blur(); } catch (err) {}
        }

        if (typeof target.click === 'function') {
          try { target.click(); } catch (err) {}
        }

        try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }

        if (target.tagName && target.tagName.toLowerCase() === 'input' && typeof target.select === 'function') {
          try { target.select(); } catch (err) {}
        }

        return document.activeElement === target;
      })()
    `;
  }

  async focusAnyFocusableElement(tabId) {
    const script = this.buildFallbackFocusScript();
    const result = await this.background.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
      expression: script,
      returnByValue: true
    });

    return !!(result && result.result && result.result.value);
  }

  buildFallbackFocusScript() {
    return `
      (function() {
        var active = document.activeElement;
        if (active && active !== document.body && typeof active.focus === 'function') {
          return true;
        }

        var candidate = document.querySelector('input, textarea, [contenteditable="true"], [tabindex]');
        if (!candidate || typeof candidate.focus !== 'function') {
          return false;
        }

        if (active && active !== document.body && active !== candidate && typeof active.blur === 'function') {
          try { active.blur(); } catch (err) {}
        }

        if (typeof candidate.click === 'function') {
          try { candidate.click(); } catch (err) {}
        }

        try { candidate.focus({ preventScroll: true }); } catch (err) { candidate.focus(); }

        if (candidate.tagName && candidate.tagName.toLowerCase() === 'input' && typeof candidate.select === 'function') {
          try { candidate.select(); } catch (err) {}
        }

        return document.activeElement === candidate;
      })()
    `;
  }

  buildKeyDescriptor(step) {
    const key = step.key;
    const overrides = step.keyDescriptor || {};

    const specialKeys = {
      Enter: { key: 'Enter', code: 'Enter', keyCode: 13, textProducesCharacter: false },
      Tab: { key: 'Tab', code: 'Tab', keyCode: 9, textProducesCharacter: false },
      Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8, textProducesCharacter: false },
      Delete: { key: 'Delete', code: 'Delete', keyCode: 46, textProducesCharacter: false },
      Escape: { key: 'Escape', code: 'Escape', keyCode: 27, textProducesCharacter: false },
      ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, textProducesCharacter: false },
      ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, textProducesCharacter: false },
      ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, textProducesCharacter: false },
      ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, textProducesCharacter: false },
      Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ', unmodifiedText: ' ', textProducesCharacter: true }
    };

    const base = specialKeys[key] || this.buildCharacterKeyDescriptor(key);

    return {
      key: overrides.key || step.key || base.key,
      code: overrides.code || step.code || base.code,
      keyCode: overrides.keyCode || step.keyCode || base.keyCode,
      text: overrides.text !== undefined ? overrides.text : (step.text !== undefined ? step.text : (base.text || '')),
      unmodifiedText: overrides.unmodifiedText !== undefined
        ? overrides.unmodifiedText
        : (step.unmodifiedText !== undefined ? step.unmodifiedText : (base.unmodifiedText || base.text || '')),
      textProducesCharacter: overrides.textProducesCharacter !== undefined ? overrides.textProducesCharacter : this.isTextProducingKey(step, base)
    };
  }

  buildCharacterKeyDescriptor(key) {
    if (typeof key !== 'string' || key.length === 0) {
      return { key: 'Unidentified', code: 'Unidentified', keyCode: 0, text: '', unmodifiedText: '' };
    }

    if (key.length === 1) {
      const charCode = key.toUpperCase().charCodeAt(0);
      return {
        key,
        code: /^\d$/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}`,
        keyCode: charCode,
        text: key,
        unmodifiedText: key
      };
    }

    return { key, code: key, keyCode: 0, text: '', unmodifiedText: '' };
  }

  isTextProducingKey(step, baseDescriptor) {
    if (step.textProducesCharacter !== undefined) {
      return !!step.textProducesCharacter;
    }

    if (!baseDescriptor || !baseDescriptor.text) {
      return false;
    }

    if (baseDescriptor.text.length === 0) {
      return false;
    }

    // Keys like Enter produce \r but should not emit char events
    if (baseDescriptor.text === '\\r' || baseDescriptor.text === '\\n') {
      return false;
    }

    return baseDescriptor.text.length === 1;
  }

  getModifierMask(stepOrModifiers) {
    const modifierMap = {
      alt: 1,
      altKey: 1,
      control: 2,
      ctrl: 2,
      ctrlKey: 2,
      meta: 4,
      metaKey: 4,
      command: 4,
      cmd: 4,
      shift: 8,
      shiftKey: 8
    };

    const modifiers = Array.isArray(stepOrModifiers)
      ? stepOrModifiers
      : (stepOrModifiers?.modifiers || this.extractBooleanModifiers(stepOrModifiers));

    if (!modifiers || modifiers.length === 0) {
      return 0;
    }

    return modifiers.reduce((mask, mod) => {
      if (!mod) return mask;
      const normalized = typeof mod === 'string' ? mod.trim() : '';
      const lower = normalized.toLowerCase();
      const value = modifierMap[lower];
      return value ? mask | value : mask;
    }, 0);
  }

  extractBooleanModifiers(step) {
    if (!step || typeof step !== 'object') {
      return [];
    }

    const result = [];
    if (step.altKey) result.push('alt');
    if (step.ctrlKey || step.controlKey) result.push('ctrl');
    if (step.metaKey || step.commandKey) result.push('meta');
    if (step.shiftKey) result.push('shift');
    return result;
  }

  async changeInput(step, tabId) {
    const element = await this.getElement(step.selectors, tabId);

    if (!element) {
      throw new Error('Element not found for change action');
    }

    const selector = element.selector;
    if (!selector) {
      throw new Error('No selector available for change action');
    }

    const text = step.value ?? '';
    console.log(`   ⌨️ Typing "${text}" into element: ${selector}`);

    // Use content script for real DOM typing (bypasses anti-automation like WhatsApp)
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'TYPE_TEXT',
        selector: selector,
        text: text
      });

      if (response && response.success) {
        console.log(`   ✓ DOM typing successful (${response.result.elementType})`);
        this.lastFocusedSelector = selector;
        return;
      } else {
        console.warn(`   ⚠️ Content script typing failed, falling back to debugger API`);
        await this.changeInputViaDebugger(step, tabId, selector);
      }
    } catch (error) {
      console.warn(`   ⚠️ Content script not available, using debugger API:`, error.message);
      await this.changeInputViaDebugger(step, tabId, selector);
    }
  }

  async changeInputViaDebugger(step, tabId, selector) {
    const safeSelector = this.escapeSelectorForEval(selector);
    const valueExpression = JSON.stringify(step.value ?? '');

    await this.background.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
      expression: `(function() {
        const el = document.querySelector('${safeSelector}');
        if (el) {
          const active = document.activeElement;
          if (active && active !== document.body && active !== el && typeof active.blur === 'function') {
            try { active.blur(); } catch (err) {}
          }
          if (typeof el.click === 'function') {
            try { el.click(); } catch (err) {}
          }
          try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }

          // Handle both regular inputs and contenteditable divs
          const isContentEditable = el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true';
          const tagName = el.tagName.toLowerCase();

          if (isContentEditable || tagName === 'div' || tagName === 'p' || tagName === 'span') {
            el.textContent = ${valueExpression};
            el.innerText = ${valueExpression};
          } else {
            el.value = ${valueExpression};
          }

          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      })()`
    });

    console.log(`   ⌨️ Debugger API: Changed input value using selector: ${selector}`);

    const focusConfirmed = await this.focusElementBySelector(tabId, selector);
    if (focusConfirmed) {
      this.lastFocusedSelector = selector;
    }
  }

  async scroll(step, tabId) {
    await this.background.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
      expression: `window.scrollTo(${step.x || 0}, ${step.y || 0});`
    });
  }

  async waitForElement(step, tabId, timeout = 30000) {
    const startTime = Date.now();
    const timeoutMs = step.timeout || timeout;

    console.log(`   ⏳ Waiting for element (timeout: ${timeoutMs}ms, visible: ${step.visible || false})...`);

    while (Date.now() - startTime < timeoutMs) {
      const element = await this.getElement(step.selectors, tabId);

      if (element) {
        // Check visibility if required
        if (step.visible) {
          const isVisible = await this.isElementVisible(element.selector, tabId);
          if (isVisible) {
            console.log(`   ✓ Element found and visible`);
            return element;
          }
        } else {
          console.log(`   ✓ Element found`);
          return element;
        }
      }

      await this.wait(100);
    }

    throw new Error(`Element wait timeout after ${timeoutMs}ms`);
  }

  async waitForExpression(step, tabId, timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.background.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
        expression: step.expression,
        returnByValue: true
      });

      if (result.result.value === true) {
        return;
      }

      await this.wait(100);
    }

    throw new Error('Expression wait timeout');
  }

  async findElement(step, tabId) {
    const element = await this.getElement(step.selectors, tabId);

    if (!element) {
      throw new Error('Element not found');
    }

    // Store element reference in variables
    if (step.storeAs) {
      this.variables[step.storeAs] = element;
    }

    return element;
  }

  async gotoElement(step, tabId) {
    let element;

    if (step.variableName && this.variables[step.variableName]) {
      element = this.variables[step.variableName];
    } else {
      element = await this.getElement(step.selectors, tabId);
    }

    if (!element) {
      throw new Error('Element not found for goto action');
    }

    const selector = element.selector || (step.selectors && step.selectors[0] && step.selectors[0][0]);
    if (!selector) {
      throw new Error('No selector available for goto action');
    }
    const safeSelector = this.escapeSelectorForEval(selector);

    // Scroll element into view
    await this.background.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
      expression: `
        (function() {
          const el = document.querySelector('${safeSelector}');
          if (el) {
            el.scrollIntoView({ behavior: '${step.smooth ? 'smooth' : 'auto'}', block: 'center' });
          }
        })();
      `
    });
  }

  async executeScript(step, tabId) {
    // Get stored JavaScript code
    const jsScripts = await chrome.storage.local.get(['jsScripts']);
    const script = jsScripts.jsScripts?.find(s => s.id === step.scriptId);

    if (!script) {
      throw new Error(`JavaScript script not found: ${step.scriptId}`);
    }

    await this.background.injectScript(tabId, script.code);
  }

  async executeLoop(step, tabId) {
    const iterations = step.loop.iterations || 1;
    const childSteps = step.loop.steps || [];

    for (let i = 0; i < iterations; i++) {
      const loopContext = { iteration: i, total: iterations };

      // Check loop condition if present
      if (step.loop.condition) {
        const conditionMet = await this.evaluateCondition(step.loop.condition, tabId, loopContext);
        if (!conditionMet) break;
      }

      await this.executeSteps(childSteps, tabId, loopContext);

      // Wait between iterations
      if (step.loop.waitBetween && i < iterations - 1) {
        await this.wait(step.loop.waitBetween);
      }
    }
  }

  async evaluateCondition(condition, tabId, context = {}) {
    // Simple rule-based condition evaluation
    // Format: { field: "selector", operator: "exists|equals|contains", value: "..." }

    if (condition.operator === 'exists') {
      const element = await this.getElement([condition.field], tabId);
      return !!element;
    }

    if (condition.operator === 'equals' || condition.operator === 'contains') {
      const result = await this.background.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
        expression: condition.expression,
        returnByValue: true
      });

      const actualValue = result.result.value;

      if (condition.operator === 'equals') {
        return actualValue === condition.value;
      } else {
        return String(actualValue).includes(condition.value);
      }
    }

    return false;
  }

  async getElement(selectors, tabId) {
    if (!selectors || selectors.length === 0) {
      return null;
    }

    // Use content script for DOM access instead of debugger API
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'FIND_ELEMENT',
        selectors: selectors
      });

      if (response && response.success && response.element && response.element.exists) {
        const elementInfo = response.element;
        const selector = elementInfo.selector || elementInfo.optimizedSelector || (selectors && selectors[0] && selectors[0][0]);
        const attempts = Array.isArray(elementInfo.attempts) ? elementInfo.attempts : [];
        const sourceLabel = elementInfo.origin === 'generated' ? 'generated selector' : elementInfo.origin === 'unknown' ? 'heuristic selector' : 'provided selector';
        console.log(`   ✓ Found element (${sourceLabel}): ${elementInfo.tagName}${elementInfo.id ? '#' + elementInfo.id : ''} using selector: ${selector}`);

        return {
          selector,
          info: {
            ...elementInfo,
            attempts,
            selector
          }
        };
      } else {
        console.log(`   ❌ All ${selectors.length} selector(s) failed to find element`);
        return null;
      }
    } catch (error) {
      console.error('   ❌ Error finding element via content script:', error);
      return null;
    }
  }

  escapeSelectorForEval(selector) {
    if (!selector) return '';
    return selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  async isElementVisible(selector, tabId) {
    // Use content script for visibility check
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'CHECK_ELEMENT_VISIBLE',
        selector: selector
      });

      return response && response.success && response.visible === true;
    } catch (error) {
      console.error('   ❌ Error checking element visibility via content script:', error);
      return false;
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize background service
const deskAgent = new DeskAgentBackground();
