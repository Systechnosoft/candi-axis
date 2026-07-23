'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { DataTableShell, TableHead, TableRow, TableHeader, TableCell } from '@/components/primitives/DataTableShell';
import { DrawerShell, DrawerShell80 } from '@/components/primitives/ModalShell';
import { InterviewsService } from '@/lib/api/interviews';
import { RichTextEditor } from '@/components/primitives/RichTextEditor';
import { jobPostingsApi } from '@/lib/api/job-postings';
import { GoogleCalendarService } from '@/lib/api/google-calendar';
import { jobDescriptionsApi } from '@/lib/api/job-descriptions';
import { usersApi } from '@/lib/api/users';
import { MultiSelect } from '@/components/primitives/MultiSelect';
import { SingleSelect } from '@/components/primitives/SingleSelect';
import { ApplicationsService } from '@/lib/api/applications';
import { AdminService } from '@/lib/api/admin';
import { JobPosting } from '@/types/job-postings';
import { JobDescription } from '@/types/job-descriptions';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, Search, Mail, Phone, MapPin, Briefcase, 
  User, Loader2, ExternalLink, Calendar, CheckCircle,
  Edit2, ChevronUp, ChevronDown, X, ArrowRight, Check, Video, RefreshCw, Link
} from 'lucide-react';

const PIPELINE_ORDER = ['new', 'screening', 'interviewing', 'shortlisted', 'offered', 'accepted', 'joined', 'closed'];

const mapStageToCategory = (stage: string): string => {
  const s = (stage || '').toLowerCase();
  if (s === 'new' || s === 'applied') return 'New';
  if (s === 'screening' || s === 'screened') return 'Screening';
  if (s === 'engaged' || s === 'interview' || s === 'interviewing') return 'Interviewing';
  if (s === 'shortlisted') return 'Shortlisted';
  if (s === 'offered' || s === 'offer') return 'Offered';
  if (s === 'accepted') return 'Accepted';
  if (s === 'joined' || s === 'hired') return 'Joined';
  if (s === 'closed') return 'Closed';
  if (s === 'rejected' || s === 'archived') return 'Rejected';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const normalizeStage = (stage: string): string => {
  const s = (stage || '').toLowerCase();
  if (s === 'applied') return 'new';
  if (s === 'screened') return 'screening';
  if (s === 'interview' || s === 'engaged') return 'interviewing';
  if (s === 'offer') return 'offered';
  if (s === 'archived') return 'rejected';
  return s;
};

const isBackwardTransition = (current: string, target: string): boolean => {
  const normCurrent = normalizeStage(current);
  const normTarget = normalizeStage(target);
  
  if (normTarget === 'rejected') return false; 
  if (normCurrent === 'rejected') return false; 
  
  const currentIdx = PIPELINE_ORDER.indexOf(normCurrent);
  const targetIdx = PIPELINE_ORDER.indexOf(normTarget);
  
  if (currentIdx === -1 || targetIdx === -1) return false;
  return targetIdx < currentIdx; // strictly less than current index is backward
};


export default function JobPostingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { hasAccess } = useAuth();
  const canEdit = hasAccess('job_descriptions', 'editor');

  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [hiringManagers, setHiringManagers] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Client-side search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard card stage filter state
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);

  // Edit Stage Drawer States
  const [selectedAppForStage, setSelectedAppForStage] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [targetStage, setTargetStage] = useState<string | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [offeredAmount, setOfferedAmount] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [transitioningStage, setTransitioningStage] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Scheduling Interview States
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedAppForSchedule, setSelectedAppForSchedule] = useState<any | null>(null);
  const [schedInterviewers, setSchedInterviewers] = useState<any[]>([]);
  const [ccOptions, setCcOptions] = useState<any[]>([]);
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [selectedCc, setSelectedCc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  
  const getLocalDateTimeString = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };
  const [scheduledTime, setScheduledTime] = useState(getLocalDateTimeString());
  const [roundType, setRoundType] = useState('tech1');
  const [durationMins, setDurationMins] = useState(60);
  const [mode, setMode] = useState('online');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [externalEventId, setExternalEventId] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [selectedMeetingProvider, setSelectedMeetingProvider] = useState<string>('');
  const [activeProviders, setActiveProviders] = useState<any[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [meetingLinkEditable, setMeetingLinkEditable] = useState(false);

  const [teamsMeetingId, setTeamsMeetingId] = useState('');
  const [teamsPasscode, setTeamsPasscode] = useState('');

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [checkingGoogle, setCheckingGoogle] = useState(false);


  const handleOpenScheduleDrawer = async (app: any) => {
    setTeamsMeetingId('');
    setTeamsPasscode('');
    setMeetingLink('');
    setExternalEventId('');
    setMeetingLinkEditable(false);
    setSelectedMeetingProvider('');

    setSelectedAppForSchedule(app);
    setIsScheduleOpen(true);
    
    setSubject(`Interview Schedule - ${app.candidate_name}`);
    setNote('');

    try {
      const intList = await usersApi.getInterviewers();
      const hmList = await usersApi.getHiringManagers();
      const hrList = await usersApi.getHrRecruiters();

      setSchedInterviewers(intList.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim() })));

      const allCc = [...hmList, ...hrList];
      const uniqueCc = Array.from(new Map(allCc.map(u => [u.id, u])).values());
      setCcOptions(uniqueCc.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim() })));

      // Default To list: Job posting interviewers
      if (posting?.interviewer_ids) {
        setSelectedInterviewers(posting.interviewer_ids);
      }
      if (posting?.hr_ids) {
        setSelectedCc(posting.hr_ids);
      }

      await checkGoogleConnection();
    } catch (err) {
      console.error('Failed to load scheduling options:', err);
    }

    // Load active meeting provider configurations
    try {
      const configs = await AdminService.getConfigurations();
      const active = configs.filter((c: any) => c.is_active);
      setActiveProviders(active);
      // Auto-select default or first active
      const def = active.find((c: any) => c.is_default) || active[0];
      if (def) setSelectedMeetingProvider(def.provider);
    } catch {
      setActiveProviders([]);
    }
  };

  const handleGenerateMeetingLink = async () => {
    if (!selectedMeetingProvider) return;
    setGeneratingLink(true);
    setMeetingLink('');
    setExternalEventId('');
    try {
      if (selectedMeetingProvider === 'GOOGLE_MEET') {
        const res = await GoogleCalendarService.generateMeetLink();
        setMeetingLink(res.meetingLink);
        setExternalEventId(res.externalEventId);
      } else {
        // For other providers, open a prompt to enter the link manually
        setMeetingLinkEditable(true);
      }
    } catch (err: any) {
      console.error('Failed to generate meeting link:', err);
      // Fallback: allow manual entry
      setMeetingLinkEditable(true);
    } finally {
      setGeneratingLink(false);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      setCheckingGoogle(true);
      const status = await GoogleCalendarService.getConnectionStatus();
      setGoogleConnected(status.connected);
      setGoogleEmail(status.email || '');
    } catch (err) {
      console.error('Failed to get Google Calendar connection status:', err);
    } finally {
      setCheckingGoogle(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { url } = await GoogleCalendarService.getAuthUrl();
      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        url,
        'Connect Google Calendar',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      const messageListener = async (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
          await checkGoogleConnection();
          window.removeEventListener('message', messageListener);
        }
      };
      window.addEventListener('message', messageListener);
    } catch (err: any) {
      alert('Cannot connect: The system administrator has not configured the backend Google OAuth App (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) in the backend API .env file.');
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;
    try {
      await GoogleCalendarService.disconnect();
      setGoogleConnected(false);
      setGoogleEmail('');
    } catch (err: any) {
      alert('Failed to disconnect Google Calendar: ' + err.message);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForSchedule) return;
    if (selectedInterviewers.length === 0) {
      alert('Please select at least one interviewer.');
      return;
    }
    if (!scheduledTime) {
      alert('Please select a date and time.');
      return;
    }
    if (!subject) {
      alert('Subject is required.');
      return;
    }

    setScheduling(true);
    try {
      const startIso = new Date(scheduledTime).toISOString();
      const interview = await InterviewsService.scheduleInterview({
        applicationId: selectedAppForSchedule.id,
        roundType,
        scheduledStartUtc: startIso,
        durationMins,
        mode,
        location: mode === 'offline' ? location : undefined,
        meetingLink: mode === 'online' ? meetingLink : undefined,
        externalCalendarEventId: mode === 'online' ? externalEventId : undefined,
        interviewerIds: selectedInterviewers,
        ccUserIds: selectedCc,
        emailSubject: subject,
        note: note || undefined,
      });

      alert('Interview successfully scheduled and emails sent.');
      setIsScheduleOpen(false);
      setSelectedAppForSchedule(null);
      await fetchApplicationsOnly(); 
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to schedule interview.');
    } finally {
      setScheduling(false);
    }
  };

  // Edit Posting Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formJdId, setFormJdId] = useState('');
  const [formHrIds, setFormHrIds] = useState<string[]>([]);
  const [formInterviewerIds, setFormInterviewerIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Description collapse state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  useEffect(() => {
    const fetchPostingData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [postingData, jdsData, managersData, interviewersData] = await Promise.all([
          jobPostingsApi.getJobPosting(id),
          jobDescriptionsApi.getJobDescriptions(),
          usersApi.getHiringManagers().catch(() => []),
          usersApi.getInterviewers().catch(() => [])
        ]);
        setPosting(postingData);
        setJobDescriptions(jdsData);
        setHiringManagers(managersData);
        setInterviewers(interviewersData);

        if (postingData.jd_id) {
          const appsRes = await ApplicationsService.getApplications({
            jd_id: postingData.jd_id,
            limit: 100, // fetch up to 100 applications for this posting
          });
          setApplications(appsRes.data || []);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.message || 'Failed to load Job Posting details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPostingData();
    }
  }, [id]);

  const fetchApplicationsOnly = async () => {
    if (posting?.jd_id) {
      try {
        const appsRes = await ApplicationsService.getApplications({
          jd_id: posting.jd_id,
          limit: 100,
        });
        setApplications(appsRes.data || []);
      } catch (err) {
        console.error('Failed to refresh applications list', err);
      }
    }
  };

  // Client-side filtered candidates (supports both Stage Card filter and search bar queries)
  const filteredCandidates = useMemo(() => {
    return applications.filter(app => {
      if (selectedStageFilter) {
        const cat = mapStageToCategory(app.stage);
        if (cat !== selectedStageFilter) return false;
      }
      const q = searchQuery.toLowerCase();
      const nameMatch = app.candidate_name?.toLowerCase().includes(q);
      const designationMatch = app.candidate_designation?.toLowerCase().includes(q);
      const locationMatch = app.candidate_location?.toLowerCase().includes(q);
      const emailMatch = app.candidate_email?.toLowerCase().includes(q);
      return nameMatch || designationMatch || locationMatch || emailMatch;
    });
  }, [applications, searchQuery, selectedStageFilter]);

  const getInitials = (name: string) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStageBadge = (stage: string) => {
    const s = (stage || '').toLowerCase();
    switch (s) {
      case 'applied':
      case 'new':
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200 font-medium">New</Badge>;
      case 'screening':
      case 'screened':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium">Screening</Badge>;
      case 'shortlisted':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">Shortlisted</Badge>;
      case 'interview':
      case 'interviewing':
      case 'engaged':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-medium">Interviewing</Badge>;
      case 'offered':
      case 'offer':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-medium">Offered</Badge>;
      case 'hired':
        return <Badge className="bg-green-50 text-green-700 border-green-200 font-medium">Hired</Badge>;
      case 'rejected':
      case 'archived':
        return <Badge className="bg-red-50 text-red-700 border-red-200 font-medium">Rejected</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200 font-medium">{stage}</Badge>;
    }
  };

  const formatExperience = (months?: number | null) => {
    if (months === null || months === undefined) return '0 years';
    const yrs = Math.floor(months / 12);
    const mths = months % 12;
    const yrsStr = yrs > 0 ? `${yrs} year${yrs > 1 ? 's' : ''}` : '';
    const mthsStr = mths > 0 ? `${mths} month${mths > 1 ? 's' : ''}` : '';
    return [yrsStr, mthsStr].filter(Boolean).join(' ') || '0 months';
  };

  const openEditModal = () => {
    if (!posting) return;
    setFormName(posting.name);
    setFormCode(posting.code || '');
    setFormDescription(posting.description || '');
    setFormJdId(posting.jd_id);
    setFormHrIds(posting.hr_ids || []);
    setFormInterviewerIds(posting.interviewer_ids || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!formJdId) {
      setFormError('Please select a Job Description.');
      return;
    }
    if (formHrIds.length === 0) {
      setFormError('Please select at least one HR manager.');
      return;
    }
    if (formInterviewerIds.length === 0) {
      setFormError('Please select at least one interviewer.');
      return;
    }

    setSubmitting(true);
    try {
      await jobPostingsApi.updateJobPosting(id, {
        name: formName,
        code: formCode || undefined,
        description: formDescription,
        jd_id: formJdId,
        is_active: posting?.is_active,
        hr_ids: formHrIds,
        interviewer_ids: formInterviewerIds,
      });
      setIsModalOpen(false);
      
      // Reload posting data
      const updatedPosting = await jobPostingsApi.getJobPosting(id);
      setPosting(updatedPosting);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.message || 'An error occurred while saving.';
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Stage transition side drawer handlers
  const handleOpenEditDrawer = (app: any) => {
    setSelectedAppForStage(app);
    setTargetStage(null); 
    setTransitionReason('');
    setOfferedAmount('');
    setJoiningDate('');
    setDrawerError(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedAppForStage(null);
    }, 300);
  };

  const handleStageTransition = async () => {
    if (!selectedAppForStage || !targetStage) return;

    setTransitioningStage(true);
    setDrawerError(null);
    try {
      const payload: any = {
        to_stage: targetStage,
        reason: transitionReason || `Moved to stage ${targetStage}`,
      };

      if (targetStage === 'offered') {
        const amt = parseFloat(offeredAmount);
        if (isNaN(amt) || amt <= 0) {
          throw new Error('Please enter a valid Offered CTC (greater than 0).');
        }
        payload.offered_amount = amt;
        if (joiningDate) {
          payload.joining_date = new Date(joiningDate).toISOString();
        }
      }

      if (targetStage === 'joined') {
        if (!joiningDate) {
          throw new Error('Please specify a Joining Date.');
        }
        payload.joining_date = new Date(joiningDate).toISOString();
      }

      await ApplicationsService.updateStage(selectedAppForStage.id, payload);
      
      // Refresh local candidates list and close
      await fetchApplicationsOnly();
      handleCloseDrawer();
    } catch (err: any) {
      console.error(err);
      setDrawerError(err?.response?.data?.message || err?.message || 'Failed to update stage.');
    } finally {
      setTransitioningStage(false);
    }
  };

  // Stage Counts Calculation
  const counts = useMemo(() => {
    const c = {
      New: 0,
      Screening: 0,
      Interviewing: 0,
      Shortlisted: 0,
      Offered: 0,
      Accepted: 0,
      Joined: 0,
      Closed: 0,
      Rejected: 0,
    };
    applications.forEach(app => {
      const cat = mapStageToCategory(app.stage);
      if (cat in c) {
        c[cat as keyof typeof c]++;
      }
    });
    return c;
  }, [applications]);

  const PIPELINE_STAGES = [
    { key: 'new', label: 'New', desc: 'Fresh application' },
    { key: 'screening', label: 'Screening', desc: 'Initial vetting/screening' },
    { key: 'interviewing', label: 'Interviewing', desc: 'Interviews & assessments' },
    { key: 'shortlisted', label: 'Shortlisted', desc: 'Shortlisted for offer consideration' },
    { key: 'offered', label: 'Offered', desc: 'Job offer sent' },
    { key: 'accepted', label: 'Accepted', desc: 'Offer accepted by candidate' },
    { key: 'joined', label: 'Joined', desc: 'Candidate joined the company' },
    { key: 'closed', label: 'Closed', desc: 'Hiring process finished' },
    { key: 'rejected', label: 'Rejected', desc: 'Candidate rejected/archived' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !posting) {
    return (
      <div className="p-8 text-center bg-surface border border-border rounded-xl max-w-md mx-auto mt-12 shadow-sm">
        <p className="text-danger font-medium">{error || 'Job Posting not found.'}</p>
        <Button variant="secondary" onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 w-full px-4 relative">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => router.push('/job-postings')}
            className="p-2 hover:bg-subtle rounded-lg text-text-secondary transition-colors mt-0.5"
            title="Back to Job Postings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">{posting.name}</h1>
              {posting.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="default">Closed</Badge>
              )}
            </div>
            <p className="text-sm text-text-secondary font-medium">
              {posting.code && <span className="mr-2">Posting ID: <strong>{posting.code}</strong> •</span>}
              {posting.jd_title && (
                <span>
                  Linked Job Description: <span className="text-brand font-semibold hover:underline cursor-pointer" onClick={() => router.push(`/job-descriptions/${posting.jd_id}`)}>{posting.jd_title}</span> {posting.jd_code ? `(${posting.jd_code})` : ''}
                </span>
              )}
            </p>
            {((posting.hr_ids && posting.hr_ids.length > 0) || (posting.interviewer_ids && posting.interviewer_ids.length > 0)) && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 pt-2 border-t border-border/30 text-xs">
                {posting.hr_ids && posting.hr_ids.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-text-muted uppercase tracking-wider text-[10px]">HR Manager(s):</span>
                    <div className="flex flex-wrap gap-1">
                      {hiringManagers
                        .filter(u => posting.hr_ids?.includes(u.id))
                        .map(u => (
                          <Badge key={u.id} variant="default" className="bg-subtle text-text-secondary border-border text-[11px] font-medium px-2 py-0.5">
                            {u.full_name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                {posting.interviewer_ids && posting.interviewer_ids.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-text-muted uppercase tracking-wider text-[10px]">Interviewer(s):</span>
                    <div className="flex flex-wrap gap-1">
                      {interviewers
                        .filter(u => posting.interviewer_ids?.includes(u.id))
                        .map(u => (
                          <Badge key={u.id} variant="default" className="bg-subtle text-text-secondary border-border text-[11px] font-medium px-2 py-0.5">
                            {u.full_name}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={openEditModal} 
              className="gap-2 bg-surface hover:bg-subtle text-sm border-border"
            >
              <Edit2 className="w-4 h-4" /> Edit Posting
            </Button>
          </div>
        )}
      </div>

      {/* Collapsible Description Preview */}
      {posting.description && (
        <Card className="border border-border shadow-sm bg-surface transition-all duration-300 hover:shadow-md">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer select-none"
            onClick={() => setIsDescExpanded(!isDescExpanded)}
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-text-primary">Job Posting Description</span>
            </div>
            <div className="p-1 rounded-full hover:bg-subtle text-text-secondary transition-colors">
              {isDescExpanded ? (
                <ChevronUp className="w-5 h-5 text-brand" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </div>
          </div>
          
          <div 
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isDescExpanded ? 'max-h-[1000px] border-t border-border opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <CardContent className="p-6">
              <div 
                className="text-sm text-text-secondary leading-relaxed prose max-w-none" 
                dangerouslySetInnerHTML={{ __html: posting.description }} 
              />
            </CardContent>
          </div>
        </Card>
      )}

      {/* Dashboard Stage Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
        {[
          { label: 'New', count: counts.New },
          { label: 'Screening', count: counts.Screening },
          { label: 'Interviewing', count: counts.Interviewing },
          { label: 'Shortlisted', count: counts.Shortlisted },
          { label: 'Offered', count: counts.Offered },
          { label: 'Accepted', count: counts.Accepted },
          { label: 'Joined', count: counts.Joined },
          { label: 'Closed', count: counts.Closed },
          { label: 'Rejected', count: counts.Rejected },
        ].map(stat => {
          const isSelected = selectedStageFilter === stat.label;
          return (
            <Card 
              key={stat.label} 
              onClick={() => setSelectedStageFilter(prev => prev === stat.label ? null : stat.label)}
              className={`border p-4 text-center rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-0.5 select-none ${
                isSelected 
                  ? 'bg-brand/10 border-brand text-brand ring-2 ring-brand/20 shadow-md' 
                  : 'bg-surface border-border text-text-secondary hover:border-text-secondary/50 shadow-sm'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">{stat.label}</div>
              <div className="text-2xl font-black mt-1 leading-none">{stat.count}</div>
            </Card>
          );
        })}
      </div>

      {/* Search Bar section */}
      <Card className="p-4 shadow-sm border border-border bg-subtle/30">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search candidates by name, role, email, location..." 
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border focus:ring-1 focus:ring-brand outline-none bg-surface text-text-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {/* Tabular view of Candidates */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-base font-bold text-text-primary">
            Applied Candidates ({filteredCandidates.length})
            {selectedStageFilter && (
              <Badge variant="default" className="ml-2 py-0.5 px-2 bg-brand/15 text-brand border-brand/25 text-xs font-semibold capitalize">
                Stage: {selectedStageFilter}
              </Badge>
            )}
          </h2>
          {selectedStageFilter && (
            <button 
              onClick={() => setSelectedStageFilter(null)}
              className="text-xs text-brand hover:underline font-bold"
            >
              Clear filter
            </button>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-border rounded-xl bg-surface">
            <User className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No candidates added to this job posting</p>
            <p className="text-xs text-text-muted mt-1">Add candidates to this posting from the job description workspace.</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-border rounded-xl bg-surface">
            <User className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No candidates match your filters.</p>
            <p className="text-xs text-text-muted mt-1">Try refining your search query or stage selections.</p>
          </div>
        ) : (
          <DataTableShell className="w-full text-sm">
            <TableHead>
              <TableRow>
                <TableHeader className="w-20 text-center">Actions</TableHeader>
                <TableHeader className="w-20">Fit Score</TableHeader>
                <TableHeader className="min-w-[140px]">Candidate Name</TableHeader>
                <TableHeader className="min-w-[120px]">Role</TableHeader>
                <TableHeader className="min-w-[160px]">Email</TableHeader>
                <TableHeader className="min-w-[110px]">Mobile</TableHeader>
                <TableHeader className="w-28">Stage</TableHeader>
                <TableHeader className="w-28">Sub Stage</TableHeader>
                <TableHeader className="w-24">Experience</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {filteredCandidates.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="w-20 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => handleOpenEditDrawer(app)}
                        className="p-1 hover:bg-subtle rounded text-text-secondary hover:text-brand transition-colors"
                        title="Edit Stage"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => router.push(`/applications/${app.id}`)}
                        className="p-1 hover:bg-subtle rounded text-text-secondary hover:text-brand transition-colors"
                        title="Go to Application Workspace"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="w-20 whitespace-normal text-text-primary font-bold">
                    {app.ai_score != null ? (
                      (app.ai_score / 10).toFixed(1)
                    ) : (
                      <span className="text-text-muted italic">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="font-bold whitespace-normal break-words max-w-[180px]">
                    <span 
                      onClick={() => router.push(`/candidates/${app.candidate_id}`)}
                      className="cursor-pointer text-brand hover:underline font-bold transition-colors"
                      title="View Full Profile"
                    >
                      {app.candidate_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-text-primary font-medium whitespace-normal break-words max-w-[150px]">
                    {app.candidate_designation || 'Candidate'}
                  </TableCell>
                  <TableCell className="text-text-primary text-xs whitespace-normal break-all max-w-[180px]">
                    {app.candidate_email || '-'}
                  </TableCell>
                  <TableCell className="text-text-primary whitespace-normal max-w-[120px]">
                    {app.candidate_phone || '-'}
                  </TableCell>
                  <TableCell className="whitespace-normal w-28">
                    {getStageBadge(app.stage)}
                  </TableCell>
                  <TableCell className="whitespace-normal w-28 text-text-primary text-xs font-semibold capitalize">
                    {app.sub_stage ? (
                      app.sub_stage === 'interview_to_be_scheduled' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenScheduleDrawer(app);
                          }}
                          className="text-left text-brand hover:underline font-bold transition-colors"
                          title="Click to schedule interview"
                        >
                          Interview to be scheduled
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {app.sub_stage.replace(/_/g, ' ')}
                        </span>
                      )
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-text-primary whitespace-normal w-24">
                    {formatExperience(app.candidate_experience)}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </DataTableShell>
        )}
      </div>

      {/* Edit Posting Modal */}
      {isModalOpen && (
        <DrawerShell80
          title="Edit Job Posting"
          onClose={() => setIsModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleFormSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          }
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 text-sm">
            {formError && (
              <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="posting-name" className="font-semibold text-text-primary">
                Posting Name <span className="text-danger">*</span>
              </label>
              <input
                id="posting-name"
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-brand outline-none bg-surface text-text-primary"
                placeholder="e.g. Senior Frontend Developer Public Posting"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="posting-id" className="font-semibold text-text-primary">
                Job Posting ID
              </label>
              <input
                id="posting-id"
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:ring-1 focus:ring-brand outline-none bg-surface disabled:opacity-60 disabled:cursor-not-allowed text-text-secondary"
                placeholder="Auto-generated"
                value={formCode}
                disabled
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                Description
              </label>
              <RichTextEditor
                value={formDescription}
                onChange={setFormDescription}
                placeholder="Describe this posting......"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                Job Description <span className="text-danger">*</span>
              </label>
              <SingleSelect
                options={jobDescriptions.map(jd => ({ id: jd.id, name: jd.title }))}
                selectedId={formJdId}
                onChange={setFormJdId}
                placeholder="Select a Job Description..."
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                HR Manager <span className="text-danger">*</span>
              </label>
              <MultiSelect
                options={hiringManagers.map(u => ({ id: u.id, name: u.full_name }))}
                selectedIds={formHrIds}
                onChange={setFormHrIds}
                placeholder="Assign HR managers..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-text-primary">
                Interviewers <span className="text-danger">*</span>
              </label>
              <MultiSelect
                options={interviewers.map(u => ({ id: u.id, name: u.full_name }))}
                selectedIds={formInterviewerIds}
                onChange={setFormInterviewerIds}
                placeholder="Assign interviewers..."
              />
            </div>
          </form>
        </DrawerShell80>
      )}

      {/* Interactive Side Drawer for Stage Transition */}
      {selectedAppForStage && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
              isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={handleCloseDrawer}
          />

          {/* Drawer Panel */}
          <div 
            className={`fixed top-0 right-0 h-full w-[80vw] bg-surface border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col overflow-hidden ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-subtle/50">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Manage Candidate Stage
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Update status and log feedback for <strong>{selectedAppForStage.candidate_name}</strong>
                </p>
              </div>
              <button 
                onClick={handleCloseDrawer}
                className="p-1.5 hover:bg-subtle rounded-lg text-text-muted hover:text-text-primary transition-colors"
                title="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 grid grid-cols-1 lg:grid-cols-[45%_55%] gap-8">
              {/* Left Column: Details & Reason */}
              <div className="space-y-6 flex flex-col justify-between h-full min-h-0">
                <div className="space-y-6">
                  {/* Candidate Profile Summary */}
                  <Card className="border border-border bg-subtle/30 p-4 rounded-xl shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {selectedAppForStage.candidate_name ? selectedAppForStage.candidate_name[0].toUpperCase() : 'C'}
                      </div>
                      <div>
                        <h4 className="font-bold text-text-primary text-sm">
                          {selectedAppForStage.candidate_name}
                        </h4>
                        <p className="text-xs text-text-secondary">
                          {selectedAppForStage.candidate_designation || 'Candidate'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-3 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div>
                        <span className="text-text-muted block">Email</span>
                        <span className="text-text-primary break-all font-medium">{selectedAppForStage.candidate_email || '-'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Mobile</span>
                        <span className="text-text-primary font-medium">{selectedAppForStage.candidate_phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Experience</span>
                        <span className="text-text-primary font-medium">{formatExperience(selectedAppForStage.candidate_experience)}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Fit Score</span>
                        <span className="text-text-primary font-bold text-brand">
                          {selectedAppForStage.ai_score != null ? `${(selectedAppForStage.ai_score / 10).toFixed(1)} / 10` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Reason Text Area */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex justify-between">
                      <span>Reason / Description for Transition</span>
                    </label>
                    <RichTextEditor
                      value={transitionReason}
                      onChange={setTransitionReason}
                      placeholder="Add interview notes, screening feedback, or reason for moving stages..."
                      className="min-h-[140px]"
                    />
                  </div>

                  {/* Conditional inputs */}
                  {targetStage === 'offered' && (
                    <div className="p-4 border border-brand/20 bg-brand/5 rounded-xl space-y-4">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-brand">
                        Offer Details Required
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-text-primary">
                            Offered CTC / Amount <span className="text-danger">*</span>
                          </label>
                          <input 
                            type="number"
                            placeholder="e.g. 1500000"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-border focus:ring-1 focus:ring-brand outline-none bg-surface text-text-primary"
                            value={offeredAmount}
                            onChange={(e) => setOfferedAmount(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-text-primary">
                            Joining Date
                          </label>
                          <input 
                            type="date"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-border focus:ring-1 focus:ring-brand outline-none bg-surface text-text-primary"
                            value={joiningDate}
                            onChange={(e) => setJoiningDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {targetStage === 'joined' && (
                    <div className="p-4 border border-brand/20 bg-brand/5 rounded-xl space-y-4">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-brand">
                        Joining details Required
                      </h5>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-text-primary">
                          Joining Date <span className="text-danger">*</span>
                        </label>
                        <input 
                          type="date"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-border focus:ring-1 focus:ring-brand outline-none bg-surface text-text-primary"
                          value={joiningDate}
                          onChange={(e) => setJoiningDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Slide-To-Confirm or Instruction */}
                <div className="space-y-4 pt-6 border-t border-border mt-auto">
                  {drawerError && (
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
                      {drawerError}
                    </div>
                  )}

                  {targetStage && targetStage !== normalizeStage(selectedAppForStage.stage) ? (
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        onClick={handleStageTransition}
                        disabled={transitioningStage}
                        className="w-full flex items-center justify-center py-2.5 rounded-xl font-bold"
                      >
                        {transitioningStage ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating Stage...
                          </>
                        ) : (
                          `Move to ${PIPELINE_STAGES.find(st => st.key === targetStage)?.label || ''}`
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-4 border border-dashed border-border rounded-xl bg-subtle/20 text-xs text-text-muted">
                      Select a future stage on the right to confirm the transition.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Stages List */}
              <div className="border-l border-border/50 pl-0 lg:pl-8">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    SELECT TARGET STAGE
                  </span>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto overflow-x-hidden pr-2">
                    {PIPELINE_STAGES.map((st) => {
                      const isCurrent = normalizeStage(selectedAppForStage.stage) === st.key;
                      const isBackward = isBackwardTransition(selectedAppForStage.stage, st.key);
                      const isSelected = targetStage === st.key;
                      const isDisabled = isBackward || isCurrent;

                      return (
                        <button
                          key={st.key}
                          disabled={isDisabled}
                          onClick={() => {
                            setTargetStage(st.key);
                            setDrawerError(null);
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                            isCurrent
                              ? 'border-brand/40 bg-brand/5 cursor-default'
                              : isSelected
                              ? 'border-brand bg-brand/10 text-brand ring-2 ring-brand/15'
                              : isDisabled
                              ? 'border-border bg-subtle/40 opacity-40 cursor-not-allowed'
                              : 'border-border bg-surface hover:border-brand/50 hover:bg-subtle/10 cursor-pointer'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${isCurrent ? 'text-brand' : isSelected ? 'text-brand' : 'text-text-primary group-hover:text-brand'}`}>
                              {st.label} {isCurrent && <span className="text-[10px] font-normal uppercase ml-1.5 px-1.5 py-0.5 rounded bg-brand/10 text-brand animate-pulse">Current</span>}
                            </span>
                            <span className="text-xs text-text-muted mt-0.5">
                              {st.desc}
                            </span>
                          </div>
                          <div className="flex items-center">
                            {isCurrent ? (
                              <div className="w-5 h-5 rounded-full bg-brand/10 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
                              </div>
                            ) : isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            ) : isBackward ? (
                              <span className="text-[10px] font-semibold text-text-muted/60 bg-subtle/50 px-1.5 py-0.5 rounded uppercase tracking-wider">Blocked</span>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-border group-hover:border-brand/50 flex items-center justify-center transition-colors" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {isScheduleOpen && selectedAppForSchedule && (
        <DrawerShell
          title="Schedule Interview"
          onClose={() => {
            setIsScheduleOpen(false);
            setSelectedAppForSchedule(null);
          }}
          footer={
            <div className="flex gap-3 justify-end w-full">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsScheduleOpen(false);
                  setSelectedAppForSchedule(null);
                }}
                disabled={scheduling}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleScheduleSubmit}
                disabled={scheduling}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {scheduling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Send Email & Schedule
              </Button>
            </div>
          }
        >
          <form className="space-y-4 text-text-primary text-left animate-in fade-in duration-200" onSubmit={handleScheduleSubmit}>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                Round Type
              </label>
              <select
                value={roundType}
                onChange={(e) => setRoundType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"
              >
                <option value="tech1">Technical Round 1</option>
                <option value="tech2">Technical Round 2</option>
                <option value="hr">HR Round</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"
                  min={15}
                  step={15}
                />
              </div>
            </div>

            {mode === 'online' ? (
              <div className="text-left space-y-3">
                {/* 1. Meeting Provider Field */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Meeting Provider
                  </label>
                  {activeProviders.length > 0 ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedMeetingProvider}
                        onChange={(e) => {
                          setSelectedMeetingProvider(e.target.value);
                          setMeetingLink('');
                          setExternalEventId('');
                          setMeetingLinkEditable(false);
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-surface"
                      >
                        <option value="">Select provider...</option>
                        {activeProviders.map((p: any) => (
                          <option key={p.provider} value={p.provider}>
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedMeetingProvider || generatingLink || (selectedMeetingProvider === 'GOOGLE_MEET' && !googleConnected)}
                        onClick={handleGenerateMeetingLink}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-brand text-brand hover:bg-brand/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {generatingLink
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RefreshCw className="w-4 h-4" />}
                        Generate
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      <Video className="w-4 h-4 flex-shrink-0" />
                      <span>No meeting providers configured. Configure one in admin settings.</span>
                    </div>
                  )}
                </div>

                {/* Google Connection helper if GOOGLE_MEET selected */}
                {selectedMeetingProvider === 'GOOGLE_MEET' && (
                  <div className="p-3 border border-border rounded-md bg-slate-50 flex items-center justify-between text-xs">
                    {checkingGoogle ? (
                      <div className="flex items-center gap-2 text-text-muted">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Checking Google Calendar connection...</span>
                      </div>
                    ) : googleConnected ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-emerald-600">Connected to Google Calendar</span>
                          <span className="text-[10px] text-text-secondary">{googleEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDisconnectGoogle}
                          className="text-rose-600 hover:underline font-medium"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-text-secondary">Connect Google Calendar to auto-generate Meet links</span>
                        <button
                          type="button"
                          onClick={handleConnectGoogle}
                          className="px-2 py-1 bg-brand text-white rounded hover:bg-brand/90 font-medium"
                        >
                          Connect Account
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Meeting Link Field */}
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                    Meeting Link
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="Meeting link will populate here after generation, or type manually..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-text-primary"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-left">
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  Location / Room
                </label>
                <input
                  type="text"
                  placeholder="Conference Room A"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                To (Interviewers)
              </label>
              <MultiSelect
                options={schedInterviewers}
                selectedIds={selectedInterviewers}
                onChange={setSelectedInterviewers}
                placeholder="Select interviewers..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                CC (Hiring Manager / HR)
              </label>
              <MultiSelect
                options={ccOptions}
                selectedIds={selectedCc}
                onChange={setSelectedCc}
                placeholder="Select CC recipients..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                Email Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                Note <span className="font-normal normal-case text-text-muted ml-1">(optional)</span>
              </label>
              <RichTextEditor
                value={note}
                onChange={setNote}
                placeholder="Optional instructions from HR for the candidate and interviewer..."
              />
            </div>
          </form>
        </DrawerShell>
      )}
    </div>
  );
}
