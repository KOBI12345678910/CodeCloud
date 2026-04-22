export interface TodoItem {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  assignee: string | null;
  dueDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class CollabTodosService {
  private todos: Map<string, TodoItem> = new Map();

  create(data: { projectId: string; title: string; priority?: TodoItem["priority"]; assignee?: string; dueDate?: string; createdBy: string }): TodoItem {
    const id = `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const todo: TodoItem = {
      id, projectId: data.projectId, title: data.title, completed: false,
      priority: data.priority || "medium", assignee: data.assignee || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null, createdBy: data.createdBy,
      createdAt: new Date(), updatedAt: new Date(),
    };
    this.todos.set(id, todo);
    return todo;
  }

  update(id: string, updates: Partial<Pick<TodoItem, "title" | "completed" | "priority" | "assignee">> & { dueDate?: string }): TodoItem | null {
    const t = this.todos.get(id); if (!t) return null;
    if (updates.title !== undefined) t.title = updates.title;
    if (updates.completed !== undefined) t.completed = updates.completed;
    if (updates.priority) t.priority = updates.priority;
    if (updates.assignee !== undefined) t.assignee = updates.assignee;
    if (updates.dueDate) t.dueDate = new Date(updates.dueDate);
    t.updatedAt = new Date();
    return t;
  }

  get(id: string): TodoItem | null { return this.todos.get(id) || null; }
  list(projectId: string): TodoItem[] { return Array.from(this.todos.values()).filter(t => t.projectId === projectId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); }
  delete(id: string): boolean { return this.todos.delete(id); }
  toggle(id: string): TodoItem | null { const t = this.todos.get(id); if (!t) return null; t.completed = !t.completed; t.updatedAt = new Date(); return t; }
}

export const collabTodosService = new CollabTodosService();
