"use client";
 
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterBar } from '@/components/primitives/FilterBar';
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
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px] overflow-hidden">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center">
                Position
              </div>
              <select 
                className="pl-3 pr-8 h-full w-full text-sm bg-transparent outline-none appearance-none cursor-pointer text-text-primary"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
              >
                <option value="">All Positions</option>
                {uniquePositions.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
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
                <TableRow>
                  <TableHeader className="w-[60%]">Task Name</TableHeader>
                  <TableHeader className="w-[20%]">Assignee</TableHeader>
                  <TableHeader className="w-[20%]">Assigned On</TableHeader>
                </TableRow>
              </TableHead>
              <tbody>
                {filteredTasks.slice((page - 1) * limit, page * limit).map((task) => (
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
