"use client";
 
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/primitives/FilterBar';
import { SingleSelect } from '@/components/primitives/SingleSelect';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { TasksService, Task } from '@/lib/api/tasks';
import { Search, Loader2, Eye, ClipboardList, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TablePagination } from '@/components/primitives/TablePagination';


const formatAssignee = (roleNames?: string | null): string => {
  if (!roleNames) return 'interviewers';
  const lower = roleNames.toLowerCase();
  if (lower.includes('interviewer')) return 'interviewers';
  if (lower.includes('hr') || lower.includes('recruiter')) return 'HR';
  if (lower.includes('hiring manager')) return 'Hiring Manger';
  return roleNames;
};

const getTaskType = (taskName: string, candidateName?: string, taskId?: number) => {
  if (!taskName) return 'Task';
  if (candidateName && taskId) {
    const suffix = `-${candidateName}(#${taskId})`;
    if (taskName.endsWith(suffix)) {
      return taskName.replace(suffix, '');
    }
  }
  return taskName.split('-')[0] || taskName;
};

const getStatusBadge = (status?: string) => {
  const s = (status || 'new').toLowerCase();
  switch (s) {
    case 'completed':
    case 'submitted':
      return <Badge variant="success">Completed</Badge>;
    case 'in_progress':
    case 'pending':
      return <Badge variant="warning">In Progress</Badge>;
    case 'new':
    default:
      return <Badge variant="info">New</Badge>;
  }
};
 
export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
 
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, positionFilter]);
 
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
        <div className="p-2 border-b border-border bg-surface">
          <FilterBar searchValue={searchQuery} onSearchChange={setSearchQuery}>
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px]">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center rounded-l-md">
                Position
              </div>
              <SingleSelect
                options={[
                  { id: '', name: 'All' },
                  ...uniquePositions.map(title => ({ id: title, name: title }))
                ]}
                selectedId={positionFilter}
                onChange={setPositionFilter}
                variant="minimal"
                className="pl-3 pr-2 h-full w-full text-sm bg-transparent outline-none cursor-pointer text-text-primary"
              />
            </div>
          </FilterBar>
        </div>
 
        {error && (
          <div className="mx-4 my-4 p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}
 
        {/* Data Grid Section */}
        <div className="overflow-x-auto">
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
                <TableRow className="h-7">
                  <TableHeader className="w-[50px]"></TableHeader>
                  <TableHeader>Task Type</TableHeader>
                  <TableHeader>Candidate</TableHeader>
                  <TableHeader>Position</TableHeader>
                  <TableHeader>Assignee</TableHeader>
                  <TableHeader>Assigned On</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {filteredTasks.slice((page - 1) * limit, page * limit).map((task) => {
                  const taskType = getTaskType(task.name, task.candidate_name, task.task_id);
                  return (
                    <TableRow key={task.task_id} className="h-8">
                      <TableCell>
                        <div className="flex items-center justify-start">
                          <button
                            className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                            onClick={() => router.push(`/tasks/${task.task_id}/review`)}
                            title="Review"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-text-primary">
                        {taskType}
                      </TableCell>
                      <TableCell className="font-bold text-text-primary">
                        {task.candidate_name || '-'}
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {task.job_title || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-text-secondary font-medium">
                          {formatAssignee(task.assignee_role_names)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-text-muted font-medium">
                          {formatDate(task.assigned_on)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(task.status)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </DataTableShell>
          )}
        </div>
        {!loading && !error && filteredTasks.length > 0 && (
          <TablePagination 
            totalItems={filteredTasks.length} 
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
