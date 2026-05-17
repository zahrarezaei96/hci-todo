import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { Todo, TodoList, Priority, FilterType, Command, DispatchCommand, Step } from '../types';

const SYSTEM_LISTS: TodoList[] = [
  { id: 'myday', name: 'My Day', icon: '☀️', color: '#0078d4', isSystem: true },
  { id: 'important', name: 'Important', icon: '⭐', color: '#ca5010', isSystem: true },
  { id: 'planned', name: 'Planned', icon: '📅', color: '#107c10', isSystem: true },
  { id: 'all', name: 'All Tasks', icon: '📋', color: '#5c2d91', isSystem: true },
];

const SAMPLE_TODOS: Todo[] = [
  {
    id: '1', text: 'Set up project repository on GitHub', completed: false, starred: true,
    priority: 'high', listId: 'myday', steps: [
      { id: 's1', text: 'Create repository', completed: true },
      { id: 's2', text: 'Add README file', completed: true },
      { id: 's3', text: 'Set up branch protection', completed: false },
    ],
    notes: 'Make sure to add all team members as collaborators.',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    tags: ['dev', 'team'], createdAt: new Date().toISOString(),
  },
  {
    id: '2', text: 'Implement voice recognition module', completed: false, starred: false,
    priority: 'medium', listId: 'myday', steps: [
      { id: 's4', text: 'Research Web Speech API', completed: false },
      { id: 's5', text: 'Build prototype', completed: false },
    ],
    notes: '', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    tags: ['hci', 'voice'], createdAt: new Date().toISOString(),
  },
  {
    id: '3', text: 'Review WebGazer.js documentation', completed: true, starred: false,
    priority: 'low', listId: 'personal', steps: [],
    notes: 'Completed reading — very useful for calibration tips.',
    tags: ['research'], createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: '4', text: 'Prepare HCI presentation slides', completed: false, starred: true,
    priority: 'urgent', listId: 'myday', steps: [
      { id: 's6', text: 'Outline the structure', completed: true },
      { id: 's7', text: 'Add demo screenshots', completed: false },
      { id: 's8', text: 'Practice delivery', completed: false },
    ],
    notes: 'Presentation is on Friday — keep it under 15 minutes.',
    dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    tags: ['presentation', 'hci'], createdAt: new Date().toISOString(),
  },
  {
    id: '5', text: 'Buy groceries', completed: false, starred: false,
    priority: 'low', listId: 'personal', steps: [
      { id: 's9', text: 'Milk', completed: false },
      { id: 's10', text: 'Bread', completed: false },
    ],
    notes: '', tags: [], createdAt: new Date().toISOString(),
  },
];

const SAMPLE_LISTS: TodoList[] = [
  ...SYSTEM_LISTS,
  { id: 'personal', name: 'Personal', icon: '🏠', color: '#008272' },
  { id: 'work', name: 'Work', icon: '💼', color: '#004e8c' },
];

interface State {
  todos: Todo[];
  lists: TodoList[];
  activeListId: string;
  selectedTodoId: string | null;
  filter: FilterType;
  searchQuery: string;
  sidebarOpen: boolean;
}

const initialState: State = {
  todos: SAMPLE_TODOS,
  lists: SAMPLE_LISTS,
  activeListId: 'myday',
  selectedTodoId: null,
  filter: 'all',
  searchQuery: '',
  sidebarOpen: true,
};

type Action =
  | { type: 'ADD_TODO'; todo: Omit<Todo, 'id' | 'createdAt' | 'completed' | 'starred' | 'steps'> & { notes?: string; tags?: string[] } }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'TOGGLE_TODO'; id: string }
  | { type: 'TOGGLE_STAR'; id: string }
  | { type: 'UPDATE_TODO'; id: string; updates: Partial<Todo> }
  | { type: 'ADD_STEP'; todoId: string; text: string }
  | { type: 'TOGGLE_STEP'; todoId: string; stepId: string }
  | { type: 'DELETE_STEP'; todoId: string; stepId: string }
  | { type: 'SET_ACTIVE_LIST'; listId: string }
  | { type: 'SELECT_TODO'; id: string | null }
  | { type: 'SET_FILTER'; filter: FilterType }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'ADD_LIST'; list: Omit<TodoList, 'id'> }
  | { type: 'DELETE_LIST'; id: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_LAST_COMMAND'; command: Command };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [{
          ...action.todo,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          completed: false,
          starred: false,
          steps: [],
          notes: action.todo.notes ?? '',
          tags: action.todo.tags ?? [],
        }, ...state.todos],
      };
    case 'DELETE_TODO':
      return { ...state, todos: state.todos.filter(t => t.id !== action.id), selectedTodoId: state.selectedTodoId === action.id ? null : state.selectedTodoId };
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(t => t.id === action.id
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
          : t),
      };
    case 'TOGGLE_STAR':
      return { ...state, todos: state.todos.map(t => t.id === action.id ? { ...t, starred: !t.starred } : t) };
    case 'UPDATE_TODO':
      return { ...state, todos: state.todos.map(t => t.id === action.id ? { ...t, ...action.updates } : t) };
    case 'ADD_STEP':
      return {
        ...state,
        todos: state.todos.map(t => t.id === action.todoId
          ? { ...t, steps: [...t.steps, { id: Date.now().toString(), text: action.text, completed: false }] }
          : t),
      };
    case 'TOGGLE_STEP':
      return {
        ...state,
        todos: state.todos.map(t => t.id === action.todoId
          ? { ...t, steps: t.steps.map(s => s.id === action.stepId ? { ...s, completed: !s.completed } : s) }
          : t),
      };
    case 'DELETE_STEP':
      return {
        ...state,
        todos: state.todos.map(t => t.id === action.todoId
          ? { ...t, steps: t.steps.filter(s => s.id !== action.stepId) }
          : t),
      };
    case 'SET_ACTIVE_LIST':
      return { ...state, activeListId: action.listId, selectedTodoId: null };
    case 'SELECT_TODO':
      return { ...state, selectedTodoId: action.id };
    case 'SET_FILTER':
      return { ...state, filter: action.filter };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'CLEAR_COMPLETED':
      return { ...state, todos: state.todos.filter(t => !t.completed) };
    case 'ADD_LIST':
      return { ...state, lists: [...state.lists, { ...action.list, id: Date.now().toString() }] };
    case 'DELETE_LIST':
      return { ...state, lists: state.lists.filter(l => l.id !== action.id), todos: state.todos.filter(t => t.listId !== action.id) };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    default:
      return state;
  }
}

interface StoreContextType {
  state: State;
  dispatch: React.Dispatch<Action>;
  dispatchCommand: DispatchCommand;
  getFilteredTodos: () => Todo[];
  getListCount: (listId: string) => number;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const dispatchCommand = useCallback((command: Command) => {
    switch (command.action) {
      case 'add':
        if (command.payload) dispatch({ type: 'ADD_TODO', todo: { text: command.payload, priority: 'medium', listId: state.activeListId, notes: '', tags: [] } });
        break;
      case 'delete':
        if (command.payload) dispatch({ type: 'DELETE_TODO', id: command.payload });
        break;
      case 'complete':
        if (command.payload) dispatch({ type: 'TOGGLE_TODO', id: command.payload });
        break;
      case 'focus':
        if (command.payload) dispatch({ type: 'SELECT_TODO', id: command.payload });
        break;
      case 'clear_completed':
        dispatch({ type: 'CLEAR_COMPLETED' });
        break;
    }
  }, [state.activeListId]);

  const getFilteredTodos = useCallback(() => {
    let todos = state.todos;

    // Filter by list
    if (state.activeListId === 'myday') {
      todos = todos.filter(t => t.listId === 'myday' || (t.dueDate === new Date().toISOString().split('T')[0]));
    } else if (state.activeListId === 'important') {
      todos = todos.filter(t => t.starred);
    } else if (state.activeListId === 'planned') {
      todos = todos.filter(t => t.dueDate);
    } else if (state.activeListId === 'all') {
      // show all
    } else {
      todos = todos.filter(t => t.listId === state.activeListId);
    }

    // Filter by search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      todos = todos.filter(t => t.text.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q)));
    }

    // Filter by status
    if (state.filter === 'active') todos = todos.filter(t => !t.completed);
    if (state.filter === 'completed') todos = todos.filter(t => t.completed);

    return todos;
  }, [state.todos, state.activeListId, state.filter, state.searchQuery]);

  const getListCount = useCallback((listId: string) => {
    if (listId === 'myday') return state.todos.filter(t => !t.completed && (t.listId === 'myday' || t.dueDate === new Date().toISOString().split('T')[0])).length;
    if (listId === 'important') return state.todos.filter(t => !t.completed && t.starred).length;
    if (listId === 'planned') return state.todos.filter(t => !t.completed && t.dueDate).length;
    if (listId === 'all') return state.todos.filter(t => !t.completed).length;
    return state.todos.filter(t => !t.completed && t.listId === listId).length;
  }, [state.todos]);

  return (
    <StoreContext.Provider value={{ state, dispatch, dispatchCommand, getFilteredTodos, getListCount }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
