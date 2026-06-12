import { useState, useEffect, useRef } from 'react';
import { CustomSelect } from './CustomSelect';
import { useStore } from '../store';
import { TodoItem } from './TodoItem';
import { Search, Plus, Menu, SlidersHorizontal, Trash2, Flag, Calendar, Tag, X } from 'lucide-react';
import { Priority } from '../types';
import { useGaze } from '../modules/gaze/GazeContext';
import { useExpanded } from '../context/ExpandedTodoContext';


const priorityConfig: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

// Tooltip hints per element class/id
const VOICE_HINTS: Record<string, string> = {
  'check-btn': '"check"',
  'todo-body': '"open" / "close"',
  'star-btn': '"star"',
  'detail-delete': '"delete"',
  'add-task-icon': '"add"',
  'btn-add-task': '"confirm"',
  'btn-cancel-task': '"cancel"',
  'search-input': '"search"',
  'nav-item': '"go"',
  'clear-btn': '"clear"',
  'menu-btn': '"sidebar"',
  'filter-toggle': '"filter"',
  'ob-next': '"next"',
  'ob-back': '"back"',
  'ob-gender-btn': '"male" / "female"',
  'ob-avatar-btn': '"click"',
  'ob-input': '"write" / "type"',
};

function getVoiceHint(el: Element | null): string | null {
  if (!el) return null;
  for (const [cls, hint] of Object.entries(VOICE_HINTS)) {
    if (el.closest(`.${cls}`) || el.classList.contains(cls)) return hint;
  }
  if (el.closest('[data-custom-select]')) return '"open" / "click"';
  if (el.closest('[data-select-option]')) return '"click" / "choose"';
  if (el.closest('.todo-item-wrap')) return '"open" / "check" / "star" / "delete"';
  if (el.closest('.nav-item')) return '"go"';
  return null;
}

export function MainContent() {
  const { state, dispatch, getFilteredTodos } = useStore();
  const { enabled } = useGaze();
  const { expandedId, toggleExpanded } = useExpanded();

  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueDay, setNewDueDay] = useState('');
  const [newDueMonth, setNewDueMonth] = useState('');
  const [newDueYear, setNewDueYear] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addExpanded, setAddExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const handVideoRef = useRef<HTMLVideoElement | null>(null);
  const handCameraRef = useRef<any>(null);
  const handScrollRef = useRef<{ lastY: number | null; lastTime: number }>({ lastY: null, lastTime: 0 });

  const activeList = state.lists.find(l => l.id === state.activeListId);
  const todos = getFilteredTodos();
  const active = todos.filter(t => !t.completed);
  const completed = todos.filter(t => t.completed);

  // ── Cursor tooltip — show after 1s dwell on element ──
  useEffect(() => {
    if (!enabled) { setTooltip(null); return; }
    let dwellEl: Element | null = null;
    let dwellStart = 0;
    let shown = false;

    const interval = setInterval(() => {
      const dot = document.getElementById('gaze-cursor-dot');
      if (!dot) return;
      const x = parseFloat(dot.style.left);
      const y = parseFloat(dot.style.top);
      if (!x || !y) return;
      const prevDisplay = dot.style.display;
      dot.style.display = 'none';
      const el = document.elementFromPoint(x, y);
      dot.style.display = prevDisplay;

      const hintEl = el?.closest('.todo-item-wrap, .check-btn, .star-btn, .detail-delete, .add-task-icon, .btn-add-task, .btn-cancel-task, .search-input, .nav-item, .clear-btn, .menu-btn, .filter-toggle, input[type="date"]');

      if (hintEl) {
        if (hintEl !== dwellEl) {
          dwellEl = hintEl; dwellStart = Date.now(); shown = false;
          setTooltip(null);
        } else if (!shown && Date.now() - dwellStart > 800) {
          shown = true;
          const hint = getVoiceHint(el);
          if (hint) setTooltip({ text: hint, x, y });
        } else if (shown) {
          setTooltip(prev => prev ? { ...prev, x, y } : null);
        }
      } else {
        dwellEl = null; shown = false;
        setTooltip(null);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [enabled]);



  function addTodo() {
    if (!newText.trim()) return;
    const tags = newTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    const builtDate = newDueYear && newDueMonth && newDueDay
      ? `${newDueYear}-${newDueMonth}-${newDueDay}`
      : newDueDate || undefined;
    dispatch({
      type: 'ADD_TODO',
      todo: {
        text: newText.trim(), priority: newPriority,
        listId: ['all', 'important', 'planned'].includes(state.activeListId) ? 'personal' : state.activeListId,
        dueDate: builtDate, notes: newNotes, tags,
      },
    });
    setNewText(''); setNewPriority('medium'); setNewDueDate('');
    setNewDueDay(''); setNewDueMonth(''); setNewDueYear('');
    setNewTags(''); setNewNotes(''); setAddExpanded(false);
  }

  function handleCancel() {
    setNewText(''); setNewPriority('medium'); setNewDueDate('');
    setNewDueDay(''); setNewDueMonth(''); setNewDueYear('');
    setNewTags(''); setNewNotes(''); setAddExpanded(false);
  }

  return (
    <main className="main-content">
      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 16, top: tooltip.y - 10,
          background: 'rgba(0,0,0,0.75)', color: 'white',
          padding: '4px 8px', borderRadius: 6, fontSize: 11,
          pointerEvents: 'none', zIndex: 999998, whiteSpace: 'nowrap',
          fontFamily: 'sans-serif',
        }}>
          {tooltip.text}
        </div>
      )}

      <header className="main-header">
        <div className="main-header-left">
          <button className="menu-btn" onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}>
            <Menu size={20} />
          </button>
          <div>
            <h1 className="main-title" style={{ color: activeList?.color }}>{activeList?.name || 'Tasks'}</h1>
            <span className="main-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="main-header-right">




          <button className={`filter-toggle ${showFilters ? 'filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={16} />
          </button>
          {completed.length > 0 && (
            <button className="clear-btn" onClick={() => dispatch({ type: 'CLEAR_COMPLETED' })}>
              <Trash2 size={14} /> Clear
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
          {(['all', 'active', 'completed'] as const).map(f => (
            <button key={f} className={`filter-btn ${state.filter === f ? 'filter-btn--active' : ''}`}
              onClick={() => dispatch({ type: 'SET_FILTER', filter: f })}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Add task */}
      <div className={`add-task-box ${addExpanded ? 'add-task-box--expanded' : ''}`}>
        <div className="add-task-row">
          <button className="add-task-icon" onClick={addTodo}><Plus size={18} /></button>
          <input className="add-task-input" placeholder="Add a task" value={newText}
            onChange={e => setNewText(e.target.value)}
            onFocus={() => setAddExpanded(true)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') handleCancel(); }} />
        </div>
        {addExpanded && (
          <div className="add-task-details">
            <div className="add-detail-row">
              <Flag size={13} className="add-detail-icon" />
              <span className="add-detail-label">Priority</span>
              <div className="priority-pills">
                {priorityConfig.map(p => (
                  <button key={p.value}
                    className={`priority-pill ${newPriority === p.value ? 'priority-pill--active' : ''}`}
                    style={{ '--p': p.color } as React.CSSProperties}
                    onClick={() => setNewPriority(p.value)}>{p.label}</button>
                ))}
              </div>
            </div>
            <div className="add-detail-row add-detail-row--date">
              <Calendar size={13} className="add-detail-icon" />
              <span className="add-detail-label">Due date</span>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <CustomSelect
                    placeholder="Day"
                    value={newDueDay}
                    options={Array.from({length:31},(_,i)=>({ value: String(i+1).padStart(2,'0'), label: String(i+1) }))}
                    onChange={v => setNewDueDay(String(v))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <CustomSelect
                    placeholder="Month"
                    value={newDueMonth}
                    options={['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>({ value: String(i+1).padStart(2,'0'), label: m }))}
                    onChange={v => setNewDueMonth(String(v))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <CustomSelect
                    placeholder="Year"
                    value={newDueYear}
                    options={Array.from({length:5},(_,i)=>{ const y=new Date().getFullYear()+i; return { value: String(y), label: String(y) }; })}
                    onChange={v => setNewDueYear(String(v))}
                  />
                </div>
              </div>
            </div>
            <div className="add-detail-row">
              <Tag size={13} className="add-detail-icon" />
              <span className="add-detail-label">Tags</span>
              <input className="add-detail-input add-tag-input" placeholder="dev, hci..." value={newTags}
                onChange={e => setNewTags(e.target.value)} />
            </div>
            <div className="add-detail-row add-detail-row--notes">
              <textarea className="add-notes-input" placeholder="Add a note..." value={newNotes}
                onChange={e => setNewNotes(e.target.value)} rows={2} />
            </div>
            <div className="add-task-actions">
              <button className="btn-add-task" onClick={addTodo} disabled={!newText.trim()}>Add task</button>
              <button className="btn-cancel-task" onClick={handleCancel}><X size={14} />Cancel</button>
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
