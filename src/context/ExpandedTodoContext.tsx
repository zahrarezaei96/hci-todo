import { createContext, useContext, useState, ReactNode } from 'react';

interface ExpandedContextType {
  expandedId: string | null;
  toggleExpanded: (id: string) => void;
}

const ExpandedContext = createContext<ExpandedContextType | null>(null);

export function ExpandedTodoProvider({ children }: { children: ReactNode }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpanded(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <ExpandedContext.Provider value={{ expandedId, toggleExpanded }}>
      {children}
    </ExpandedContext.Provider>
  );
}

export function useExpanded() {
  const ctx = useContext(ExpandedContext);
  if (!ctx) throw new Error('useExpanded must be used within ExpandedTodoProvider');
  return ctx;
}
