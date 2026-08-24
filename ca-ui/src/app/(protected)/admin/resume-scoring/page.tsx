'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { ModalShell } from '@/components/primitives/ModalShell';
import { AdminService } from '@/lib/api/admin';
import { Loader2, Award, RefreshCw, Save, CheckCircle2, AlertCircle } from 'lucide-react';

const DEFAULT_WEIGHTS: Record<string, number> = {
  contact: 5,
  summary: 5,
  experience: 20,
  skills: 15,
  progression: 10,
  achievements: 20,
  readability: 10,
  grammar: 10,
  social: 5,
};

const SECTIONS_CONFIG = [
  {
    key: 'experience',
    title: 'Work Experience',
    description: 'Years of experience, number of roles held, seniority level of titles, and gaps or overlaps in employment.',
    min: 0,
    max: 50,
  },
  {
    key: 'achievements',
    title: 'Quantified Achievements',
    description: 'Presence of metrics, percentages, dollar values, and numeric indicators in work experience bullet points and projects.',
    min: 0,
    max: 50,
  },
  {
    key: 'skills',
    title: 'Skills & Tags',
    description: 'Quantity and density of skills and relevant keyword tags matched on the candidate profile.',
    min: 0,
    max: 50,
  },
  {
    key: 'progression',
    title: 'Career Progression',
    description: 'Evidence of career advancement, title changes indicating promotions, and educational levels.',
    min: 0,
    max: 50,
  },
  {
    key: 'readability',
    title: 'Readability & Ease',
    description: 'Flesch Reading Ease readability index of the overall resume text.',
    min: 0,
    max: 50,
  },
  {
    key: 'contact',
    title: 'Contact Details',
    description: 'Completeness of candidate metadata including full name, email, phone number, and physical location.',
    min: 0,
    max: 30,
  },
  {
    key: 'summary',
    title: 'Professional Summary',
    description: 'Presence of a professional summary section and its general structure/readability.',
    min: 0,
    max: 30,
  },
  {
    key: 'grammar',
    title: 'Grammar & Spelling',
    description: 'Spelling accuracy and absence of writing errors throughout the candidate profile.',
    min: 0,
    max: 30,
  },
  {
    key: 'social',
    title: 'Social & Web Presence',
    description: 'Presence of professional social profiles such as LinkedIn and GitHub links.',
    min: 0,
    max: 30,
  },
];

export default function ResumeScoringSettingsPage() {
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    async function loadWeights() {
      try {
        setLoading(true);
        setError(null);
        const data = await AdminService.getScoringWeights();
        if (data && typeof data === 'object') {
          // Merge with default weights to ensure all keys are present
          const merged = { ...DEFAULT_WEIGHTS };
          Object.keys(DEFAULT_WEIGHTS).forEach(key => {
            if (typeof data[key] === 'number') {
              merged[key] = data[key];
            }
          });
          setWeights(merged);
        } else {
          setWeights(DEFAULT_WEIGHTS);
        }
      } catch (err: any) {
        console.error('Failed to load scoring weights:', err);
        setError('Failed to load scoring weights. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadWeights();
  }, []);

  const handleWeightChange = (key: string, value: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: value
    }));
    // Clear status
    setSuccess(null);
  };

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const confirmReset = () => {
    setWeights(DEFAULT_WEIGHTS);
    setSuccess(null);
    setIsResetModalOpen(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await AdminService.updateScoringWeights(weights);
      setSuccess('Resume scoring weights successfully updated!');
    } catch (err: any) {
      console.error('Failed to save weights:', err);
      setError(err?.response?.data?.message || 'Failed to update scoring weights.');
    } finally {
      setSaving(false);
    }
  };

  // Compute total weights sum
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-surface items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <span className="mt-4 text-text-muted">Loading scoring settings...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      <PageHeader 
        title="Resume Scoring Settings" 
        description="Customize the relative importance (weightage) of profile sections in candidate resume parsing and scoring."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleReset} className="flex items-center gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={saving || totalWeight !== 100} title={totalWeight !== 100 ? 'Total weight must sum to exactly 100' : undefined} className="flex items-center gap-2 text-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Weights
            </Button>
          </div>
        }
      />

      {error && (
        <div className="bg-status-error/10 text-status-error border border-status-error/20 rounded-lg p-4 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-status-success/10 text-status-success border border-status-success/20 rounded-lg p-4 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Sum Indicator */}
      <Card className={`p-4 border shadow-sm transition-all duration-300 ${
        totalWeight === 100 
          ? 'border-status-success/30 bg-status-success/5' 
          : 'border-amber-300/30 bg-amber-500/5'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              totalWeight === 100 
                ? 'bg-status-success/10 text-status-success' 
                : 'bg-amber-500/10 text-amber-500'
            }`}>
              {totalWeight === 100 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">
                {totalWeight === 100 ? 'Weights Allocation Valid' : 'Invalid Weights Allocation'}
              </h4>
              <p className="text-xs text-text-secondary">
                {totalWeight === 100 
                  ? 'The total sum of weights is exactly 100. You can now save your changes.' 
                  : `Weights must sum to exactly 100 to save (current sum is ${totalWeight}). Adjust individual sliders accordingly.`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-text-muted font-semibold tracking-wider block">Sum of current weights</span>
            <span className={`text-2xl font-extrabold ${totalWeight === 100 ? 'text-status-success' : 'text-amber-500'}`}>
              {totalWeight} / 100
            </span>
          </div>
        </div>
      </Card>

      {/* Sliders List */}
      <div className="space-y-4">
        {SECTIONS_CONFIG.map(section => {
          const val = weights[section.key] ?? DEFAULT_WEIGHTS[section.key];
          const isDefault = val === DEFAULT_WEIGHTS[section.key];
          return (
            <Card key={section.key} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-brand/30 transition-all duration-200">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-text-primary">{section.title}</h4>
                  {isDefault && (
                    <span className="text-[10px] text-text-muted bg-subtle px-1.5 py-0.5 rounded font-medium border border-border/40 select-none">
                      Default: {DEFAULT_WEIGHTS[section.key]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
                  {section.description}
                </p>
              </div>

              <div className="flex items-center gap-4 w-full md:w-64 shrink-0">
                <input 
                  type="range" 
                  min={section.min} 
                  max={section.max} 
                  value={val}
                  onChange={(e) => handleWeightChange(section.key, parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-brand"
                />
                <div className="flex items-center gap-1 shrink-0 select-none">
                  <input 
                    type="number" 
                    min={section.min} 
                    max={section.max} 
                    value={val}
                    onChange={(e) => {
                      const v = Math.min(section.max, Math.max(section.min, parseInt(e.target.value, 10) || 0));
                      handleWeightChange(section.key, v);
                    }}
                    className="w-16 px-2 py-1 text-center text-sm font-semibold rounded border border-border bg-surface text-text-primary focus:ring-1 focus:ring-brand outline-none"
                  />
                  <span className="text-xs text-text-muted font-bold">pts</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {isResetModalOpen && (
        <ModalShell
          title="Reset to Defaults"
          onClose={() => setIsResetModalOpen(false)}
          footer={
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmReset} className="bg-brand text-white hover:bg-brand/90">
                OK
              </Button>
            </div>
          }
        >
          <div className="text-sm text-text-secondary">
            Are you sure you want to reset all weights to system defaults?
          </div>
        </ModalShell>
      )}
    </div>
  );
}
