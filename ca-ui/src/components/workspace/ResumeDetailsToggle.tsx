'use client';

import React from 'react';
import { User, FileText } from 'lucide-react';

interface ResumeDetailsToggleProps {
  activeView: 'details' | 'resume';
  onViewChange: (view: 'details' | 'resume') => void;
}

export const ResumeDetailsToggle: React.FC<ResumeDetailsToggleProps> = ({
  activeView,
  onViewChange,
}) => {
  return (
    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 select-none">
      <button
        onClick={() => onViewChange('details')}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
          ${
            activeView === 'details'
              ? 'bg-white text-brand shadow-sm border border-slate-200'
              : 'text-text-muted hover:text-text-primary'
          }`}
      >
        <User className="w-3.5 h-3.5" />
        Candidate Details
      </button>
      <button
        onClick={() => onViewChange('resume')}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
          ${
            activeView === 'resume'
              ? 'bg-white text-brand shadow-sm border border-slate-200'
              : 'text-text-muted hover:text-text-primary'
          }`}
      >
        <FileText className="w-3.5 h-3.5" />
        Resume (PDF)
      </button>
    </div>
  );
};
