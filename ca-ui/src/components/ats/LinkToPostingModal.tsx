'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { Loader2, Search, Briefcase, X } from 'lucide-react';
import { jobPostingsApi } from '@/lib/api/job-postings';
import { ApplicationsService } from '@/lib/api/applications';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface LinkToPostingModalProps {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
}

export function LinkToPostingModal({ candidateId, candidateName, onClose }: LinkToPostingModalProps) {
  const router = useRouter();
  const [postings, setPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPostings = async () => {
      try {
        const data = await jobPostingsApi.getJobPostings();
        // Only show active postings
        const activePostings = data.filter((p: any) => p.is_active);
        setPostings(activePostings);
      } catch {
        toast.error('Failed to load active job postings');
      } finally {
        setLoading(false);
      }
    };
    fetchPostings();
  }, []);

  const filteredPostings = postings.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.jd_title?.toLowerCase().includes(search.toLowerCase()) ||
    p.jd_code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLink = async (postingId: string, jdId: string, postingName: string) => {
    if (!jdId) {
      toast.error('This posting does not have an associated Job Description.');
      return;
    }
    setSubmitting(true);
    try {
      const app = await ApplicationsService.createApplication({
        candidate_id: candidateId,
        jd_id: jdId,
        job_posting_id: postingId,
        source: 'manual'
      });
      toast.success(`Candidate added to posting "${postingName}" successfully`);
      onClose();
      router.push(`/applications/${app.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add candidate to posting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-6 border-b border-border bg-surface sticky top-0 z-10 rounded-t-xl">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Add to Job Posting</h3>
              <p className="text-sm text-text-secondary mt-1">Select a posting for <span className="font-semibold text-brand">{candidateName}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-subtle rounded-full transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          <div className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search postings by name or job title..." 
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto flex flex-col gap-2 pr-2">
              {loading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand" />
                  <p className="text-sm text-text-muted mt-2">Fetching open postings...</p>
                </div>
              ) : filteredPostings.length === 0 ? (
                <div className="text-center py-12 text-text-muted border-2 border-dashed border-border rounded-xl">
                  No matching open postings found.
                </div>
              ) : (
                filteredPostings.map(p => (
                  <button 
                    key={p.id}
                    disabled={submitting}
                    onClick={() => handleLink(p.id, p.jd_id, p.name)}
                    className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-brand hover:bg-brand/5 text-left transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted group-hover:text-brand group-hover:border-brand/20 transition-colors">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-text-primary group-hover:text-brand transition-colors">{p.name}</h4>
                        {p.jd_title && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            Job: <span className="font-medium">{p.jd_title}</span> {p.jd_code ? `(${p.jd_code})` : ''}
                          </p>
                        )}
                        {p.description && (
                          <p className="text-xs text-text-muted mt-1 italic line-clamp-1">{p.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <div className="bg-brand text-surface text-[10px] font-bold px-2 py-1 rounded">ADD</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="p-6 border-t border-border bg-subtle/50 flex justify-end rounded-b-xl">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
