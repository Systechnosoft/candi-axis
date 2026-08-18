'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CandidateForm } from '../components/CandidateForm';
import { CandidatesService } from '@/lib/api/candidates';
import { AdminService } from '@/lib/api/admin';
import { tagsApi } from '@/lib/api/tags';
import { CandidateFormValues, DuplicateMatchResponse } from '@/types/candidates';
import { Tag } from '@/types/tags';
import { Button } from '@/components/primitives/Button';
import { UploadCloud, File, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { formatToHtmlBullets } from '@/lib/utils';

// --- Field mapping helpers from backend ParsedResume schema ---

/**
 * Convert a "Mon YYYY" or "YYYY" date string to a yyyy-MM-dd string
 * compatible with <input type="date">. Falls back to empty string.
 */
const toIsoDate = (raw?: string): string => {
  if (!raw || raw.toLowerCase() === 'present') return '';
  // Already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // "Mon YYYY" → "YYYY-MM-01"
  const m = raw.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (m) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const mo = months[m[1].toLowerCase()] || '01';
    return `${m[2]}-${mo}-01`;
  }
  // "YYYY" only
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  return '';
};

const extractYear = (raw?: string): number | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : undefined;
};

const mapQualificationLevel = (degree?: string, field?: string): string => {
  const combined = `${degree || ''} ${field || ''}`.toLowerCase();
  if (combined.includes('phd') || combined.includes('doctor')) return 'doctorate';
  if (combined.includes('master') || combined.includes('msc') || combined.includes('mba') || combined.includes('me ') || combined.includes('m.tech') || combined.includes('m.e')) return 'master';
  if (combined.includes('bachelor') || combined.includes('bsc') || combined.includes('be ') || combined.includes('b.tech') || combined.includes('b.e') || combined.includes('bca') || combined.includes('bba')) return 'bachelor';
  if (combined.includes('diploma')) return 'diploma';
  if (combined.includes('higher secondary') || combined.includes('12th') || combined.includes('hsc') || combined.includes('intermediate')) return 'higher_secondary';
  if (combined.includes('secondary') || combined.includes('10th') || combined.includes('ssc') || combined.includes('matric')) return 'secondary';
  return 'other';
};

/**
 * Map the backend ParsedResume JSON (from resume-ai-parser.service.ts) to CandidateFormValues.
 * This must match the exact schema returned by the AI prompt.
 * annotatedLinks: URLs extracted from PDF annotations (hyperlinks), keyed by type.
 */
const mapParsedResumeToForm = (
  parsed: Record<string, any>,
  annotatedLinks: Array<{ type: string; url: string }> = [],
): Partial<CandidateFormValues> => {
  // Derive first/last from full_name
  const fullName: string = parsed.full_name || '';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const employments = (parsed.employment || []).map((emp: any) => ({
    company_name: emp.company || '',
    job_title: emp.title || '',
    start_date: toIsoDate(emp.start_date),
    end_date: toIsoDate(emp.end_date),
    is_current: emp.end_date?.toLowerCase() === 'present' || !emp.end_date,
    responsibilities_summary: formatToHtmlBullets(emp.description || ''),
  }));

  // Auto-detect current company from most recent employment
  const currentEmp = employments.find((e: any) => e.is_current) || employments[0];

  const educations = (parsed.education || []).map((ed: any) => ({
    institution_name: ed.institution || '',
    degree: ed.degree || '',
    field_of_study: ed.field_of_study || '',
    qualification_level: mapQualificationLevel(ed.degree, ed.field_of_study),
    start_year: extractYear(ed.start_year),
    end_year: extractYear(ed.end_year),
  }));

  const certifications = (parsed.certifications || []).map((c: any) => ({
    certification_name: c.name || c.certification_name || '',
    issuer: c.issuer || '',
    issued_on: toIsoDate(c.issued_on),
    expiry_on: toIsoDate(c.expiry_on),
    does_not_expire: !c.expiry_on || c.expiry_on.toLowerCase() === 'present',
  }));

  // Build social links: prefer PDF annotation URLs (real hyperlinks) over text-extracted URLs
  const annotatedMap = new Map<string, string>();
  for (const link of annotatedLinks) {
    const t = link.type.toLowerCase();
    if (!annotatedMap.has(t)) annotatedMap.set(t, link.url);
  }

  const socialLinks: CandidateFormValues['social_links'] = [];
  const seenTypes = new Set<string>();

  const addLink = (type: string, aiUrl?: string) => {
    if (seenTypes.has(type)) return;
    const url = ensureHttps(annotatedMap.get(type) || aiUrl || '');
    if (!url) return;
    socialLinks.push({ link_type: type, url, is_primary: socialLinks.length === 0 });
    seenTypes.add(type);
  };

  addLink('linkedin', parsed.linkedin_url);
  addLink('github', parsed.github_url);
  addLink('portfolio', parsed.portfolio_url);

  // Add any extra annotated links not already covered
  for (const link of annotatedLinks) {
    const t = link.type.toLowerCase();
    if (!seenTypes.has(t)) {
      socialLinks.push({ link_type: t, url: ensureHttps(link.url) });
      seenTypes.add(t);
    }
  }

  const expMonths = parsed.total_experience_months
    ? Math.round(Number(parsed.total_experience_months))
    : 0;

  return {
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    email: parsed.email || '',
    phone: parsed.phone || '',
    location: parsed.location || '',
    current_company: currentEmp?.company_name || '',
    current_designation: currentEmp?.job_title || '',
    total_exp_months: expMonths > 0 ? String(expMonths) : '',
    relevant_exp_months: '',
    notice_period_days: parsed.notice_period_days ? String(parsed.notice_period_days) : '',
    current_ctc: parsed.current_ctc ? String(parsed.current_ctc) : '',
    expected_ctc: parsed.expected_ctc ? String(parsed.expected_ctc) : '',
    profile_summary: formatToHtmlBullets(parsed.summary || ''),
    employments,
    educations,
    certifications,
    social_links: socialLinks,
    tags: [], // will be populated after tag matching
  };
};

const ensureHttps = (url?: string): string => {
  if (!url || !url.trim()) return '';
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('www.') || u.includes('.')) return `https://${u}`;
  return u;
};

/**
 * Match an array of skill name strings against the tag dictionary.
 * Returns Tag objects for all skills that exist in the DB.
 * Skills not yet in DB are ignored here — they get auto-created on save by the backend.
 */
const matchSkillsToTags = async (skills: string[]): Promise<Tag[]> => {
  if (!skills || skills.length === 0) return [];
  const results: Tag[] = [];
  const seen = new Set<string>();

  // Batch into chunks of 10 to avoid too many simultaneous requests
  const chunks: string[][] = [];
  for (let i = 0; i < skills.length; i += 10) {
    chunks.push(skills.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (skill) => {
      const normalizedSkill = skill.trim().toLowerCase();
      if (!normalizedSkill || seen.has(normalizedSkill)) return;
      seen.add(normalizedSkill);
      try {
        const suggestions = await tagsApi.getSuggestions({ search: skill, type: 'skill' });
        const match = suggestions.find(s => s.name.toLowerCase() === normalizedSkill);
        if (match) {
          results.push({ id: match.id, name: match.name, type: match.type, active: true } as Tag);
        } else if (suggestions.length > 0) {
          // Use best suggestion if close enough (starts with same prefix)
          const best = suggestions[0];
          if (best.name.toLowerCase().startsWith(normalizedSkill.substring(0, 3))) {
            results.push({ id: best.id, name: best.name, type: best.type, active: true } as Tag);
          } else {
            results.push({ id: skill, name: skill, type: 'skill', active: true } as Tag);
          }
        } else {
          results.push({ id: skill, name: skill, type: 'skill', active: true } as Tag);
        }
      } catch {
        results.push({ id: skill, name: skill, type: 'skill', active: true } as Tag);
      }
    }));
  }
  return results;
};

// ---- Page Component ----

interface ActiveProviderStatus {
  provider: string;
  providerValue: string;
  model: string;
  isConfigured: boolean;
  validationError: string | null;
}

export default function ParsedIntakePage() {
  const router = useRouter();

  // UI State Flows: 'upload' -> 'parsing' -> 'review'
  const [step, setStep] = useState<'upload' | 'parsing' | 'review'>('upload');
  const [parseStatusMsg, setParseStatusMsg] = useState<string>('Uploading resume...');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [parsedFormValues, setParsedFormValues] = useState<Partial<CandidateFormValues> | null>(null);
  const [rawParsedJson, setRawParsedJson] = useState<Record<string, unknown> | null>(null);

  // Form Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateData, setDuplicateData] = useState<DuplicateMatchResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [providerStatus, setProviderStatus] = useState<ActiveProviderStatus | null>(null);
  const [providerLoading, setProviderLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setProviderLoading(true);
        const res = await AdminService.getActiveAiProvider();
        setProviderStatus(res);
      } catch (err) {
        console.error('Failed to fetch active AI provider status:', err);
      } finally {
        setProviderLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile) return;
    setStep('parsing');
    setError(null);
    setParseStatusMsg('Uploading resume...');

    try {
      const docResult = await CandidatesService.uploadAndParseResume(
        selectedFile,
        (status) => {
          if (status === 'pending') setParseStatusMsg('Resume queued for parsing...');
          else if (status === 'processing') setParseStatusMsg('AI is extracting candidate information...');
        },
      );

      setDocumentId(docResult.id);

      // docResult.parsed_json is the raw ParsedResume JSON from backend
      const parsed = docResult.parsed_json as Record<string, any>;
      if (!parsed || Object.keys(parsed).length === 0) {
        throw new Error('The AI parser returned empty results. Please check your AI configuration and try again.');
      }

      setRawParsedJson(parsed);

      // Extract annotated links stored by the processor (linkedin, github etc from PDF annotations)
      const annotatedLinks: Array<{ type: string; url: string }> =
        Array.isArray((docResult as any).annotated_links)
          ? (docResult as any).annotated_links
          : [];

      // Map the parsed JSON to form values using both text-extracted and annotated links
      const formValues = mapParsedResumeToForm(parsed, annotatedLinks);

      // Match AI-extracted skills against the tag dictionary and pre-populate tags
      setParseStatusMsg('Matching skills to tag dictionary...');
      const skills: string[] = Array.isArray(parsed.skills) ? parsed.skills : [];
      const matchedTags = await matchSkillsToTags(skills);
      formValues.tags = matchedTags;

      setParsedFormValues(formValues);
      setStep('review');
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Failed to upload or parse document. Please try again.');
      setStep('upload');
    }
  };

  const handleSubmit = async (data: CandidateFormValues) => {
    if (!documentId || !rawParsedJson) return;

    setIsSubmitting(true);
    setError(null);
    setDuplicateData(null);

    try {
      await CandidatesService.createParsed({
        document_id: documentId,
        parsed_json: rawParsedJson,
        candidate_data: {
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
          source: 'resume_upload',
          educations: data.educations,
          employments: data.employments,
          certifications: data.certifications,
          social_links: data.social_links,
          tags: data.tags?.map((t) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(t.id) ? t.id : t.name;
          }),
        },
      });
      router.push('/candidates');
    } catch (err: any) {
      if (err.status === 409) {
        setError(err.data?.message || 'A duplicate candidate was detected.');
        setDuplicateData({
          message: err.data?.message || 'A duplicate candidate was detected.',
          duplicates: err.data?.duplicates || [],
        });
      } else {
        setError(err.data?.message || err.message || 'Failed to finalize candidate creation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="flex flex-col bg-surface">
      <div className="p-6 border-b border-border bg-surface">
        <h1 className="text-2xl font-semibold text-text-primary">
          {step === 'review' ? 'Review Parsed Candidate' : 'Upload Resume'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {step === 'review'
            ? 'Verify the AI-extracted data below, make any corrections, and confirm to create the candidate.'
            : 'Select a PDF or DOCX file. Our AI will extract all candidate information automatically.'}
        </p>
      </div>

      <div className="p-6 flex-1 w-full max-w-5xl mx-auto pt-8">

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="max-w-xl mx-auto">
            {/* AI Provider Status Banner */}
            <div className="mb-6 rounded-lg border border-border bg-subtle/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <Sparkles className="w-5 h-5 text-brand flex-shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">
                    AI Parsing Provider: {providerLoading ? 'Loading...' : providerStatus?.provider || 'None'}
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Model: {providerLoading ? '...' : providerStatus?.model || 'None'}
                  </p>
                </div>
              </div>
              <div>
                {providerLoading ? (
                  <span className="inline-flex items-center text-xs text-text-muted">
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Checking configuration...
                  </span>
                ) : providerStatus?.isConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success-dark border border-success/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    API key configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-error-50 text-error-dark border border-error/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-error" />
                    Configuration Incomplete
                  </span>
                )}
              </div>
            </div>

            {/* Provider Error Banner */}
            {!providerLoading && providerStatus && !providerStatus.isConfigured && (
              <div className="mb-6 p-4 bg-error-50 border border-error rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error-dark flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-semibold text-error-dark">Parsing Disabled</h5>
                  <p className="text-xs text-error-dark/80 mt-1">{providerStatus.validationError}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 mb-6 bg-error-50 text-error-dark border border-error rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div
              className={`
                border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center bg-surface-elevated transition-colors
                ${(!providerLoading && providerStatus?.isConfigured) ? 'hover:bg-brand-50 cursor-pointer' : 'opacity-60 cursor-not-allowed'}
              `}
              onClick={() => {
                if (!providerLoading && providerStatus?.isConfigured) {
                  fileInputRef.current?.click();
                }
              }}
            >
              <UploadCloud className="w-10 h-10 text-brand mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-1">Click to browse or drag file here</h3>
              <p className="text-sm text-text-secondary">Supported formats: PDF, DOCX (Max 10MB)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
                disabled={providerLoading || !providerStatus?.isConfigured}
              />
            </div>

            {selectedFile && (
              <div className="mt-6 p-4 border border-border rounded-lg flex items-center justify-between bg-surface">
                <div className="flex items-center gap-3">
                  <File className="w-6 h-6 text-text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{selectedFile.name}</p>
                    <p className="text-xs text-text-secondary">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleUploadAndParse}
                  disabled={providerLoading || !providerStatus?.isConfigured}
                >
                  Start Parsing
                </Button>
              </div>
            )}

            <div className="mt-12 flex justify-end">
              <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Step: Parsing Loading */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">AI Parsing in Progress</h3>
            <p className="text-sm text-text-secondary mb-4">{parseStatusMsg}</p>
            <p className="text-xs text-text-muted">This typically takes 10–30 seconds. Please don&apos;t close this page.</p>
          </div>
        )}

        {/* Step: Review — CandidateForm already shows the parsed success banner internally */}
        {step === 'review' && parsedFormValues && (
          <CandidateForm
            mode="parsed"
            initialValues={parsedFormValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            submitError={error}
            duplicateData={duplicateData}
          />
        )}
      </div>
    </div>
  );
}
