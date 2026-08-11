'use client';

import React, { useState, useEffect } from 'react';
import { ListPage } from '@/components/templates/ListPage';
import { FilterBar } from '@/components/primitives/FilterBar';
import { InterviewRoundCard } from '@/components/ats/InterviewRoundCard';
import { InterviewsService } from '@/lib/api/interviews';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchInterviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await InterviewsService.getInterviews({ search });
        setInterviews(data || []);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load interviews.');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchInterviews, 300);
    return () => clearTimeout(timer);
  }, [search]);



  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  };

  const mapStatus = (status?: string): 'Scheduled' | 'Completed' | 'Feedback pending' => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'Completed';
    if (s === 'feedback_pending' || s === 'feedback pending') return 'Feedback pending';
    return 'Scheduled';
  };

  return (
    <ListPage 
      title="Interviews" 
      filterBar={<FilterBar searchValue={search} onSearchChange={setSearch} />}
    >
      <div className="space-y-4 max-w-3xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-xl w-full">
            <Loader2 className="w-8 h-8 animate-spin text-brand mb-2" />
            <span className="text-text-muted text-sm">Loading interviews...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 bg-surface border border-border rounded-xl w-full">
            <AlertCircle className="w-8 h-8 text-error mb-2" />
            <span className="text-error text-sm">{error}</span>
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-subtle/10">
            <p className="text-text-secondary text-sm font-medium">No interviews scheduled.</p>
          </div>
        ) : (
          interviews.map((item) => (
            <InterviewRoundCard 
              key={item.interview_id || item.application_id}
              title={`${item.round_type || 'Interview'} - ${item.candidate_name || 'Candidate'}`}
              interviewer={item.interviewer_names || 'Assigned Interviewer'}
              scheduledBy={item.scheduled_by_name || 'System / Auto'}
              date={formatDate(item.scheduled_start_utc)}
              time={formatTime(item.scheduled_start_utc)}
              status={mapStatus(item.interview_status)}
            />
          ))
        )}
      </div>
    </ListPage>
  );
}

