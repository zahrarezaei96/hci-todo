export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type FilterType = 'all' | 'active' | 'completed';

export interface Step {
  id: string;
  text: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  starred: boolean;
  priority: Priority;
  listId: string;
  steps: Step[];
  notes: string;
  dueDate?: string;
  reminderDate?: string;
  createdAt: string;
  completedAt?: string;
  tags: string[];
}

export interface TodoList {
  id: string;
  name: string;
  icon: string;
  color: string;
  isSystem?: boolean;
}

export type CommandAction = 'add' | 'delete' | 'complete' | 'uncomplete' | 'focus' | 'filter' | 'clear_completed';
export type CommandSource = 'mouse' | 'keyboard' | 'voice' | 'eye' | 'lip';
export interface Command {
  action: CommandAction;
  payload?: string;
  source: CommandSource;
}
export type DispatchCommand = (command: Command) => void;
