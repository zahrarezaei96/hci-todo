import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Sun, Star, Calendar, List, Plus, Trash2, X, Pencil } from 'lucide-react';
import { useGaze } from '../modules/gaze/GazeContext';
import { GazeProgress } from '../modules/gaze/GazeProgress';

const iconMap: Record<string, React.ReactNode> = {
  '☀️': <Sun size={16} />, '⭐': <Star size={16} />,
  '📅': <Calendar size={16} />, '📋': <List size={16} />,
};

interface Profile { name: string; gender: 'male' | 'female'; birthday: string; avatar: string; }
interface Props { profile: Profile; onProfileChange: (p: Profile) => void; }

export function Sidebar({ profile, onProfileChange }: Props) {
  const { state, dispatch, getListCount } = useStore();
  const { enabled, registerTarget, getProgress } = useGaze();

  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.name);

  const systemLists = state.lists.filter(l => l.isSystem);
  const userLists   = state.lists.filter(l => !l.isSystem);

  // Gaze IDs
  const G_PROFILE      = 'sidebar-edit-profile';
  const G_NEW_LIST     = 'sidebar-new-list';
  const G_LIST_CONFIRM = 'sidebar-list-confirm';
  const G_LIST_CANCEL  = 'sidebar-list-cancel';
  const navGazeId      = (id: string) => `sidebar-nav-${id}`;

  useEffect(() => {
    if (!enabled) return;
    const unsubs = [
      registerTarget(G_PROFILE,      () => { setEditName(profile.name); setEditingProfile(true); }),
      registerTarget(G_NEW_LIST,      () => setShowNewList(true)),
      registerTarget(G_LIST_CONFIRM,  () => addList()),
      registerTarget(G_LIST_CANCEL,   () => setShowNewList(false)),
      // System lists
      ...state.lists.map(list =>
        registerTarget(navGazeId(list.id), () =>
          dispatch({ type: 'SET_ACTIVE_LIST', listId: list.id })
        )
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [enabled, profile.name, state.lists.length]);

  function addList() {
    if (!newListName.trim()) return;
    dispatch({ type: 'ADD_LIST', list: { name: newListName.trim(), icon: '📝', color: '#0078d4' } });
    setNewListName(''); setShowNewList(false);
  }

  function saveProfileName() {
    if (editName.trim()) onProfileChange({ ...profile, name: editName.trim() });
    setEditingProfile(false);
  }

  const age = profile.birthday
    ? Math.floor((Date.now() - new Date(profile.birthday).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <aside className={`sidebar ${state.sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
      <div className="sidebar-header">
        <div className="sb-avatar">{profile.avatar}</div>
        <div className="user-info">
          {editingProfile ? (
            <input
              className="user-name-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={saveProfileName}
              onKeyDown={e => { if (e.key === 'Enter') saveProfileName(); if (e.key === 'Escape') setEditingProfile(false); }}
              autoFocus
            />
          ) : (
            <div data-gaze-id={G_PROFILE} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <span className="user-name" onClick={() => { setEditName(profile.name); setEditingProfile(true); }}>
                {profile.name}
                <Pencil size={11} className="user-name-edit" />
              </span>
              {enabled && <GazeProgress progress={getProgress(G_PROFILE)} size={28} color="#0078d4" />}
            </div>
          )}
          <span className="user-sub">
            {profile.gender === 'male' ? 'He/Him' : 'She/Her'}
            {age !== null ? ` · ${age}y` : ''}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {systemLists.map(list => {
            const count = getListCount(list.id);
            const gId   = navGazeId(list.id);
            return (
              <div key={list.id} data-gaze-id={gId} style={{ position: 'relative' }}>
                <button
                  className={`nav-item ${state.activeListId === list.id ? 'nav-item--active' : ''}`}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_LIST', listId: list.id })}
                  style={{ '--accent': list.color } as React.CSSProperties}
                >
                  <span className="nav-icon">{iconMap[list.icon] || list.icon}</span>
                  <span className="nav-label">{list.name}</span>
                  {count > 0 && <span className="nav-count">{count}</span>}
                </button>
                {enabled && <GazeProgress progress={getProgress(gId)} size={32} />}
              </div>
            );
          })}
        </div>

        {userLists.length > 0 && (
          <div className="nav-section">
            <span className="nav-section-title">My Lists</span>
            {userLists.map(list => {
              const count = getListCount(list.id);
              const gId   = navGazeId(list.id);
              return (
                <div key={list.id} data-gaze-id={gId} style={{ position: 'relative' }}>
                  <button
                    className={`nav-item ${state.activeListId === list.id ? 'nav-item--active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_ACTIVE_LIST', listId: list.id })}
                    style={{ '--accent': list.color } as React.CSSProperties}
                  >
                    <span className="nav-icon nav-icon--emoji">{list.icon}</span>
                    <span className="nav-label">{list.name}</span>
                    {count > 0 && <span className="nav-count">{count}</span>}
                    <button className="nav-delete"
                      onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_LIST', id: list.id }); }}>
                      <Trash2 size={12} />
                    </button>
                  </button>
                  {enabled && <GazeProgress progress={getProgress(gId)} size={32} />}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        {showNewList ? (
          <div className="new-list-form">
            <input
              className="new-list-input"
              placeholder="List name..."
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addList(); if (e.key === 'Escape') setShowNewList(false); }}
              autoFocus
            />
            <div className="new-list-actions">

              {/* Confirm */}
              <div data-gaze-id={G_LIST_CONFIRM} style={{ position: 'relative' }}>
                <button className="btn-create" onClick={addList}>Create</button>
                {enabled && <GazeProgress progress={getProgress(G_LIST_CONFIRM)} size={32} color="#0078d4" />}
              </div>

              {/* Cancel */}
              <div data-gaze-id={G_LIST_CANCEL} style={{ position: 'relative' }}>
                <button className="btn-cancel-sm" onClick={() => setShowNewList(false)}>
                  <X size={14} />
                </button>
                {enabled && <GazeProgress progress={getProgress(G_LIST_CANCEL)} size={28} color="#ef4444" />}
              </div>

            </div>
          </div>
        ) : (
          <div data-gaze-id={G_NEW_LIST} style={{ position: 'relative' }}>
            <button className="new-list-btn" onClick={() => setShowNewList(true)}>
              <Plus size={16} /> New list
            </button>
            {enabled && <GazeProgress progress={getProgress(G_NEW_LIST)} size={32} color="#0078d4" />}
          </div>
        )}
      </div>
    </aside>
  );
}
