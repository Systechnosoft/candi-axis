'use client';

import React, { useState, useEffect } from 'react';
import { ListPage } from '@/components/templates/ListPage';
import { FilterBar } from '@/components/primitives/FilterBar';
import { Card } from '@/components/primitives/Card';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { formatDate, toTitleCase } from '@/lib/utils';
import { CandidateSummaryCard } from '@/components/ats/CandidateSummaryCard';
import Link from 'next/link';
import { CandidatesService } from '@/lib/api/candidates';
import { Candidate } from '@/types/candidates';
import { Loader2, Edit2 } from 'lucide-react';
import { DrawerShell80 } from '@/components/primitives/ModalShell';
import { CandidateForm } from './intake/components/CandidateForm';
import { ApplicationsService } from '@/lib/api/applications';
import { TablePagination } from '@/components/primitives/TablePagination';
import { CandidateFormValues } from '@/types/candidates';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await CandidatesService.getCandidates({ page, limit, search });
        setCandidates(res.data);
        setTotalItems(res.meta.total || 0);
      } catch {
        setError('Failed to load candidates.');
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(timer);
  }, [page, search]);

  // Edit Drawer States
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasApplications, setHasApplications] = useState(false);

  const handleOpenEditDrawer = async (candidateSummary: Candidate) => {
    setIsDrawerLoading(true);
    setDrawerError(null);
    setEditingCandidate(null);
    setIsEditDrawerOpen(true);
    
    try {
      const [fullData, appsRes] = await Promise.all([
        CandidatesService.getCandidate(candidateSummary.id),
        ApplicationsService.getApplications({ candidate_id: candidateSummary.id })
      ]);
      setEditingCandidate(fullData);
      const activeApps = (appsRes.data || []).filter((app: any) => !app.is_deleted);
      setHasApplications(activeApps.length > 0);
    } catch (err: any) {
      setDrawerError('Failed to load candidate details.');
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const getInitialValues = (data: any): Partial<CandidateFormValues> => ({
    full_name: data.full_name || '',
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    email: data.email || '',
    secondary_email: data.secondary_email || '',
    phone: data.phone || '',
    secondary_phone: data.secondary_phone || '',
    location: data.location || '',
    current_company: data.current_company || '',
    current_designation: data.current_designation || '',
    total_exp_months: data.total_exp_months !== null ? String(data.total_exp_months) : '',
    relevant_exp_months: data.relevant_exp_months !== null ? String(data.relevant_exp_months) : '',
    notice_period_days: data.notice_period_days !== null ? String(data.notice_period_days) : '',
    current_ctc: data.current_ctc !== null ? String(data.current_ctc) : '',
    expected_ctc: data.expected_ctc !== null ? String(data.expected_ctc) : '',
    profile_summary: data.profile_summary || '',
    educations: data.educations || [],
    employments: data.employments || [],
    certifications: data.certifications || [],
    social_links: data.social_links || [],
    tags: data.tags || []
  });

  const handleDrawerSubmit = async (data: CandidateFormValues) => {
    if (!editingCandidate) return;
    setIsSubmitting(true);
    setDrawerError(null);

    const payload = {
      full_name: data.full_name,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      email: data.email || undefined,
      secondary_email: data.secondary_email || undefined,
      phone: data.phone || undefined,
      secondary_phone: data.secondary_phone || undefined,
      location: data.location || undefined,
      current_company: data.current_company || undefined,
      current_designation: data.current_designation || undefined,
      total_exp_months: data.total_exp_months ? parseInt(data.total_exp_months, 10) : undefined,
      relevant_exp_months: data.relevant_exp_months ? parseInt(data.relevant_exp_months, 10) : undefined,
      notice_period_days: data.notice_period_days ? parseInt(data.notice_period_days, 10) : undefined,
      current_ctc: data.current_ctc ? parseFloat(data.current_ctc) : undefined,
      expected_ctc: data.expected_ctc ? parseFloat(data.expected_ctc) : undefined,
      profile_summary: data.profile_summary || undefined,
      educations: data.educations,
      employments: data.employments,
      certifications: data.certifications,
      social_links: data.social_links,
      tags: data.tags.map((t: any) => typeof t === 'string' ? t : t.name)
    };

    try {
      await CandidatesService.updateCandidate(editingCandidate.id, payload);
      const res = await CandidatesService.getCandidates({ page, limit, search });
      setCandidates(res.data);
      setIsEditDrawerOpen(false);
    } catch (err: any) {
      setDrawerError(err?.response?.data?.message || 'Failed to update candidate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ListPage 
      title="Candidates" 
      actions={
        <Link href="/candidates/intake">
          <Button variant="primary">Add Candidate</Button>
        </Link>
      }
    >
      <div className="flex flex-col gap-6 h-full min-h-0 w-full">
        <Card className="w-full">
          <div className="p-2 border-b border-border bg-subtle/50 rounded-t-md">
            <FilterBar searchValue={search} onSearchChange={setSearch} />
          </div>
          <div className="overflow-x-auto">
            <DataTableShell className="w-full text-sm">
          <TableHead>
            <TableRow>
              <TableHeader className="text-right"></TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>Stage</TableHeader>
              <TableHeader>Updated By</TableHeader>
              <TableHeader>Updated On</TableHeader>
              <TableHeader>Date</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-text-muted">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-brand" />
                    <span>Loading candidates...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-error">
                  {error}
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-text-muted">
                  No candidates found.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((candidate) => (
                <TableRow 
                  key={candidate.id} 
                  className="cursor-pointer hover:bg-subtle"
                >
                  <TableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <div className="flex items-center justify-start gap-1">

                      <button 
                        onClick={() => handleOpenEditDrawer(candidate)}
                        className="p-1.5 text-text-secondary hover:text-brand hover:bg-brand/10 rounded-md transition-colors"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-brand">
                    <Link href={`/candidates/${candidate.id}`} className="hover:underline" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {candidate.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>{candidate.current_designation || candidate.source || 'N/A'}</TableCell>
                  <TableCell><Badge variant="info">{toTitleCase(candidate.status || 'Applied')}</Badge></TableCell>
                  <TableCell className="text-text-secondary">{candidate.updated_by_name || '-'}</TableCell>
                  <TableCell className="text-text-secondary">{formatDate(candidate.updated_at)}</TableCell>
                  <TableCell>{formatDate(candidate.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </DataTableShell>
          </div>
        {/* Pagination */}
        {!loading && candidates.length > 0 && (
          <TablePagination 
            totalItems={totalItems} 
            page={page} 
            setPage={setPage} 
            limit={limit} 
            setLimit={setLimit} 
          />
        )}
        </Card>
      </div>
      {isEditDrawerOpen && (
        <DrawerShell80
          title="Edit Candidate Profile"
          onClose={() => setIsEditDrawerOpen(false)}
        >
          {isDrawerLoading ? (
            <div className="flex flex-col items-center justify-center p-24 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
              <span className="mt-4 text-xs font-semibold">Fetching profile details...</span>
            </div>
          ) : drawerError && !editingCandidate ? (
            <div className="p-8 text-center bg-danger/10 border border-danger/20 rounded-xl text-danger max-w-md mx-auto">
              {drawerError}
            </div>
          ) : (
            editingCandidate && (
              <div className="max-w-4xl mx-auto py-4">
                {drawerError && (
                  <div className="bg-error-50 border border-error p-3 rounded-lg mb-6 text-error text-xs font-semibold">
                    {drawerError}
                  </div>
                )}
                <CandidateForm 
                  mode="edit"
                  initialValues={getInitialValues(editingCandidate)}
                  onSubmit={handleDrawerSubmit}
                  onCancel={() => setIsEditDrawerOpen(false)}
                  isSubmitting={isSubmitting}
                  submitError={drawerError}
                  hasApplications={hasApplications}
                />
              </div>
            )
          )}
        </DrawerShell80>
      )}
    </ListPage>
  );
}
