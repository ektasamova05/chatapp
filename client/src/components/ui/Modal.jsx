import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, size = 'md', hideClose = false }) => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-4xl',
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className={`card w-full ${sizes[size]} animate-bounce-in`}
        onClick={e => e.stopPropagation()}
      >
        {(title || !hideClose) && (
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            {title && <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>}
            {!hideClose && (
              <button onClick={onClose} className="p-1.5 hover:bg-[var(--hover)] rounded-lg transition-colors ml-auto">
                <X size={18} className="text-[var(--muted)]" />
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
