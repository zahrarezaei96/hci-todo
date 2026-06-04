import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { TodoItem } from './TodoItem';
import { Search, Plus, Menu, SlidersHorizontal, Trash2, Flag, Calendar, Tag, X, Eye, EyeOff } from 'lucide-react';
import { Priority } from '../types';
import { useGaze } from '../modules/gaze/GazeContext';
import { GazeProgress } from '../modules/gaze/GazeProgress';

const priorityConfig: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export function MainContent() {
  const { state, dispatch, getFilteredTodos } = useStore();
  const { enabled, toggleGaze, registerTarget, getProgress } = useGaze();

  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ── Gaze IDs ──
  const G_ADD_OPEN     = 'main-add-open';
  const G_ADD_CONFIRM  = 'main-add-confirm';
  const G_CANCEL       = 'main-cancel';
  const G_MENU         = 'main-menu';
  const G_FILTER_TOG   = 'main-filter-toggle';
  const G_FILTER_ALL   = 'main-filter-all';
  const G_FILTER_ACT   = 'main-filter-active';
  const G_FILTER_DONE  = 'main-filter-completed';
  const G_PRIO_LOW     = 'main-prio-low';
  const G_PRIO_MED     = 'main-prio-medium';
  const G_PRIO_HIGH    = 'main-prio-high';
  const G_PRIO_URG     = 'main-prio-urgent';

  useEffect(() => {
    if (!enabled) return;
    const unsubs = [
      registerTarget(G_ADD_OPEN,    () => setExpanded(true)),
      registerTarget(G_ADD_CONFIRM, () => addTodo()),
      registerTarget(G_CANCEL,      () => handleCancel()),
      registerTarget(G_MENU,        () => dispatch({ type: 'TOGGLE_SIDEBAR' })),
      registerTarget(G_FILTER_TOG,  () => setShowFilters(v => !v)),
      registerTarget(G_FILTER_ALL,  () => dispatch({ type: 'SET_FILTER', filter: 'all' })),
      registerTarget(G_FILTER_ACT,  () => dispatch({ type: 'SET_FILTER', filter: 'active' })),
      registerTarget(G_FILTER_DONE, () => dispatch({ type: 'SET_FILTER', filter: 'completed' })),
      registerTarget(G_PRIO_LOW,    () => setNewPriority('low')),
      registerTarget(G_PRIO_MED,    () => setNewPriority('medium')),
      registerTarget(G_PRIO_HIGH,   () => setNewPriority('high')),
      registerTarget(G_PRIO_URG,    () => setNewPriority('urgent')),
    ];
    return () => unsubs.forEach(u => u());
  }, [enabled]);

  const activeList = state.lists.find(l => l.id === state.activeListId);
  const todos = getFilteredTodos();
  const active = todos.filter(t => !t.completed);
  const completed = todos.filter(t => t.completed);

  // Gaze progress values
  const pAddOpen    = getProgress(G_ADD_OPEN);
  const pAddConfirm = getProgress(G_ADD_CONFIRM);
  const pCancel     = getProgress(G_CANCEL);
  const pMenu       = getProgress(G_MENU);
  const pFilterTog  = getProgress(G_FILTER_TOG);
  const pFilterAll  = getProgress(G_FILTER_ALL);
  const pFilterAct  = getProgress(G_FILTER_ACT);
  const pFilterDone = getProgress(G_FILTER_DONE);
  const pPrioMap: Record<Priority, number> = {
    low:    getProgress(G_PRIO_LOW),
    medium: getProgress(G_PRIO_MED),
    high:   getProgress(G_PRIO_HIGH),
    urgent: getProgress(G_PRIO_URG),
  };
  const prioGazeId: Record<Priority, string> = {
    low: G_PRIO_LOW, medium: G_PRIO_MED, high: G_PRIO_HIGH, urgent: G_PRIO_URG,
  };

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

          {/* Menu / toggle sidebar */}
          <div data-gaze-id={G_MENU} style={{ position: 'relative', flexShrink: 0 }}>
            <button className="menu-btn" onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}>
              <Menu size={20} />
            </button>
            {enabled && <GazeProgress progress={pMenu} size={36} />}
          </div>

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
          {/* Gaze toggle */}
          <button
            className={`gaze-toggle ${enabled ? 'gaze-toggle--active' : ''}`}
            onClick={toggleGaze}
            title={enabled ? 'Disable eye tracking' : 'Enable eye tracking'}
          >
            {enabled ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>{enabled ? 'Eye On' : 'Eye Off'}</span>
          </button>

          {/* Filter toggle */}
          <div data-gaze-id={G_FILTER_TOG} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              className={`filter-toggle ${showFilters ? 'filter-toggle--active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} />
            </button>
            {enabled && <GazeProgress progress={pFilterTog} size={32} />}
          </div>

          {completed.length > 0 && (
            <button className="clear-btn" onClick={() => dispatch({ type: 'CLEAR_COMPLETED' })}>
              <Trash2 size={14} /> Clear done
            </button>
          )}
        </div>
      </header>

      <div className="search-bar">
        <Search size={15} className="search-icon" />
        <input className="search-input" placeholder="Search tasks..." value={state.searchQuery}
          onChange={e => dispatch({ type: 'SET_SEARCH', query: e.target.value })} />
        {state.searchQuery && (
          <button className="search-clear" onClick={() => dispatch({ type: 'SET_SEARCH', query: '' })}>✕</button>
        )}
      </div>

      {showFilters && (
        <div className="filter-bar">
          {([
            { f: 'all' as const,       id: G_FILTER_ALL,  p: pFilterAll  },
            { f: 'active' as const,    id: G_FILTER_ACT,  p: pFilterAct  },
            { f: 'completed' as const, id: G_FILTER_DONE, p: pFilterDone },
          ]).map(({ f, id, p }) => (
            <div key={f} data-gaze-id={id} style={{ position: 'relative' }}>
              <button
                className={`filter-btn ${state.filter === f ? 'filter-btn--active' : ''}`}
                onClick={() => dispatch({ type: 'SET_FILTER', filter: f })}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
              {enabled && <GazeProgress progress={p} size={32} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Add task box ── */}
      <div className={`add-task-box ${expanded ? 'add-task-box--expanded' : ''}`}>
        <div className="add-task-row">

          {/* + button */}
          <div data-gaze-id={G_ADD_OPEN} style={{ position: 'relative', flexShrink: 0 }}>
            <button className="add-task-icon" onClick={() => setExpanded(true)}>
              <Plus size={18} />
            </button>
            {enabled && <GazeProgress progress={pAddOpen} size={36} color="#0078d4" />}
          </div>

          <input
            className="add-task-input"
            placeholder="Add a task"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') handleCancel(); }}
          />
        </div>

        {expanded && (
          <div className="add-task-details">
            <div className="add-detail-row">
              <Flag size={13} className="add-detail-icon" />
              <span className="add-detail-label">Priority</span>
              <div className="priority-pills">
                {priorityConfig.map(p => (
                  <div key={p.value} data-gaze-id={prioGazeId[p.value]} style={{ position: 'relative' }}>
                    <button
                      className={`priority-pill ${newPriority === p.value ? 'priority-pill--active' : ''}`}
                      style={{ '--p': p.color } as React.CSSProperties}
                      onClick={() => setNewPriority(p.value)}
                    >
                      {p.label}
                    </button>
                    {enabled && <GazeProgress progress={pPrioMap[p.value]} size={32} color={p.color} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="add-detail-row">
              <Calendar size={13} className="add-detail-icon" />
              <span className="add-detail-label">Due date</span>
              <input type="date" className="add-detail-input" value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)} />
            </div>

            <div className="add-detail-row">
              <Tag size={13} className="add-detail-icon" />
              <span className="add-detail-label">Tags</span>
              <input className="add-detail-input" placeholder="dev, hci, research..."
                value={newTags} onChange={e => setNewTags(e.target.value)} />
            </div>

            <div className="add-detail-row add-detail-row--notes">
              <textarea className="add-notes-input" placeholder="Add a note..."
                value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2} />
            </div>

            <div className="add-task-actions">

              {/* Add task confirm */}
              <div data-gaze-id={G_ADD_CONFIRM} style={{ position: 'relative' }}>
                <button className="btn-add-task" onClick={addTodo} disabled={!newText.trim()}>
                  Add task
                </button>
                {enabled && <GazeProgress progress={pAddConfirm} size={32} color="#0078d4" />}
              </div>

              {/* Cancel */}
              <div data-gaze-id={G_CANCEL} style={{ position: 'relative' }}>
                <button className="btn-cancel-task" onClick={handleCancel}>
                  <X size={14} />Cancel
                </button>
                {enabled && <GazeProgress progress={pCancel} size={32} color="#ef4444" />}
              </div>

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
