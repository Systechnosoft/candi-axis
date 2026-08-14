import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModalShell({ title, children, footer, onClose, className }: { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose?: () => void; className?: string }) {
  return (
    <div 
      className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className={cn("bg-surface w-full max-w-lg rounded-md shadow-lg flex flex-col max-h-[90vh]", className)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md border border-brand text-brand hover:bg-brand/10 transition-colors focus:outline-none focus:ring-1 focus:ring-brand focus:ring-offset-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-subtle flex justify-end gap-3 rounded-b-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function DrawerShell({ title, children, footer, onClose, className }: { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose?: () => void; className?: string }) {
  return (
    <div 
      className="fixed inset-0 z-50 bg-foreground/50 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className={cn("bg-surface w-full max-w-md h-full shadow-xl flex flex-col border-l border-border animate-in slide-in-from-right", className)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-subtle/50">
          <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md border border-brand text-brand hover:bg-brand/10 transition-colors focus:outline-none focus:ring-1 focus:ring-brand focus:ring-offset-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-surface flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function DrawerShell80({ title, children, footer, onClose, className }: { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose?: () => void; className?: string }) {
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setActive(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setActive(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs flex justify-end transition-opacity duration-300",
        active ? "opacity-100" : "opacity-0"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className={cn(
          "bg-surface w-[80vw] h-full shadow-2xl flex flex-col border-l border-border transform transition-transform duration-300 ease-out", 
          active ? "translate-x-0" : "translate-x-full",
          className
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-subtle/50 shrink-0">
          <h2 className="text-[16px] font-bold text-text-primary">{title}</h2>
          <button onClick={handleClose} className="p-1 rounded-md border border-brand text-brand hover:bg-brand/10 transition-colors focus:outline-none focus:ring-1 focus:ring-brand focus:ring-offset-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-surface flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
