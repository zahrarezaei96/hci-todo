import { useState } from 'react';
import { useStore } from '../store';
import { X, Plus, Trash2, Star, Calendar, Flag, Tag, StickyNote, ChevronRight } from 'lucide-react';
import { Priority } from '../types';

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

export function DetailPanel() {
  const { state, dispatch } = useStore();
  const todo = state.todos.find(t => t.id === state.selectedTodoId);
  const [newStep, setNewStep] = useState('');
  const [newTag, setNewTag] = useState('');
  const [editingText, setEditingText] = useState(false);
  const [textVal, setTextVal] = useState('');

  if (!todo) return null;

  function startEdit() { setTextVal(todo!.text); setEditingText(true); }
  function saveEdit() {
    if (textVal.trim()) dispatch({ type: 'UPDATE_TODO', id: todo!.id, updates: { text: textVal.trim() } });
    setEditingText(false);
  }

  function addStep() {
    if (!newStep.trim()) return;
    dispatch({ type: 'ADD_STEP', todoId: todo!.id, text: newStep.trim() });
    setNewStep('');
  }

  function addTag() {
    const tag = newTag.trim().replace(/^#/, '');
    if (!tag || todo!.tags.includes(tag)) return;
    dispatch({ type: 'UPDATE_TODO', id: todo!.id, updates: { tags: [...todo!.tags, tag] } });
    setNewTag('');
  }

  const completedSteps = todo.steps.filter(s => s.completed).length;

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <button
          className={`check-btn ${todo.completed ? 'check-btn--checked' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_TODO', id: todo.id })}
          style={{ '--p-color': '#0078d4' } as React.CSSProperties}
        >
          {todo.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {editingText ? (
          <input
            className="detail-title-input"
            value={textVal}
            onChange={e => setTextVal(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingText(false); }}
            autoFocus
          />
        ) : (
          <h2 className={`detail-title ${todo.completed ? 'detail-title--done' : ''}`} onClick={startEdit}>
            {todo.text}
          </h2>
        )}

        <button
          className={`star-btn ${todo.starred ? 'star-btn--active' : ''}`}
          onClick={() => dispatch({ type: 'TOGGLE_STAR', id: todo.id })}
        >
          <Star size={18} fill={todo.starred ? 'currentColor' : 'none'} />
        </button>

        <button className="close-btn" onClick={() => dispatch({ type: 'SELECT_TODO', id: null })}>
          <X size={16} />
        </button>
      </div>

      <div className="detail-body">
        {/* Steps */}
        <div className="detail-section">
          <div className="detail-section-header">
            <ChevronRight size={14} />
            <span>Steps</span>
            {todo.steps.length > 0 && <span className="step-count">{completedSteps}/{todo.steps.length}</span>}
          </div>

          <div className="steps-list">
            {todo.steps.map(step => (
              <div key={step.id} className={`step-item ${step.completed ? 'step-item--done' : ''}`}>
                <button
                  className={`step-check ${step.completed ? 'step-check--checked' : ''}`}
                  onClick={() => dispatch({ type: 'TOGGLE_STEP', todoId: todo.id, stepId: step.id })}
                />
                <span className="step-text">{step.text}</span>
                <button className="step-delete" onClick={() => dispatch({ type: 'DELETE_STEP', todoId: todo.id, stepId: step.id })}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          <div className="add-step">
            <Plus size={14} />
            <input
              className="add-step-input"
              placeholder="Add a step..."
              value={newStep}
              onChange={e => setNewStep(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addStep(); }}
            />
          </div>
        </div>

        {/* Due Date */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Calendar size={14} />
            <span>Due Date</span>
          </div>
          <input
            type="date"
            className="detail-input"
            value={todo.dueDate || ''}
            onChange={e => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { dueDate: e.target.value || undefined } })}
          />
        </div>

        {/* Reminder */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Calendar size={14} />
            <span>Reminder</span>
          </div>
          <input
            type="datetime-local"
            className="detail-input"
            value={todo.reminderDate || ''}
            onChange={e => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { reminderDate: e.target.value || undefined } })}
          />
        </div>

        {/* Priority */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Flag size={14} />
            <span>Priority</span>
          </div>
          <div className="priority-options">
            {priorityOptions.map(opt => (
              <button
                key={opt.value}
                className={`priority-opt ${todo.priority === opt.value ? 'priority-opt--active' : ''}`}
                style={{ '--p': opt.color } as React.CSSProperties}
                onClick={() => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { priority: opt.value } })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Move to list */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Flag size={14} />
            <span>List</span>
          </div>
          <select
            className="detail-select"
            value={todo.listId}
            onChange={e => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { listId: e.target.value } })}
          >
            {state.lists.filter(l => !l.isSystem).map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Tag size={14} />
            <span>Tags</span>
          </div>
          <div className="tags-list">
            {todo.tags.map(tag => (
              <span key={tag} className="detail-tag">
                #{tag}
                <button onClick={() => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { tags: todo.tags.filter(t => t !== tag) } })}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="add-tag">
            <input
              className="add-tag-input"
              placeholder="Add tag..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="detail-section detail-section--grow">
          <div className="detail-section-header">
            <StickyNote size={14} />
            <span>Notes</span>
          </div>
          <textarea
            className="notes-input"
            placeholder="Add a note..."
            value={todo.notes}
            onChange={e => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { notes: e.target.value } })}
          />
        </div>
      </div>

      <div className="detail-footer">
        <span className="detail-created">
          Created {new Date(todo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button
          className="detail-delete"
          onClick={() => { dispatch({ type: 'DELETE_TODO', id: todo.id }); dispatch({ type: 'SELECT_TODO', id: null }); }}
        >
          <Trash2 size={14} />
          Delete task
        </button>
      </div>
    </aside>
  );
}
