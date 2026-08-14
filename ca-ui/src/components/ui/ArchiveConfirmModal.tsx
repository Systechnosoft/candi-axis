import React from 'react';
import { Loader2 } from 'lucide-react';
import { ModalShell } from '../primitives/ModalShell';
import { Button } from '../primitives/Button';

interface ArchiveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  isArchiving?: boolean; // True for archive, false for unarchive
  saving?: boolean;
}

export const ArchiveConfirmModal: React.FC<ArchiveConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  isArchiving = true,
  saving = false,
}) => {
  if (!isOpen) return null;

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      className="max-w-md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            className={isArchiving ? "bg-danger hover:bg-danger/90 border-danger text-white" : ""} 
            onClick={onConfirm} 
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isArchiving ? 'Archive' : 'Unarchive')}
          </Button>
        </div>
      }
    >
      <div className="text-text-primary text-sm py-4">
        Are you sure you want to {isArchiving ? 'archive' : 'unarchive'} &quot;{itemName}&quot;?
      </div>
    </ModalShell>
  );
};
