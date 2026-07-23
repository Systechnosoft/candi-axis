'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/primitives/Button';
import { FileText, Keyboard } from 'lucide-react';
import Link from 'next/link';

export default function CandidateIntakeSelectorPage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'manual' | 'parsed' | null>(null);

  const handleNext = () => {
    if (!selectedMode) return;
    if (selectedMode === 'manual') {
      router.push('/candidates/intake/manual');
    } else {
      router.push('/candidates/intake/parsed');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-6 border-b border-border bg-surface">
        <h1 className="text-2xl font-semibold text-text-primary">Add Candidate</h1>
        <p className="text-sm text-text-secondary mt-1">Select an intake method to get started.</p>
      </div>

      <div className="p-6 flex-1 max-w-4xl mx-auto w-full pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Card: Manual Entry */}
          <div 
            onClick={() => setSelectedMode('manual')}
            className={`
              cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 
              flex flex-col items-start gap-4 hover:border-brand-light hover:shadow-sm
              ${selectedMode === 'manual' ? 'border-brand bg-brand-50 shadow-sm' : 'border-border bg-surface'}
            `}
          >
            <div className={`p-3 rounded-lg ${selectedMode === 'manual' ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-text-secondary'}`}>
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">Manual Entry</h3>
              <p className="text-sm text-text-secondary">Create a candidate by entering details manually using the standard form.</p>
            </div>
          </div>

          {/* Card: Resume Parse */}
          <div 
            onClick={() => setSelectedMode('parsed')}
            className={`
              cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 
              flex flex-col items-start gap-4 hover:border-brand-light hover:shadow-sm
              ${selectedMode === 'parsed' ? 'border-brand bg-brand-50 shadow-sm' : 'border-border bg-surface'}
            `}
          >
            <div className={`p-3 rounded-lg ${selectedMode === 'parsed' ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-text-secondary'}`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">Upload Resume & Parse</h3>
              <p className="text-sm text-text-secondary">Upload a resume, extract fields automatically with AI, review, then continue.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border mt-auto">
          <Link href="/candidates">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button 
            variant="primary" 
            disabled={!selectedMode} 
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
