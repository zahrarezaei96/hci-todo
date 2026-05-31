import { useState } from 'react';
import { useStore } from '../store';
import { TodoItem } from './TodoItem';
import { Search, Plus, Menu, SlidersHorizontal, Trash2, Flag, Calendar, Tag, X } from 'lucide-react';
import { Priority } from '../types';

const priorityConfig: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export function MainContent() {
  const { state, dispatch, getFilteredTodos } = useStore();

  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const activeList = state.lists.find(l => l.id === state.activeListId);
  const todos = getFilteredTodos();
  const active = todos.filter(t => !t.completed);
  const completed = todos.filter(t => t.completed);

  function addTodo() {
    if (!newText.trim()) return;
    const tags = newTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    dispatch({
      type: 'ADD_TODO',
      todo: {
        text: newText.trim(),
        priority: newPriority,
        listId: ['all', 'important', 'planned'].includes(state.activeListId) ? 'personal' : state.activeListId,
        dueDate: newDueDate || undefined,
        notes: newNotes,
        tags,
      },
    });
    setNewText(''); setNewPriority('medium'); setNewDueDate('');
    setNewTags(''); setNewNotes(''); setExpanded(false);
  }

  function handleCancel() {
    setNewText(''); setNewPriority('medium'); setNewDueDate('');
    setNewTags(''); setNewNotes(''); setExpanded(false);
  }

  return (
    <main className="main-content">
      <header className="main-header">
        <div className="main-header-left">
          <button className="menu-btn" onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}>
            <Menu size={20} />
          </button>
          <div>
            <h1 className="main-title" style={{ color: activeList?.color }}>
              {activeList?.name || 'Tasks'}
            </h1>
            <span className="main-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="main-header-right">

          {/* Bottone apri/chiudi filtri */}
          <button
            data-gaze-filter-toggle="true"
            className={`filter-toggle ${showFilters ? 'filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} />
          </button>

          {completed.length > 0 && (
            <button className="clear-btn" onClick={() => dispatch({ type: 'CLEAR_COMPLETED' })}>
              <Trash2 size={14} /> Clear done
            </button>
          )}
        </div>
      </header>

      <div className="search-bar">
        <Search size={15} className="search-icon" />
        <input
          data-gaze-input="search"
          className="search-input"
          placeholder="Search tasks..."
          value={state.searchQuery}
          onChange={e => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
        />
        {state.searchQuery && (
          <button className="search-clear" onClick={() => dispatch({ type: 'SET_SEARCH', query: '' })}>✕</button>
        )}
      </div>

      {showFilters && (
        <div className="filter-bar">
          {(['all', 'active', 'completed'] as const).map(f => (
            <button
              key={f}
              data-gaze-filter={f}
              className={`filter-btn ${state.filter === f ? 'filter-btn--active' : ''}`}
              onClick={() => dispatch({ type: 'SET_FILTER', filter: f })}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* ── Add task box ── */}
      <div className={`add-task-box ${expanded ? 'add-task-box--expanded' : ''}`}>
        <div className="add-task-row">

          {/* Bottone + per aprire il form */}
          <button
            data-gaze-add-task-open="true"
            className="add-task-icon"
            onClick={() => {
              if (expanded && newText.trim()) {
                addTodo();
              } else {
                setExpanded(true);
              }
            }}
          >
            <Plus size={18} />
          </button>

          <input
            data-gaze-input="new-task"
            className="add-task-input"
            placeholder="Add a task"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') addTodo();
              if (e.key === 'Escape') handleCancel();
            }}
          />
        </div>

        {expanded && (
          <div className="add-task-details">
            <div className="add-detail-row">
              <Flag size={13} className="add-detail-icon" />
              <span className="add-detail-label">Priority</span>
              <div className="priority-pills">
                {priorityConfig.map(p => (
                  <button
                    key={p.value}
                    data-gaze-priority={p.value}
                    className={`priority-pill ${newPriority === p.value ? 'priority-pill--active' : ''}`}
                    style={{ '--p': p.color } as React.CSSProperties}
                    onClick={() => setNewPriority(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="add-detail-row">
              <Calendar size={13} className="add-detail-icon" />
              <span className="add-detail-label">Due date</span>
              <input
                data-gaze-input="due-date"
                type="date"
                className="add-detail-input"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="add-detail-row">
              <Tag size={13} className="add-detail-icon" />
              <span className="add-detail-label">Tags</span>
              <input
                data-gaze-input="tags"
                className="add-detail-input"
                placeholder="dev, hci, research..."
                value={newTags}
                onChange={e => setNewTags(e.target.value)}
              />
            </div>
            <div className="add-detail-row add-detail-row--notes">
              <textarea
                data-gaze-input="notes"
                className="add-notes-input"
                placeholder="Add a note..."
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="add-task-actions">

              {/* Bottone Add task */}
              <button
                data-gaze-add-task="true"
                className="btn-add-task"
                onClick={addTodo}
                disabled={!newText.trim()}
              >
                Add task
              </button>

              {/* Bottone Cancel */}
              <button
                data-gaze-cancel-task="true"
                className="btn-cancel-task"
                onClick={handleCancel}
              >
                <X size={14} />Cancel
              </button>

            </div>
          </div>
        )}
      </div>

      <div className="task-list">
        {active.length === 0 && completed.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <p className="empty-title">All clear!</p>
            <p className="empty-sub">Add a task above to get started</p>
          </div>
        )}
        {active.map(todo => <TodoItem key={todo.id} todo={todo} />)}
        {completed.length > 0 && (
          <div className="completed-section">
            <div className="completed-header">
              <span>Completed</span>
              <span className="completed-count">{completed.length}</span>
            </div>
            {completed.map(todo => <TodoItem key={todo.id} todo={todo} />)}
          </div>
        )}
      </div>
    </main>
  );
}
