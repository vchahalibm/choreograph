// Task Model - Workflow automation with JSON scripts as steps

class Task {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.title = data.title || 'Untitled Task';
    this.description = data.description || '';
    this.steps = data.steps || []; // Array of TaskStep objects
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  addStep(step) {
    this.steps.push(step);
    this.updatedAt = new Date().toISOString();
  }

  removeStep(stepId) {
    this.steps = this.steps.filter(s => s.id !== stepId);
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      steps: this.steps,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class TaskStep {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.scriptId = data.scriptId || null; // Reference to JSON script
    this.label = data.label || 'Step';
    this.position = data.position || { x: 0, y: 0 }; // For visual editor
    this.parameters = data.parameters || {}; // Default parameters for this step
    this.loop = data.loop || null; // Loop configuration
    this.condition = data.condition || null; // Conditional execution
    this.dataMapping = data.dataMapping || {}; // Map output to next step input
  }

  generateId() {
    return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  toJSON() {
    return {
      id: this.id,
      scriptId: this.scriptId,
      label: this.label,
      position: this.position,
      parameters: this.parameters,
      loop: this.loop,
      condition: this.condition,
      dataMapping: this.dataMapping
    };
  }
}

class LoopConfig {
  constructor(data = {}) {
    this.type = data.type || 'forEach'; // 'forEach', 'while', 'count'
    this.dataSource = data.dataSource || null; // Path to array in payload
    this.condition = data.condition || null; // For 'while' loops
    this.maxIterations = data.maxIterations || 100; // Safety limit
  }

  toJSON() {
    return {
      type: this.type,
      dataSource: this.dataSource,
      condition: this.condition,
      maxIterations: this.maxIterations
    };
  }
}

class ConditionConfig {
  constructor(data = {}) {
    this.type = data.type || 'expression'; // 'expression', 'dataExists', 'equals'
    this.expression = data.expression || null; // JavaScript expression
    this.field = data.field || null; // Field to check
    this.operator = data.operator || 'equals'; // 'equals', 'contains', 'greaterThan', etc.
    this.value = data.value || null; // Value to compare
  }

  toJSON() {
    return {
      type: this.type,
      expression: this.expression,
      field: this.field,
      operator: this.operator,
      value: this.value
    };
  }
}

// Task Storage Manager
class TaskStorage {
  static async saveTasks(tasks) {
    await chrome.storage.local.set({ tasks: tasks.map(t => t.toJSON()) });
  }

  static async loadTasks() {
    const result = await chrome.storage.local.get(['tasks']);
    return (result.tasks || []).map(t => new Task(t));
  }

  static async saveTask(task) {
    const tasks = await this.loadTasks();
    const existingIndex = tasks.findIndex(t => t.id === task.id);

    task.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }

    await this.saveTasks(tasks);
    return task;
  }

  static async deleteTask(taskId) {
    const tasks = await this.loadTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    await this.saveTasks(filteredTasks);
  }

  static async getTask(taskId) {
    const tasks = await this.loadTasks();
    return tasks.find(t => t.id === taskId);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Task, TaskStep, LoopConfig, ConditionConfig, TaskStorage };
}
