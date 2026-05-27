import { useState } from 'react';
import { Todo, Priority } from '../types';
import { useStore } from '../store';
import {
  Star,
  Calendar,
  Flag,
  X,
  Plus,
  Trash2,
  Tag,
  StickyNote
} from 'lucide-react';

const priorityConfig: {
  value: Priority;
  label: string;
  color: string;
}[] = [
  { value: 'low', label: 'Low', color: '#4ade80' },
  { value: 'medium', label: 'Medium', color: '#fbbf24' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' },
];

interface Props {
  todo: Todo;
}

export function TodoItem({ todo }: Props) {

  const { dispatch } = useStore();

  const [expanded, setExpanded] = useState(false);

  const [newStep, setNewStep] = useState('');
  const [newTag, setNewTag] = useState('');

  const [editingText, setEditingText] = useState(false);
  const [textVal, setTextVal] = useState(todo.text);

  const p = priorityConfig.find(
    x => x.value === todo.priority
  )!;

  const isOverdue =
    todo.dueDate &&
    !todo.completed &&
    new Date(todo.dueDate) <
      new Date(new Date().toDateString());

  const completedSteps =
    todo.steps.filter(s => s.completed).length;

  function saveText() {

    if (textVal.trim()) {

      dispatch({
        type: 'UPDATE_TODO',
        id: todo.id,
        updates: {
          text: textVal.trim()
        }
      });

    }

    setEditingText(false);

  }

  function addStep() {

    if (!newStep.trim()) return;

    dispatch({
      type: 'ADD_STEP',
      todoId: todo.id,
      text: newStep.trim()
    });

    setNewStep('');

  }

  function addTag() {

    const tag = newTag
      .trim()
      .replace(/^#/, '');

    if (!tag || todo.tags.includes(tag)) return;

    dispatch({
      type: 'UPDATE_TODO',
      id: todo.id,
      updates: {
        tags: [...todo.tags, tag]
      }
    });

    setNewTag('');

  }

  return (

    <div
      data-todo-id={todo.id}
      className={`todo-item-wrap ${
        todo.completed
          ? 'todo-item-wrap--done'
          : ''
      } ${
        expanded
          ? 'todo-item-wrap--expanded'
          : ''
      }`}
      onClick={() => {

        if (!editingText) {
          setExpanded(!expanded);
        }

      }}
    >

      {/* MAIN ROW */}

      <div className="todo-row">

        {/* CHECK BUTTON */}

        <div
          data-gaze-check-area="true"
          style={{
            padding: '12px',
            marginLeft: '-12px',
            marginRight: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >

          <button
            data-check-button="true"
            className={`check-btn ${
              todo.completed
                ? 'check-btn--checked'
                : ''
            }`}
            onClick={(e) => {

              e.stopPropagation();

              dispatch({
                type: 'TOGGLE_TODO',
                id: todo.id
              });

            }}
            style={{
              '--p-color': p.color
            } as React.CSSProperties}
          >

            {todo.completed && (

              <svg
                width="10"
                height="8"
                viewBox="0 0 10 8"
                fill="none"
              >
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

            )}

          </button>

        </div>

        {/* BODY */}

        <div
          className="todo-body"
          onClick={(e) => {

            if (editingText) {
              e.stopPropagation();
            }

          }}
        >

          {editingText ? (

            <input
              className="todo-text-input"
              value={textVal}
              onChange={(e) => {

                setTextVal(e.target.value);

              }}
              onBlur={saveText}
              onKeyDown={(e) => {

                if (e.key === 'Enter') {
                  saveText();
                }

                if (e.key === 'Escape') {
                  setEditingText(false);
                }

              }}
              onClick={(e) => {

                e.stopPropagation();

              }}
              autoFocus
            />

          ) : (

            <span
              className={`todo-text ${
                todo.completed
                  ? 'todo-text--done'
                  : ''
              }`}
              onDoubleClick={(e) => {

                e.stopPropagation();

                setTextVal(todo.text);

                setEditingText(true);

              }}
            >

              {todo.text}

            </span>

          )}

          {/* META */}

          <div className="todo-meta">

            {todo.dueDate && (

              <span
                className={`meta-chip ${
                  isOverdue
                    ? 'meta-chip--overdue'
                    : ''
                }`}
              >

                <Calendar size={10} />

                {new Date(
                  todo.dueDate + 'T12:00:00'
                ).toLocaleDateString(
                  'en-US',
                  {
                    month: 'short',
                    day: 'numeric'
                  }
                )}

              </span>

            )}

            {todo.steps.length > 0 && (

              <span className="meta-chip">

                {completedSteps}/
                {todo.steps.length} steps

              </span>

            )}

            {todo.tags.map(tag => (

              <span
                key={tag}
                className="meta-tag"
              >

                #{tag}

              </span>

            ))}

            <span
              className="meta-priority"
              style={{
                color: p.color
              }}
            >

              <Flag size={9} />

              {p.label}

            </span>

          </div>

        </div>

        {/* STAR */}

        <button
          className={`star-btn ${
            todo.starred
              ? 'star-btn--active'
              : ''
          }`}
          onClick={(e) => {

            e.stopPropagation();

            dispatch({
              type: 'TOGGLE_STAR',
              id: todo.id
            });

          }}
        >

          <Star
            size={15}
            fill={
              todo.starred
                ? 'currentColor'
                : 'none'
            }
          />

        </button>

      </div>

      {/* DETAIL */}

      {expanded && (

        <div
          className="todo-detail"
          onClick={(e) => {

            e.stopPropagation();

          }}
        >

          {/* STEPS */}

          <div className="td-section">

            <div className="td-section-header">

              <span>Steps</span>

              {todo.steps.length > 0 && (

                <span className="td-count">

                  {completedSteps}/
                  {todo.steps.length}

                </span>

              )}

            </div>

            {todo.steps.map(step => (

              <div
                key={step.id}
                className={`step-item ${
                  step.completed
                    ? 'step-item--done'
                    : ''
                }`}
              >

                <button
                  className={`step-check ${
                    step.completed
                      ? 'step-check--checked'
                      : ''
                  }`}
                  onClick={() => {

                    dispatch({
                      type: 'TOGGLE_STEP',
                      todoId: todo.id,
                      stepId: step.id
                    });

                  }}
                />

                <span className="step-text">

                  {step.text}

                </span>

                <button
                  className="step-delete"
                  onClick={() => {

                    dispatch({
                      type: 'DELETE_STEP',
                      todoId: todo.id,
                      stepId: step.id
                    });

                  }}
                >

                  <X size={11} />

                </button>

              </div>

            ))}

            <div className="add-step">

              <Plus size={13} />

              <input
                className="add-step-input"
                placeholder="Add a step..."
                value={newStep}
                onChange={(e) => {

                  setNewStep(e.target.value);

                }}
                onKeyDown={(e) => {

                  if (e.key === 'Enter') {
                    addStep();
                  }

                }}
              />

            </div>

          </div>

        </div>

      )}

    </div>

  );

}