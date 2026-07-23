"use client";
 
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { TasksService, Task } from '@/lib/api/tasks';
import { Search, Loader2, Eye, ClipboardList, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
 
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatAssignee = (roleNames?: string | null): string => {
  if (!roleNames) return 'interviewers';
  const lower = roleNames.toLowerCase();
  if (lower.includes('interviewer')) return 'interviewers';
  if (lower.includes('hr') || lower.includes('recruiter')) return 'HR';
  if (lower.includes('hiring manager')) return 'Hiring Manger';
  return roleNames;
};
 
export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
 
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TasksService.getTasks();
      setTasks(data);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.response?.data?.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
 
  // Apply Search and Position Filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      (task.candidate_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.job_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.name || '').toLowerCase().includes(searchQuery.toLowerCase());
 
    const matchesPosition = positionFilter === '' || task.job_title === positionFilter;
 
    return matchesSearch && matchesPosition;
  });
 
  // Unique positions for job filter dropdown
  const uniquePositions = Array.from(new Set(tasks.map(t => t.job_title).filter(Boolean))) as string[];
 
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 w-full">
      <PageHeader 
        title="My Tasks"
      />
 
      <Card>
        {/* Search and Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 p-4 border-b border-border bg-subtle/30">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search candidate, position..." 
              className="pl-9 pr-3 py-1.5 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none w-64 bg-surface"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
 
          <select 
            className="px-3 py-1.5 text-sm rounded-md border border-border focus:ring-1 focus:ring-brand outline-none bg-surface max-w-xs truncate"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="">All Positions</option>
            {uniquePositions.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </div>
 
        {error && (
          <div className="mx-4 my-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}
 
        {/* Data Grid Section */}
        <div className="px-4 pb-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-text-muted">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/10 my-4">
              <ClipboardList className="w-8 h-8 mx-auto text-text-muted mb-2" />
              <p className="text-text-secondary text-sm font-medium">No tasks found.</p>
            </div>
          ) : (
            <DataTableShell className="w-full text-sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Task Name</TableHeader>
                  <TableHeader>Assignee</TableHeader>
                  <TableHeader>Assigned On</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {filteredTasks.map(task => (
                  <TableRow key={task.task_id}>
                    {/* Task Name */}
                    <TableCell>
                      <button
                        onClick={() => router.push(`/tasks/${task.task_id}/review`)}
                        className="font-bold text-brand hover:underline text-xs text-left"
                      >
                        {task.name}
                      </button>
                    </TableCell>
                    
                    {/* Assignee */}
                    <TableCell>
                      <span className="text-xs text-text-secondary font-medium">
                        {formatAssignee(task.assignee_role_names)}
                      </span>
                    </TableCell>
                    
                    {/* Assigned On */}
                    <TableCell>
                      <span className="text-xs text-text-muted font-medium">
                        {formatDate(task.assigned_on)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </DataTableShell>
          )}
        </div>
      </Card>
    </div>
  );
}
