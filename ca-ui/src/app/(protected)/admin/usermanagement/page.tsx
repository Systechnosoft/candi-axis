'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { Plus, Edit2, Loader2, Download, FilterX, RefreshCw } from 'lucide-react';
import { FilterBar } from '@/components/primitives/FilterBar';
import { UserModal } from '../components/UserModal';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types/users';
import { TablePagination } from '@/components/primitives/TablePagination';
import { SingleSelect } from '@/components/primitives/SingleSelect';
import { formatDate, exportToCSV } from '@/lib/utils';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roleFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usersApi.getUsers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setUsers(data as any);
      setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (search && !user.full_name.toLowerCase().includes(search.toLowerCase()) && !user.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && user.status !== statusFilter) return false;
      if (roleFilter && user.role_code !== roleFilter) return false;
      return true;
    });
  }, [users, search, statusFilter, roleFilter]);

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await usersApi.updateUserStatus(user.id, { status: newStatus });
      fetchUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="success">Active</Badge>;
    if (status === 'inactive') return <Badge variant="default">Inactive</Badge>;
    return <Badge variant="warning">{status}</Badge>;
  };

  const handleExport = () => {
    const exportData = users.filter(user => {
      if (statusFilter && user.status !== statusFilter) return false;
      if (roleFilter && user.role_code !== roleFilter) return false;
      return true;
    });

    exportToCSV(
      exportData,
      [
        { header: 'Name', accessor: u => u.full_name },
        { header: 'Email', accessor: u => u.email },
        { header: 'Department', accessor: u => u.department || '-' },
        { header: 'Role', accessor: u => u.role_code.replace('_', ' ') },
        { header: 'Status', accessor: u => u.status },
        { header: 'Updated On', accessor: u => u.updated_at ? formatDate(u.updated_at) : (u.created_at ? formatDate(u.created_at) : '-') },
        { header: 'Updated By', accessor: u => u.updated_by_name || '-' }
      ],
      `users-export.csv`
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <PageHeader 
        title="Users Management" 
        description="Manage ATS users, roles, and system access."
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add User
          </Button>
        }
      />

      <Card>
        <div className="border-b border-border p-2 bg-surface">
          <FilterBar searchValue={search} onSearchChange={setSearch} onRefresh={fetchUsers} onClearFilters={() => { setStatusFilter(''); setRoleFilter(''); }}>
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px]">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center rounded-l-md">
                Status
              </div>
              <SingleSelect
                options={[
                  { id: '', name: 'All' },
                  { id: 'active', name: 'Active' },
                  { id: 'inactive', name: 'Inactive' }
                ]}
                selectedId={statusFilter}
                onChange={setStatusFilter}
                variant="minimal"
                className="pl-3 pr-2 h-full w-full text-sm bg-transparent outline-none cursor-pointer text-text-primary"
              />
            </div>
            
            <div className="flex items-center border border-border rounded-md bg-surface h-[34px]">
              <div className="px-4 h-full flex items-center text-sm font-medium text-text-secondary bg-subtle/50 border-r border-border min-w-[110px] justify-center rounded-l-md">
                Role
              </div>
              <SingleSelect
                options={[
                  { id: '', name: 'All' },
                  { id: 'super_admin', name: 'Super Admin' },
                  { id: 'admin', name: 'Admin' },
                  { id: 'hr_recruiter', name: 'HR Recruiter' },
                  { id: 'hiring_manager', name: 'Hiring Manager' },
                  { id: 'interviewer', name: 'Interviewer' }
                ]}
                selectedId={roleFilter}
                onChange={setRoleFilter}
                variant="minimal"
                className="pl-3 pr-2 h-full w-full text-sm bg-transparent outline-none cursor-pointer text-text-primary"
              />
            </div>
          </FilterBar>
        </div>

        {error ? (
          <div className="bg-semantic-error-light text-semantic-error border border-semantic-error-border rounded-lg p-4 m-4">
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center p-12 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-lg bg-subtle/30 m-4">
            <p className="text-text-secondary">No users found.</p>
          </div>
        ) : (
          <DataTableShell className="w-full text-sm">
            <TableHead>
              <TableRow>
                <TableHeader className="text-right">{" "}</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Department</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader className="text-center">Status</TableHeader>
                <TableHeader>Updated On</TableHeader>
                <TableHeader>Updated By</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {filteredUsers.slice((page - 1) * limit, page * limit).map((user) => (
                <TableRow key={user.id} className={user.status === 'inactive' ? 'opacity-60 bg-subtle/20' : ''}>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-text-primary">{user.full_name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-secondary">{user.email}</div>
                  </TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell className="capitalize">{user.role_code.replace('_', ' ')}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {user.updated_at ? formatDate(user.updated_at) : (user.created_at ? formatDate(user.created_at) : '-')}
                  </TableCell>
                  <TableCell>
                    {user.updated_by_name || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-text-muted">
                    No users match your filters.
                  </TableCell>
                </TableRow>
              )}
            </tbody>
          </DataTableShell>
        )}
        {!loading && filteredUsers.length > 0 && (
          <TablePagination 
            totalItems={filteredUsers.length} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
      </Card>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSaved={fetchUsers}
      />
    </div>
  );
}
