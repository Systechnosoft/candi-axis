import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, FileX, Lock } from 'lucide-react';
import { Button } from './Button';

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full h-full min-h-[200px] flex items-center justify-center bg-subtle/50 rounded-md", className)}>
      <Loader2 className="w-6 h-6 animate-spin text-brand" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-strong-border rounded-md bg-subtle/50">
      <FileX className="w-10 h-10 text-text-muted mb-4" />
      <h3 className="text-[16px] font-medium text-text-primary">{title}</h3>
      {description && <p className="text-[14px] text-text-secondary mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-status-error/20 rounded-md bg-status-error/5">
      <AlertCircle className="w-10 h-10 text-status-error mb-4" />
      <h3 className="text-[16px] font-medium text-text-primary">{title}</h3>
      {message && <p className="text-[14px] text-text-secondary mt-1 max-w-md">{message}</p>}
      {onRetry && <Button variant="secondary" onClick={onRetry} className="mt-4">Try Again</Button>}
    </div>
  );
}

export function PermissionDeniedState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-border rounded-md bg-surface">
      <Lock className="w-10 h-10 text-text-muted mb-4" />
      <h3 className="text-[16px] font-medium text-text-primary">Permission Denied</h3>
      <p className="text-[14px] text-text-secondary mt-1 max-w-sm">You do not have the required permissions to view this content.</p>
    </div>
  );
}
