'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { FilterBar } from '@/components/primitives/FilterBar';
import { InterviewsService } from '@/lib/api/interviews';
import { Loader2, AlertCircle, Search, Download, FilterX, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TablePagination } from '@/components/primitives/TablePagination';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchInterviews = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await InterviewsService.getInterviews({ search });
      setInterviews(data || []);
      setPage(1); // Reset page on filter changes
    } catch (err: any) {
      console.error(err);
      setError('Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchInterviews, 300);
    return () => clearTimeout(timer);
  }, [fetchInterviews]);

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  };

  const mapStatus = (status?: string): 'Scheduled' | 'Completed' | 'Feedback pending' => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'Completed';
    if (s === 'feedback_pending' || s === 'feedback pending') return 'Feedback pending';
    return 'Scheduled';
  };

  const getStatusBadge = (rawStatus?: string) => {
    const status = mapStatus(rawStatus);
    switch (status) {
      case 'Completed': return <Badge variant="success">Completed</Badge>;
      case 'Feedback pending': return <Badge variant="warning">Feedback Pending</Badge>;
      case 'Scheduled': 
      default: return <Badge variant="info">Scheduled</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full pb-8">
      <PageHeader 
        title="Interviews" 
      />
      
      <Card>
        <div className="border-b border-border p-2 bg-surface">
          <FilterBar searchValue={search} onSearchChange={setSearch} onRefresh={fetchInterviews} />
        </div>

        {error && (
          <div className="mx-2 mt-2 mb-2 p-2 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30">
              <p className="text-text-secondary">No interviews scheduled.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
              <TableHead>
                <TableRow className="h-7">
                  <TableHeader>Interview Details</TableHeader>
                  <TableHeader>Interviewer</TableHeader>
                  <TableHeader>Scheduled By</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Time</TableHeader>
                  <TableHeader className="text-center">Status</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {interviews.slice((page - 1) * limit, page * limit).map((item) => (
                  <TableRow key={item.interview_id || item.application_id} className="h-8">
                    <TableCell>
                      {`${item.round_type || 'Interview'} - ${item.candidate_name || 'Candidate'}`}
                    </TableCell>
                    <TableCell>
                      {item.interviewer_names || 'Assigned Interviewer'}
                    </TableCell>
                    <TableCell>
                      {item.scheduled_by_name || 'System / Auto'}
                    </TableCell>
                    <TableCell>
                      {formatDate(item.scheduled_start_utc)}
                    </TableCell>
                    <TableCell>
                      {formatTime(item.scheduled_start_utc)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.interview_status)}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTableShell>
          )}
        </div>
        {!loading && interviews.length > 0 && (
          <TablePagination 
            totalItems={interviews.length} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
      </Card>
    </div>
  );
}

