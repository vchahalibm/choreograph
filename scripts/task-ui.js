// Task UI Manager - Handles task list rendering and flow editor

class TaskUIManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.tasks = [];
    this.currentTask = null;
  }

  async init() {
    await this.loadTasks();
    this.setupTaskEventListeners();
    this.renderTaskList();
  }

  setupTaskEventListeners() {
    // Create new task button
    document.getElementById('createTaskBtn').addEventListener('click', () => {
      this.openTaskEditor(null);
    });
  }

  async loadTasks() {
    this.tasks = await TaskStorage.loadTasks();
  }

  async saveTask(task) {
    await TaskStorage.saveTask(task);
    await this.loadTasks();
    this.renderTaskList();
  }

  async deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      await TaskStorage.deleteTask(taskId);
      await this.loadTasks();
      this.renderTaskList();
    }
  }

  renderTaskList() {
    const listEl = document.getElementById('taskList');

    if (this.tasks.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No tasks created yet. Click "Create New Task" to start!</div>';
      return;
    }

    listEl.innerHTML = '';

    this.tasks.forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.className = 'script-item';

      const stepCount = task.steps ? task.steps.length : 0;
      const stepText = stepCount === 1 ? '1 step' : `${stepCount} steps`;

      taskEl.innerHTML = `
        <div class="script-info">
          <div class="script-title">${this.escapeHtml(task.title)}</div>
          <div class="script-description">
            ${this.escapeHtml(task.description || 'No description')} • ${stepText}
          </div>
          <div style="font-size: 11px; color: #999; margin-top: 5px;">
            Created: ${new Date(task.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div class="script-actions">
          <button class="btn btn-secondary btn-edit-task" data-task-id="${task.id}">Edit</button>
          <button class="btn btn-danger btn-delete-task" data-task-id="${task.id}">Delete</button>
        </div>
      `;

      listEl.appendChild(taskEl);
    });

    // Attach event listeners
    document.querySelectorAll('.btn-edit-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        this.openTaskEditor(taskId);
      });
    });

    document.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        this.deleteTask(taskId);
      });
    });
  }

  openTaskEditor(taskId) {
    // Open task editor in a new page
    const url = chrome.runtime.getURL(`pages/task-editor.html${taskId ? '?taskId=' + taskId : ''}`);
    window.open(url, '_blank', 'width=1200,height=800');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when config page loads
if (typeof window.configManager !== 'undefined') {
  window.taskUIManager = new TaskUIManager(window.configManager);
}
