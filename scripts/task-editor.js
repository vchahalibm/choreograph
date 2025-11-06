// Task Editor - Visual Flow Builder
// Manages the drag-and-drop interface for creating task workflows

class TaskEditor {
  constructor() {
    this.task = null;
    this.scripts = [];
    this.selectedStep = null;
    this.draggedScript = null;
    this.draggedNode = null;
    this.canvas = null;
    this.canvasOffset = { x: 0, y: 0 };
    this.scale = 1;
    this.connections = [];
    this.connectingFrom = null;
  }

  async init() {
    console.log('🎨 Initializing Task Editor...');

    this.canvas = document.getElementById('flowCanvas');

    // Load task ID from URL if editing existing task
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('taskId');

    if (taskId) {
      await this.loadTask(taskId);
    } else {
      this.task = new Task();
    }

    // Load available scripts
    await this.loadScripts();

    // Setup UI
    this.setupEventListeners();
    this.renderScriptPalette();
    this.renderCanvas();
    this.updateTaskTitle();

    console.log('✅ Task Editor initialized');
  }

  async loadTask(taskId) {
    console.log(`📂 Loading task: ${taskId}`);
    const tasks = await TaskStorage.loadTasks();
    this.task = tasks.find(t => t.id === taskId);

    if (!this.task) {
      console.error('❌ Task not found, creating new task');
      this.task = new Task();
    }
  }

  async loadScripts() {
    console.log('📚 Loading available scripts...');
    const result = await chrome.storage.local.get(['jsonScripts']);
    this.scripts = result.jsonScripts || [];
    console.log(`✅ Loaded ${this.scripts.length} scripts`);
  }

  setupEventListeners() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
      window.close();
    });

    // Save button
    document.getElementById('saveTaskBtn').addEventListener('click', () => {
      this.saveTask();
    });

    // Task title
    document.getElementById('taskTitle').addEventListener('input', (e) => {
      this.task.title = e.target.value;
    });

    // Script search
    document.getElementById('scriptSearch').addEventListener('input', (e) => {
      this.filterScripts(e.target.value);
    });

    // Canvas toolbar buttons
    document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(1.2));
    document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(0.8));
    document.getElementById('fitBtn').addEventListener('click', () => this.fitToScreen());
    document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());

    // Canvas drag for panning
    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onCanvasWheel(e));

    // Drop zone for scripts
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      this.onScriptDrop(e);
    });
  }

  updateTaskTitle() {
    document.getElementById('taskTitle').value = this.task.title;
  }

  // ========== Script Palette ==========

  renderScriptPalette(filter = '') {
    const container = document.getElementById('availableScripts');

    if (this.scripts.length === 0) {
      container.innerHTML = '<div class="empty-state">No scripts available. Add JSON scripts first.</div>';
      return;
    }

    const filteredScripts = filter
      ? this.scripts.filter(s =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          (s.description && s.description.toLowerCase().includes(filter.toLowerCase()))
        )
      : this.scripts;

    if (filteredScripts.length === 0) {
      container.innerHTML = '<div class="empty-state">No matching scripts found.</div>';
      return;
    }

    container.innerHTML = '';

    // Track which scripts are already used in the task
    const usedScriptIds = new Set(this.task.steps.map(step => step.scriptId));

    filteredScripts.forEach(script => {
      const isUsed = usedScriptIds.has(script.id);
      const scriptName = script.name || script.title || script.fileName || 'Untitled Script';

      const item = document.createElement('div');
      item.className = `palette-item ${isUsed ? 'used' : 'available'}`;
      item.draggable = true;
      item.dataset.scriptId = script.id;

      item.innerHTML = `
        <div class="palette-item-icon"></div>
        <div class="palette-item-title">${this.escapeHtml(scriptName)}</div>
      `;

      // Drag events
      item.addEventListener('dragstart', (e) => {
        this.draggedScript = script;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', script.id);
        item.style.opacity = '0.5';
      });

      item.addEventListener('dragend', (e) => {
        item.style.opacity = '1';
        this.draggedScript = null;
      });

      container.appendChild(item);
    });
  }

  filterScripts(query) {
    this.renderScriptPalette(query);
  }

  // ========== Canvas Rendering ==========

  renderCanvas() {
    // Clear existing nodes
    const existingNodes = this.canvas.querySelectorAll('.flow-node');
    existingNodes.forEach(node => node.remove());

    const existingLines = this.canvas.querySelectorAll('.connection-line');
    existingLines.forEach(line => line.remove());

    // Render steps
    this.task.steps.forEach((step, index) => {
      this.renderNode(step, index);
    });

    // Render connections
    this.renderConnections();
  }

  renderNode(step, index) {
    const script = this.scripts.find(s => s.id === step.scriptId);
    if (!script) return;

    const scriptName = script.name || script.title || script.fileName || 'Untitled Script';

    const node = document.createElement('div');
    node.className = 'flow-node';
    node.dataset.stepId = step.id;

    if (this.selectedStep && this.selectedStep.id === step.id) {
      node.classList.add('selected');
    }

    // Position
    node.style.left = step.position.x + 'px';
    node.style.top = step.position.y + 'px';

    // Content
    node.innerHTML = `
      <div class="flow-node-header">
        <div class="flow-node-icon">📄</div>
        <div class="flow-node-title">${this.escapeHtml(scriptName)}</div>
        <button class="btn-icon btn-delete-step" data-step-id="${step.id}" title="Delete">✕</button>
      </div>
      <div class="flow-node-body">
        ${this.escapeHtml(script.description || 'No description')}
      </div>
      <div class="flow-node-footer">
        Step ${index + 1}
        ${step.loop ? ' • Loop' : ''}
        ${step.condition ? ' • Conditional' : ''}
      </div>
      <div class="node-connection-point input" data-step-id="${step.id}" data-point="input"></div>
      <div class="node-connection-point output" data-step-id="${step.id}" data-point="output"></div>
    `;

    // Delete button event listener
    const deleteBtn = node.querySelector('.btn-delete-step');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteStep(step.id);
      });
    }

    // Node selection
    node.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-icon')) return;
      this.selectStep(step);
    });

    // Node dragging
    let isDragging = false;
    let startX, startY, initialX, initialY;

    node.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('btn-icon')) return;
      if (e.target.classList.contains('node-connection-point')) {
        this.onConnectionPointClick(e);
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = step.position.x;
      initialY = step.position.y;
      node.style.cursor = 'grabbing';
      e.stopPropagation();
    });

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      step.position.x = initialX + dx;
      step.position.y = initialY + dy;

      node.style.left = step.position.x + 'px';
      node.style.top = step.position.y + 'px';

      this.renderConnections();
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        node.style.cursor = 'move';
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    this.canvas.appendChild(node);
  }

  renderConnections() {
    // Remove existing connection lines
    const existingLines = this.canvas.querySelectorAll('.connection-line');
    existingLines.forEach(line => line.remove());

    // Draw connections between sequential steps
    for (let i = 0; i < this.task.steps.length - 1; i++) {
      const fromStep = this.task.steps[i];
      const toStep = this.task.steps[i + 1];

      this.drawConnection(fromStep, toStep);
    }
  }

  drawConnection(fromStep, toStep) {
    const fromNode = this.canvas.querySelector(`[data-step-id="${fromStep.id}"]`);
    const toNode = this.canvas.querySelector(`[data-step-id="${toStep.id}"]`);

    if (!fromNode || !toNode) return;

    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    const fromX = fromRect.left - canvasRect.left + fromRect.width / 2 + this.canvas.scrollLeft;
    const fromY = fromRect.bottom - canvasRect.top + this.canvas.scrollTop;
    const toX = toRect.left - canvasRect.left + toRect.width / 2 + this.canvas.scrollLeft;
    const toY = toRect.top - canvasRect.top + this.canvas.scrollTop;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('connection-line');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('stroke', '#4285f4');
    line.setAttribute('stroke-width', '2');

    svg.appendChild(line);
    this.canvas.appendChild(svg);
  }

  // ========== Drop Handling ==========

  onScriptDrop(e) {
    if (!this.draggedScript) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left + this.canvas.scrollLeft - 100;
    const y = e.clientY - canvasRect.top + this.canvas.scrollTop - 50;

    console.log(`📍 Dropping script at (${x}, ${y})`);

    const step = new TaskStep({
      scriptId: this.draggedScript.id,
      position: { x, y }
    });

    this.task.addStep(step);
    this.renderCanvas();
    this.selectStep(step);

    console.log(`✅ Added step: ${this.draggedScript.name}`);
  }

  // ========== Step Management ==========

  selectStep(step) {
    this.selectedStep = step;
    this.renderCanvas();
    this.renderProperties();
  }

  deleteStep(stepId) {
    if (confirm('Delete this step?')) {
      this.task.steps = this.task.steps.filter(s => s.id !== stepId);

      if (this.selectedStep && this.selectedStep.id === stepId) {
        this.selectedStep = null;
      }

      this.renderCanvas();
      this.renderProperties();
    }
  }

  // ========== Properties Panel ==========

  renderProperties() {
    const container = document.getElementById('propertiesContent');

    if (!this.selectedStep) {
      container.innerHTML = '<div class="empty-state">Select a step to configure</div>';
      return;
    }

    const script = this.scripts.find(s => s.id === this.selectedStep.scriptId);
    const stepIndex = this.task.steps.findIndex(s => s.id === this.selectedStep.id);

    // Get previous step's output schema if available
    const previousStepOutputHtml = this.getPreviousStepOutputHtml(stepIndex);

    container.innerHTML = `
      <div class="property-group">
        <label class="property-label">Step Name</label>
        <input type="text" class="property-input" value="${this.escapeHtml(script?.name || 'Unknown')}" disabled>
      </div>

      <div class="property-group">
        <label class="property-label">Step Position</label>
        <input type="number" class="property-input" value="${stepIndex + 1}" disabled>
      </div>

      <div class="property-group">
        <label class="property-label">Description</label>
        <textarea class="property-textarea" id="stepDescription" disabled>${this.escapeHtml(script?.description || '')}</textarea>
      </div>

      ${previousStepOutputHtml}

      <div class="property-group">
        <label class="property-label">Parameters (JSON)</label>
        <textarea class="property-textarea" id="stepParameters" placeholder='{"key": "value"}'>${JSON.stringify(this.selectedStep.parameters, null, 2)}</textarea>
      </div>

      <div class="property-group">
        <label class="property-label">Data Mapping (JSON)</label>
        <textarea class="property-textarea" id="stepDataMapping" placeholder='{"targetParam": "$.source.field"}'>${JSON.stringify(this.selectedStep.dataMapping, null, 2)}</textarea>
        <p style="font-size: 11px; color: #666; margin-top: 5px;">
          Maps data from previous step's output to this step's parameters. Click field names above to copy path.
        </p>
      </div>

      <div class="property-group">
        <label class="property-label">
          <input type="checkbox" id="stepHasLoop" ${this.selectedStep.loop ? 'checked' : ''}>
          Enable Loop
        </label>
        <div id="loopConfig" style="display: ${this.selectedStep.loop ? 'block' : 'none'}; margin-top: 10px;">
          <label class="property-label">Loop Type</label>
          <select class="property-select" id="loopType">
            <option value="forEach" ${this.selectedStep.loop?.type === 'forEach' ? 'selected' : ''}>For Each (Array)</option>
            <option value="while" ${this.selectedStep.loop?.type === 'while' ? 'selected' : ''}>While (Condition)</option>
            <option value="fixed" ${this.selectedStep.loop?.type === 'fixed' ? 'selected' : ''}>Fixed Count</option>
          </select>

          <label class="property-label" style="margin-top: 10px;">Max Iterations</label>
          <input type="number" class="property-input" id="loopMaxIterations" value="${this.selectedStep.loop?.maxIterations || 100}" min="1">

          <label class="property-label" style="margin-top: 10px;">Loop Data Source (JSON Path)</label>
          <input type="text" class="property-input" id="loopDataSource" placeholder="$.data.items" value="${this.selectedStep.loop?.dataSource || ''}">
        </div>
      </div>

      <div class="property-group">
        <label class="property-label">
          <input type="checkbox" id="stepHasCondition" ${this.selectedStep.condition ? 'checked' : ''}>
          Enable Condition
        </label>
        <div id="conditionConfig" style="display: ${this.selectedStep.condition ? 'block' : 'none'}; margin-top: 10px;">
          <label class="property-label">Condition Expression</label>
          <input type="text" class="property-input" id="conditionExpression" placeholder="$.data.status === 'success'" value="${this.selectedStep.condition?.expression || ''}">

          <label class="property-label" style="margin-top: 10px;">On Condition False</label>
          <select class="property-select" id="conditionAction">
            <option value="skip" ${this.selectedStep.condition?.onFalse === 'skip' ? 'selected' : ''}>Skip Step</option>
            <option value="stop" ${this.selectedStep.condition?.onFalse === 'stop' ? 'selected' : ''}>Stop Task</option>
            <option value="continue" ${this.selectedStep.condition?.onFalse === 'continue' ? 'selected' : ''}>Continue</option>
          </select>
        </div>
      </div>

      <div class="property-group">
        <button class="btn btn-primary" id="saveStepBtn">Save Step Properties</button>
      </div>
    `;

    // Setup property event listeners
    this.setupPropertyListeners();
  }

  setupPropertyListeners() {
    // Loop toggle
    const loopCheckbox = document.getElementById('stepHasLoop');
    const loopConfig = document.getElementById('loopConfig');

    if (loopCheckbox) {
      loopCheckbox.addEventListener('change', (e) => {
        loopConfig.style.display = e.target.checked ? 'block' : 'none';

        if (e.target.checked && !this.selectedStep.loop) {
          this.selectedStep.loop = new LoopConfig();
        } else if (!e.target.checked) {
          this.selectedStep.loop = null;
        }
      });
    }

    // Condition toggle
    const conditionCheckbox = document.getElementById('stepHasCondition');
    const conditionConfig = document.getElementById('conditionConfig');

    if (conditionCheckbox) {
      conditionCheckbox.addEventListener('change', (e) => {
        conditionConfig.style.display = e.target.checked ? 'block' : 'none';

        if (e.target.checked && !this.selectedStep.condition) {
          this.selectedStep.condition = new ConditionConfig();
        } else if (!e.target.checked) {
          this.selectedStep.condition = null;
        }
      });
    }

    // Save button
    const saveBtn = document.getElementById('saveStepBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveStepProperties());
    }

    // Output field click handlers (event delegation)
    const outputFields = document.querySelectorAll('.output-field');
    outputFields.forEach(field => {
      field.addEventListener('click', () => {
        const path = field.getAttribute('data-field-path');
        if (path) {
          this.copyFieldPath(path);
        }
      });
    });
  }

  saveStepProperties() {
    try {
      // Parameters
      const parametersText = document.getElementById('stepParameters').value;
      if (parametersText.trim()) {
        this.selectedStep.parameters = JSON.parse(parametersText);
      }

      // Data mapping
      const dataMappingText = document.getElementById('stepDataMapping').value;
      if (dataMappingText.trim()) {
        this.selectedStep.dataMapping = JSON.parse(dataMappingText);
      }

      // Loop configuration
      if (this.selectedStep.loop) {
        this.selectedStep.loop.type = document.getElementById('loopType').value;
        this.selectedStep.loop.maxIterations = parseInt(document.getElementById('loopMaxIterations').value);
        this.selectedStep.loop.dataSource = document.getElementById('loopDataSource').value;
      }

      // Condition configuration
      if (this.selectedStep.condition) {
        this.selectedStep.condition.expression = document.getElementById('conditionExpression').value;
        this.selectedStep.condition.onFalse = document.getElementById('conditionAction').value;
      }

      this.showStatus('✅ Step properties saved', 'success');
      this.renderCanvas(); // Re-render to show loop/condition indicators

    } catch (error) {
      this.showStatus('❌ Invalid JSON in parameters or data mapping', 'error');
      console.error('Error saving step properties:', error);
    }
  }

  // ========== Canvas Controls ==========

  zoom(factor) {
    this.scale *= factor;
    this.canvas.style.transform = `scale(${this.scale})`;
  }

  fitToScreen() {
    this.scale = 1;
    this.canvas.style.transform = 'scale(1)';
    this.canvas.scrollTop = 0;
    this.canvas.scrollLeft = 0;
  }

  clearCanvas() {
    if (confirm('Clear all steps? This cannot be undone.')) {
      this.task.steps = [];
      this.selectedStep = null;
      this.renderCanvas();
      this.renderProperties();
    }
  }

  onCanvasMouseDown(e) {
    // Only pan if clicking empty canvas area
    if (e.target === this.canvas) {
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panStartScrollX = this.canvas.scrollLeft;
      this.panStartScrollY = this.canvas.scrollTop;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onCanvasMouseMove(e) {
    if (this.isPanning) {
      const dx = this.panStartX - e.clientX;
      const dy = this.panStartY - e.clientY;
      this.canvas.scrollLeft = this.panStartScrollX + dx;
      this.canvas.scrollTop = this.panStartScrollY + dy;
    }
  }

  onCanvasMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }
  }

  onCanvasWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom(delta);
    }
  }

  onConnectionPointClick(e) {
    const stepId = e.target.dataset.stepId;
    const pointType = e.target.dataset.point;

    console.log(`🔗 Connection point clicked: ${stepId} (${pointType})`);
    // Future: Implement manual connection drawing
  }

  // ========== Task Saving ==========

  async saveTask() {
    try {
      // Validate task
      if (!this.task.title || this.task.title.trim() === '' || this.task.title === 'Untitled Task') {
        this.showStatus('❌ Please enter a task title', 'error');
        return;
      }

      if (this.task.steps.length === 0) {
        this.showStatus('❌ Task must have at least one step', 'error');
        return;
      }

      // Update timestamp
      this.task.updatedAt = new Date().toISOString();

      // Save to storage
      await TaskStorage.saveTask(this.task);

      this.showStatus('✅ Task saved successfully!', 'success');
      console.log('💾 Task saved:', this.task);

      // Close after brief delay
      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (error) {
      this.showStatus('❌ Error saving task: ' + error.message, 'error');
      console.error('Error saving task:', error);
    }
  }

  // ========== Utilities ==========

  showStatus(message, type) {
    // Create temporary status message
    const header = document.querySelector('.editor-header');
    const existing = header.querySelector('.status-message');

    if (existing) {
      existing.remove();
    }

    const status = document.createElement('div');
    status.className = `status-message ${type}`;
    status.textContent = message;
    status.style.cssText = 'position: absolute; top: 70px; right: 20px; z-index: 1000; padding: 10px 15px; border-radius: 4px; display: block;';

    if (type === 'success') {
      status.style.background = '#e6f4ea';
      status.style.color = '#1e8e3e';
      status.style.border = '1px solid #1e8e3e';
    } else {
      status.style.background = '#fce8e6';
      status.style.color = '#c5221f';
      status.style.border = '1px solid #c5221f';
    }

    header.appendChild(status);

    setTimeout(() => {
      status.remove();
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // Get HTML for previous step's output schema
  getPreviousStepOutputHtml(currentStepIndex) {
    if (currentStepIndex === 0) {
      return ''; // First step has no previous output
    }

    const previousStep = this.task.steps[currentStepIndex - 1];
    const previousScript = this.scripts.find(s => s.id === previousStep.scriptId);

    if (!previousScript || !previousScript.outputSchema || !previousScript.outputSchema.fields) {
      return ''; // No output schema defined
    }

    const schema = previousScript.outputSchema;
    let fieldsHtml = '';

    schema.fields.forEach(field => {
      const typeColor = this.getTypeColor(field.type);
      fieldsHtml += `
        <div class="output-field" data-field-path="${this.escapeHtml(field.path)}" style="cursor: pointer; padding: 6px; margin: 4px 0; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${typeColor};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 500; font-size: 12px;">${this.escapeHtml(field.name)}</span>
            <span style="font-size: 10px; color: #666; background: white; padding: 2px 6px; border-radius: 3px;">${field.type}</span>
          </div>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">${this.escapeHtml(field.description)}</div>
          <code style="font-size: 10px; color: #1976d2; display: block; margin-top: 2px;">${field.path}</code>
        </div>
      `;
    });

    return `
      <div class="property-group" style="border: 1px solid #e3f2fd; border-radius: 6px; padding: 10px; background: #e3f2fd;">
        <label class="property-label" style="color: #1976d2; display: flex; align-items: center; gap: 5px;">
          <span>📤</span>
          <span>Available Data from Previous Step</span>
        </label>
        <p style="font-size: 10px; color: #666; margin-bottom: 8px;">
          ${this.escapeHtml(schema.description || '')}
        </p>
        ${fieldsHtml}
        <p style="font-size: 10px; color: #666; margin-top: 8px; font-style: italic;">
          💡 Click any field to copy its path for use in Data Mapping or Loop Source
        </p>
      </div>
    `;
  }

  getTypeColor(type) {
    const colors = {
      'string': '#4caf50',
      'number': '#2196f3',
      'boolean': '#ff9800',
      'array': '#9c27b0',
      'object': '#607d8b'
    };
    return colors[type] || '#757575';
  }

  copyFieldPath(path) {
    // Copy to clipboard
    navigator.clipboard.writeText(path).then(() => {
      this.showStatus(`✅ Copied: ${path}`, 'success');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.showStatus('❌ Failed to copy path', 'error');
    });
  }
}

// Initialize when page loads
let taskEditor;

document.addEventListener('DOMContentLoaded', async () => {
  taskEditor = new TaskEditor();
  await taskEditor.init();
});
