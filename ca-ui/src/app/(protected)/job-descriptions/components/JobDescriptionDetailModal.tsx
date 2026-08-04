import React, { useState, useEffect } from 'react';
import { ModalShell } from '@/components/primitives/ModalShell';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { JobDescription } from '@/types/job-descriptions';
import { Tag } from '@/types/tags';
import { tagsApi } from '@/lib/api/tags';
import { Loader2 } from 'lucide-react';

interface JobDescriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobDescription: JobDescription | null;
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
}

export function JobDescriptionDetailModal({
  isOpen,
  onClose,
  jobDescription,
  onUpdateStatus,
}: JobDescriptionDetailModalProps) {
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [jdTags, setJdTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    if (!isOpen || !jobDescription) {
      setJdTags([]);
      return;
    }
    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const entityTags = await tagsApi.getEntityTags('job_description', jobDescription.id);
        setJdTags(
          entityTags.map((et: any) => ({
            id: et.tag_id,
            name: et.tag_name,
            type: et.tag_type,
            active: true,
          }))
        );
      } catch {
        setJdTags([]);
      } finally {
        setLoadingTags(false);
      }
    };
    fetchTags();
  }, [isOpen, jobDescription?.id]);

  if (!isOpen || !jobDescription) return null;

  const handleStatusUpdate = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      await onUpdateStatus(jobDescription.id, newStatus);
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="success">Open</Badge>;
      case 'on_hold':
        return <Badge variant="warning">On Hold</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
      case 'draft':
      default:
        return <Badge variant="info">Draft</Badge>;
    }
  };

  const renderHtml = (text: string | null) => {
    if (!text) return <span className="text-gray-400 italic">Not provided</span>;
    return <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <ModalShell title="Job Description Details" onClose={onClose}>
      <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto p-1">

        {/* Header Block */}
        <div className="flex justify-between items-start border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{jobDescription.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <span className="font-medium text-brand">
                {jobDescription.requisition_title}
                {jobDescription.requisition_code ? ` (${jobDescription.requisition_code})` : ''}
              </span>
              <span>•</span>
              {jobDescription.code && (
                <>
                  <span>Code: {jobDescription.code}</span>
                  <span>•</span>
                </>
              )}
              <span>{jobDescription.location || 'Location unspecified'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(jobDescription.status)}
            {jobDescription.published_internal_at && (
              <span className="text-xs text-gray-500">Published: {new Date(jobDescription.published_internal_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            )}
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted p-4 rounded-md border border-border/20">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Work Mode</p>
            <p className="text-sm font-medium mt-1">{jobDescription.work_mode?.replace('_', ' ') || 'Any'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Employment Type</p>
            <p className="text-sm font-medium mt-1">{jobDescription.employment_type?.replace('_', ' ') || 'Any'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Experience (Mo)</p>
            <p className="text-sm font-medium mt-1">
              {jobDescription.exp_min_months != null ? jobDescription.exp_min_months : '-'} to {jobDescription.exp_max_months != null ? jobDescription.exp_max_months : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Owner ID</p>
            <p className="text-sm font-medium mt-1 truncate" title={jobDescription.owner_user_id || ''}>
              {jobDescription.owner_user_id ? 'Assigned' : 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Skills / Tags */}
        <div>
          <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-1 mb-3">Skills</h3>
          {loadingTags ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading skills...</span>
            </div>
          ) : jdTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {jdTags.map(tag => (
                <Badge key={tag.id} variant={tag.type === 'skill' ? 'info' : 'default'}>
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">No skills assigned to this job description.</span>
          )}
        </div>

        <div className="flex flex-col gap-5 text-sm">
          <div>
            <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-1 mb-2">Job Summary</h3>
            {renderHtml(jobDescription.job_summary)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-1 mb-2">Responsibilities</h3>
            {renderHtml(jobDescription.responsibilities_text)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-1 mb-2">Must-Have Requirements</h3>
            {renderHtml(jobDescription.must_have_text)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-1 mb-2">Nice-To-Have</h3>
            {renderHtml(jobDescription.nice_to_have_text)}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500 mr-2">Update Status:</span>
          <select
            className="px-2 py-1.5 border border-border bg-white rounded-md text-sm outline-none focus:ring-1 focus:ring-brand"
            value={jobDescription.status}
            disabled={statusUpdating}
            onChange={(e) => handleStatusUpdate(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="on_hold">On Hold</option>
            <option value="closed">Closed</option>
          </select>
          {statusUpdating && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
        </div>
        <Button variant="secondary" onClick={onClose} type="button">
          Close
        </Button>
      </div>
    </ModalShell>
  );
}
