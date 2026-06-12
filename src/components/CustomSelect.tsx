import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface Props {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  id?: string;
}

export function CustomSelect({ options, value, onChange, placeholder = 'Select...', id }: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => String(o.value) === String(value));

  // Track open state globally for hand scroll
  useEffect(() => {
    if (open) {
      (window as any).__openDropdownRef = listRef;
    } else {
      if ((window as any).__openDropdownRef === listRef) {
        (window as any).__openDropdownRef = null;
      }
    }
    return () => {
      if ((window as any).__openDropdownRef === listRef) {
        (window as any).__openDropdownRef = null;
      }
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Scroll highlighted into view
  useEffect(() => {
    if (open && highlighted !== null) {
      const el = listRef.current?.querySelector(`[data-value="${highlighted}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, open]);

  // Scroll to selected when opened
  useEffect(() => {
    if (open && value) {
      setTimeout(() => {
        const el = listRef.current?.querySelector(`[data-value="${value}"]`);
        el?.scrollIntoView({ block: 'center' });
      }, 50);
    }
  }, [open]);

  return (
    <div
      ref={containerRef}
      id={id}
      data-custom-select="true"
      data-open={open ? 'true' : 'false'}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1.5px solid ${open ? '#0078d4' : '#edebe9'}`,
          borderRadius: 8,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 14,
          cursor: 'pointer',
          color: selected ? '#201f1e' : '#a19f9d',
          fontFamily: 'inherit',
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1.5px solid #0078d4',
            borderRadius: 8,
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 99999,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
            marginBottom: 4,
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              data-value={opt.value}
              data-select-option="true"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onMouseEnter={() => setHighlighted(opt.value)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 14,
                background: String(opt.value) === String(value)
                  ? '#deecf9'
                  : highlighted === opt.value ? '#f3f2f1' : 'white',
                color: '#201f1e',
                fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
