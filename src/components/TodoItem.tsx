import { useState, useEffect, useRef } from 'react';
import { Todo, Priority } from '../types';
import { useStore } from '../store';
import { Star, Calendar, Flag, X, Plus, Trash2, Tag, StickyNote } from 'lucide-react';
import { useGaze } from '../modules/gaze/GazeContext';
import { GazeProgress } from '../modules/gaze/GazeProgress';

const priorityConfig: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

interface Props { todo: Todo; }

export function TodoItem({ todo }: Props) {
  const { dispatch } = useStore();
  const { enabled, registerTarget, getProgress } = useGaze();
  const [expanded, setExpanded] = useState(false);
  const [newStep, setNewStep] = useState('');
  const [newTag, setNewTag] = useState('');
  const [editingText, setEditingText] = useState(false);
  const [textVal, setTextVal] = useState(todo.text);

  const gazeExpandId = `todo-expand-${todo.id}`;
  const gazeCheckId = `todo-check-${todo.id}`;

  // Register gaze targets
  useEffect(() => {
    if (!enabled) return;
    const u1 = registerTarget(gazeExpandId, () => setExpanded(true));
    const u2 = registerTarget(gazeCheckId, () => dispatch({ type: 'TOGGLE_TODO', id: todo.id }));
    return () => { u1(); u2(); };
  }, [enabled, todo.id]);

  const expandProgress = getProgress(gazeExpandId);
  const checkProgress = getProgress(gazeCheckId);

  const p = priorityConfig.find(x => x.value === todo.priority)!;
  const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date(new Date().toDateString());
  const completedSteps = todo.steps.filter(s => s.completed).length;

  function saveText() {
    if (textVal.trim()) dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { text: textVal.trim() } });
    setEditingText(false);
  }

  function addStep() {
    if (!newStep.trim()) return;
    dispatch({ type: 'ADD_STEP', todoId: todo.id, text: newStep.trim() });
    setNewStep('');
  }

  function addTag() {
    const tag = newTag.trim().replace(/^#/, '');
    if (!tag || todo.tags.includes(tag)) return;
    dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { tags: [...todo.tags, tag] } });
    setNewTag('');
  }

  return (
    <div
      className={`todo-item-wrap ${todo.completed ? 'todo-item-wrap--done' : ''} ${expanded ? 'todo-item-wrap--expanded' : ''}`}
      onClick={() => !editingText && setExpanded(!expanded)}
    >
      <div className="todo-row">
        {/* Check button with gaze */}
        <div
          data-gaze-id={gazeCheckId}
          style={{ position: 'relative', flexShrink: 0 }}
        >
          <button
            className={`check-btn ${todo.completed ? 'check-btn--checked' : ''}`}
            onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_TODO', id: todo.id }); }}
            style={{ '--p-color': p.color } as React.CSSProperties}
          >
            {todo.completed && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          {enabled && <GazeProgress progress={checkProgress} size={32} color="#4ade80" />}
        </div>

        {/* Task body with gaze expand */}
        <div
          className="todo-body"
          data-gaze-id={gazeExpandId}
          style={{ position: 'relative' }}
          onClick={e => editingText && e.stopPropagation()}
        >
          {editingText ? (
            <input
              className="todo-text-input"
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              onBlur={saveText}
              onKeyDown={e => { if (e.key === 'Enter') saveText(); if (e.key === 'Escape') setEditingText(false); }}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              className={`todo-text ${todo.completed ? 'todo-text--done' : ''}`}
              onDoubleClick={e => { e.stopPropagation(); setTextVal(todo.text); setEditingText(true); }}
            >
              {todo.text}
            </span>
          )}
          <div className="todo-meta">
            {todo.dueDate && (
              <span className={`meta-chip ${isOverdue ? 'meta-chip--overdue' : ''}`}>
                <Calendar size={10} />
                {new Date(todo.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {todo.steps.length > 0 && (
              <span className="meta-chip">{completedSteps}/{todo.steps.length} steps</span>
            )}
            {todo.tags.map(tag => <span key={tag} className="meta-tag">#{tag}</span>)}
            <span className="meta-priority" style={{ color: p.color }}>
              <Flag size={9} />{p.label}
            </span>
          </div>
          {/* Gaze progress overlay on task body */}
          {enabled && expandProgress > 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: `rgba(0,120,212,${expandProgress * 0.08})`,
              borderRadius: 8,
              pointerEvents: 'none',
              transition: 'background 0.05s',
            }} />
          )}
        </div>

        <button
          className={`star-btn ${todo.starred ? 'star-btn--active' : ''}`}
          onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_STAR', id: todo.id }); }}
        >
          <Star size={15} fill={todo.starred ? 'currentColor' : 'none'} />
        </button>
      </div>

      {expanded && (
        <div className="todo-detail" onClick={e => e.stopPropagation()}>
          <div className="td-section">
            <div className="td-section-header">
              <span>Steps</span>
              {todo.steps.length > 0 && <span className="td-count">{completedSteps}/{todo.steps.length}</span>}
            </div>
            {todo.steps.map(step => (
              <div key={step.id} className={`step-item ${step.completed ? 'step-item--done' : ''}`}>
                <button className={`step-check ${step.completed ? 'step-check--checked' : ''}`}
                  onClick={() => dispatch({ type: 'TOGGLE_STEP', todoId: todo.id, stepId: step.id })} />
                <span className="step-text">{step.text}</span>
                <button className="step-delete"
                  onClick={() => dispatch({ type: 'DELETE_STEP', todoId: todo.id, stepId: step.id })}>
                  <X size={11} />
                </button>
              </div>
            ))}
            <div className="add-step">
              <Plus size={13} />
              <input className="add-step-input" placeholder="Add a step..."
                value={newStep} onChange={e => setNewStep(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addStep(); }} />
            </div>
          </div>

          <div className="td-section">
            <div className="td-section-header"><Flag size={12} /><span>Priority</span></div>
            <div className="priority-pills">
              {priorityConfig.map(opt => (
                <button key={opt.value}
                  className={`priority-pill ${todo.priority === opt.value ? 'priority-pill--active' : ''}`}
                  style={{ '--p': opt.color } as React.CSSProperties}
                  onClick={() => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { priority: opt.value } })}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="td-section">
            <div className="td-section-header"><Calendar size={12} /><span>Due date</span></div>
            <input type="date" className="detail-input" value={todo.dueDate || ''}
              onChange={e => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { dueDate: e.target.value || undefined } })} />
          </div>

          <div className="td-section">
            <div className="td-section-header"><Tag size={12} /><span>Tags</span></div>
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
            <input className="add-tag-input" placeholder="Add tag..." value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(); }} />
          </div>

          <div className="td-section">
            <div className="td-section-header"><StickyNote size={12} /><span>Notes</span></div>
            <textarea className="notes-input" placeholder="Add a note..." value={todo.notes} rows={2}
              onChange={e => dispatch({ type: 'UPDATE_TODO', id: todo.id, updates: { notes: e.target.value } })} />
          </div>

          <div className="td-footer">
            <span className="detail-created">
              Created {new Date(todo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button className="detail-delete"
              onClick={() => dispatch({ type: 'DELETE_TODO', id: todo.id })}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
