'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/primitives/Card';
import { cleanText, formatToHtmlBullets } from '@/lib/utils';
import { CandidateFormValues, DuplicateMatchResponse, CandidateEducation, CandidateEmployment, CandidateCertification, CandidateSocialLink } from '@/types/candidates';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { TagSelector } from '@/components/ats/TagSelector';
import { Tag } from '@/types/tags';
import { RichTextEditor } from '@/components/primitives/RichTextEditor';

interface CandidateFormProps {
  mode: 'manual' | 'parsed' | 'edit';
  readOnly?: boolean;
  initialValues?: Partial<CandidateFormValues>;
  onSubmit: (data: CandidateFormValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  submitError?: string | null;
  duplicateData?: DuplicateMatchResponse | null;
  hasApplications?: boolean;
  onClearError?: () => void;
}

const formatMonthYear = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Convert YYYY-MM-DD (or YYYY-MM) to YYYY-MM for <input type="month">
const toMonthValue = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;
  // YYYY-MM-DD â†’ YYYY-MM
  const match = dateStr.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : '';
};

// Convert YYYY-MM back to YYYY-MM-01 for storage consistency
const fromMonthValue = (monthVal: string): string => {
  if (!monthVal) return '';
  return monthVal + '-01';
};

export const CandidateForm: React.FC<CandidateFormProps> = ({
  mode,
  readOnly = false,
  initialValues,
  onSubmit,
  isSubmitting,
  onCancel,
  submitError,
  duplicateData,
  hasApplications = false,
  onClearError,
}) => {
  const [showSuccessBanner, setShowSuccessBanner] = useState(true);
  const [formData, setFormData] = useState<CandidateFormValues>({
    full_name: '',
    first_name: '',
    last_name: '',
    email: '',
    secondary_email: '',
    phone: '',
    secondary_phone: '',
    location: '',
    current_company: '',
    current_designation: '',
    total_exp_months: '',
    relevant_exp_months: '',
    notice_period_days: '',
    current_ctc: '',
    expected_ctc: '',
    profile_summary: '',
    educations: [],
    employments: [],
    certifications: [],
    projects: [],
    social_links: [],
    tags: [],
  });

  const isBasicReadOnly = readOnly || hasApplications;

  useEffect(() => {
    if (mode === 'parsed' && showSuccessBanner) {
      const timer = setTimeout(() => setShowSuccessBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [mode, showSuccessBanner]);

  useEffect(() => {
    if (initialValues) {
      const formattedEmployments = (initialValues.employments || []).map(emp => ({
        ...emp,
        responsibilities_summary: formatToHtmlBullets(emp.responsibilities_summary),
      }));

      setFormData(prev => ({
        ...prev,
        ...initialValues,
        secondary_email: initialValues.secondary_email || '',
        secondary_phone: initialValues.secondary_phone || '',
        profile_summary: formatToHtmlBullets(initialValues.profile_summary),
        employments: formattedEmployments,
        educations: initialValues.educations || prev.educations,
        certifications: initialValues.certifications || prev.certifications,
        projects: initialValues.projects || prev.projects,
        social_links: initialValues.social_links || prev.social_links,
        tags: initialValues.tags || prev.tags,
      }));
    }
  }, [initialValues]);

  const handleBlur = (field: keyof CandidateFormValues) => {
    const val = formData[field];
    if (typeof val === 'string') {
      setFormData(prev => ({ ...prev, [field]: cleanText(val) }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, field: keyof CandidateFormValues) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  // --- Dynamic Array Handlers ---

  // Education
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      educations: [...prev.educations, {}]
    }));
  };
  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }));
  };
  const handleEducationChange = <K extends keyof CandidateEducation>(index: number, field: K, value: CandidateEducation[K]) => {
    setFormData(prev => {
      const updated = [...prev.educations];
      updated[index] = { ...updated[index], [field]: value };

      // If setting this to highest, unset others
      if (field === 'is_highest' && value === true) {
        updated.forEach((ed, i) => { if (i !== index) ed.is_highest = false; });
      }
      return { ...prev, educations: updated };
    });
  };

  // Employment
  const addEmployment = () => {
    setFormData(prev => ({
      ...prev,
      employments: [...prev.employments, { company_name: '' }] // company_name required
    }));
  };
  const removeEmployment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      employments: prev.employments.filter((_, i) => i !== index)
    }));
  };
  const handleEmploymentChange = <K extends keyof CandidateEmployment>(index: number, field: K, value: CandidateEmployment[K]) => {
    setFormData(prev => {
      const updated = [...prev.employments];
      updated[index] = { ...updated[index], [field]: value };

      // If setting this to current, unset others
      if (field === 'is_current') {
        if (value === true) {
          updated.forEach((emp, i) => { if (i !== index) emp.is_current = false; });
          
          // Save the existing end date in case they uncheck
          if (updated[index].end_date) {
            (updated[index] as any)._prev_end_date = updated[index].end_date;
          }
          
          // Set to actual current month/year using existing utility
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          updated[index].end_date = fromMonthValue(currentMonth);
        } else {
          // Restore previous end date if it was saved
          if ((updated[index] as any)._prev_end_date) {
            updated[index].end_date = (updated[index] as any)._prev_end_date;
          }
        }
      }
      return { ...prev, employments: updated };
    });
  };

  // Certification
  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, { certification_name: '' }] // required
    }));
  };
  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };
  const handleCertificationChange = <K extends keyof CandidateCertification>(index: number, field: K, value: CandidateCertification[K]) => {
    setFormData(prev => {
      const updated = [...prev.certifications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, certifications: updated };
    });
  };

  // Social Links
  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      social_links: [...prev.social_links, { link_type: 'linkedin', url: '' }]
    }));
  };
  const removeSocialLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index)
    }));
  };
  const handleSocialLinkChange = <K extends keyof CandidateSocialLink>(index: number, field: K, value: CandidateSocialLink[K]) => {
    setFormData(prev => {
      const updated = [...prev.social_links];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'is_primary' && value === true) {
        // Enforce unique primary per link_type
        const currentType = updated[index].link_type;
        updated.forEach((link, i) => {
          if (i !== index && link.link_type === currentType) link.is_primary = false;
        });
      }
      return { ...prev, social_links: updated };
    });
  };

  // --- Submit ---
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Explicit final clean
    const cleanedFullName = cleanText(formData.full_name);
    if (!cleanedFullName) {
      alert("Full Name cannot be empty.");
      return;
    }

    const cleanedData: CandidateFormValues = { ...formData, full_name: cleanedFullName };

    // Clean string fields at root level
    const rootStringKeys = ['first_name', 'last_name', 'email', 'secondary_email', 'phone', 'secondary_phone', 'location', 'current_company', 'current_designation', 'profile_summary'] as const;
    rootStringKeys.forEach(k => {
      cleanedData[k] = cleanText(cleanedData[k]);
    });

    // Validate Employments (required fields)
    const invalidEmployments = cleanedData.employments.some(emp => !cleanText(emp.company_name));
    if (invalidEmployments) {
      alert("All employment records must have a Company Name.");
      return;
    }
    const missingJobRole = cleanedData.employments.some(emp => !cleanText(emp.job_title));
    if (missingJobRole) {
      alert("All employment records must have a Job Role.");
      return;
    }
    const missingEmpType = cleanedData.employments.some(emp => !emp.employment_type);
    if (missingEmpType) {
      alert("All employment records must have an Employment Type.");
      return;
    }

    // Validate Certifications (name non empty)
    const invalidCertifications = cleanedData.certifications.some(cert => !cleanText(cert.certification_name));
    if (invalidCertifications) {
      alert("All certification records must have a Certification Name.");
      return;
    }

    // Validate Social Links (url non empty)
    const invalidLinks = cleanedData.social_links.some(lnk => !cleanText(lnk.url));
    if (invalidLinks) {
      alert("All social links must have a valid URL.");
      return;
    }

    // Clean Arrays
    cleanedData.employments = cleanedData.employments.map(emp => ({ ...emp, company_name: cleanText(emp.company_name) }));
    cleanedData.certifications = cleanedData.certifications.map(cert => ({ ...cert, certification_name: cleanText(cert.certification_name) }));
    cleanedData.social_links = cleanedData.social_links.map(link => ({ ...link, url: cleanText(link.url) }));

    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-8 pb-12 w-full max-w-4xl mx-auto relative">
      {mode === 'parsed' && showSuccessBanner && (!submitError || !submitError.startsWith('AI Parsing failed')) && (
        <div className="bg-brand-50 border border-brand/20 p-4 rounded-lg flex items-start gap-3 relative transition-opacity duration-300">
          <CheckCircle2 className="w-5 h-5 text-brand mt-0.5" />
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-medium text-brand-dark">Resume Parsed Successfully</h4>
          </div>
          <button 
            type="button" 
            onClick={() => setShowSuccessBanner(false)}
            className="absolute top-4 right-4 text-brand hover:text-brand-dark transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {submitError && (
        <div className="bg-error-50 border border-error p-4 rounded-lg flex items-start gap-3 relative">
          <AlertCircle className="w-5 h-5 text-error mt-0.5" />
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-medium text-error-dark">{submitError}</h4>
            {duplicateData?.duplicates && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-error-dark font-semibold">Duplicate candidates found:</p>
                <ul className="list-disc pl-5 text-sm text-error-dark max-h-32 overflow-y-auto">
                  {duplicateData.duplicates.map((dup) => (
                    <li key={dup.candidateId}>
                      Confidence: {Math.round(dup.confidenceScore * 100)}% - Identity Signals: {JSON.stringify(dup.signals)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {onClearError && (
            <button 
              type="button" 
              onClick={onClearError}
              className="absolute top-4 right-4 text-error hover:text-error-dark transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Section 1: Basic Details */}
      <fieldset disabled={isBasicReadOnly} className="contents">
        <Card className="p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-6 pb-2 border-b border-border/50">Basic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-text-primary">Full Name <span className="text-error">*</span></label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.full_name}
                onChange={e => handleChange(e, 'full_name')}
                onBlur={() => handleBlur('full_name')}
                placeholder="e.g. John Doe"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-text-primary">Email Address</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.email}
                onChange={e => handleChange(e, 'email')}
                onBlur={() => handleBlur('email')}
                placeholder="e.g. john@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">First Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.first_name}
                onChange={e => handleChange(e, 'first_name')}
                onBlur={() => handleBlur('first_name')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Last Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.last_name}
                onChange={e => handleChange(e, 'last_name')}
                onBlur={() => handleBlur('last_name')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Phone Number</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.phone}
                onChange={e => handleChange(e, 'phone')}
                onBlur={() => handleBlur('phone')}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Location</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.location}
                onChange={e => handleChange(e, 'location')}
                onBlur={() => handleBlur('location')}
                placeholder="City, State"
              />
            </div>
          </div>
        </Card>

        {/* Profile Summary */}
        <Card className="p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-4 pb-2 border-b border-border/50">Profile Summary</h3>
          {isBasicReadOnly ? (
            <div className="prose prose-sm max-w-none text-text-secondary text-sm" dangerouslySetInnerHTML={{ __html: formData.profile_summary || '<em>Not provided</em>' }} />
          ) : (
            <RichTextEditor
              value={formData.profile_summary}
              onChange={(val) => setFormData(prev => ({ ...prev, profile_summary: val }))}
              placeholder="Brief profile overview..."
            />
          )}
        </Card>

        {/* Professional Snapshot */}
        <Card className="p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-6 pb-2 border-b border-border/50">Professional Snapshot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Current Company</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm" value={formData.current_company} onChange={e => handleChange(e, 'current_company')} onBlur={() => handleBlur('current_company')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Current Designation</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm" value={formData.current_designation} onChange={e => handleChange(e, 'current_designation')} onBlur={() => handleBlur('current_designation')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Total Experience (Months)</label>
              <input type="number" min="0" className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm" value={formData.total_exp_months} onChange={e => handleChange(e, 'total_exp_months')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Relevant Experience (Months)</label>
              <input type="number" min="0" className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm" value={formData.relevant_exp_months} onChange={e => handleChange(e, 'relevant_exp_months')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Notice Period (Days)</label>
              <input type="number" min="0" className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm" value={formData.notice_period_days} onChange={e => handleChange(e, 'notice_period_days')} />
            </div>
          </div>
        </Card>

        {/* Employments Details Section */}
        <Card className="p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
            <h3 className="text-lg font-semibold text-text-primary">Employment Details</h3>
            {!isBasicReadOnly && (
              <Button variant="secondary" type="button" onClick={addEmployment} className="gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Add Employment
              </Button>
            )}
          </div>

          {formData.employments.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-4 bg-subtle rounded-md border border-dashed border-border mb-2">No employment history added.</div>
          ) : (
            <div className="flex flex-col gap-6">
              {formData.employments.map((emp, index) => (
                <div key={index} className="relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-surface">
                  {!isBasicReadOnly && (
                    <button type="button" onClick={() => removeEmployment(index)} className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-surface border border-border rounded-full text-error hover:bg-error-50 shadow-sm transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Company Name <span className="text-error">*</span></label>
                    <input required type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={emp.company_name || ''} onChange={(e) => handleEmploymentChange(index, 'company_name', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Job Role <span className="text-error">*</span></label>
                    <input required type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={emp.job_title || ''} onChange={(e) => handleEmploymentChange(index, 'job_title', e.target.value)} placeholder="e.g. Software Engineer" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Employment Type <span className="text-error">*</span></label>
                    <select required className="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface" value={emp.employment_type || ''} onChange={(e) => handleEmploymentChange(index, 'employment_type', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                      <option value="freelance">Freelance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Location</label>
                    <input type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={emp.location || ''} onChange={(e) => handleEmploymentChange(index, 'location', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Start Date</label>
                    {isBasicReadOnly ? (
                      <span className="text-sm text-text-primary">{formatMonthYear(emp.start_date)}</span>
                    ) : (
                      <input type="month" className={`w-full px-3 py-2 border border-border rounded-md text-sm ${!toMonthValue(emp.start_date) ? 'date-input-empty' : ''}`} value={toMonthValue(emp.start_date)} onChange={(e) => handleEmploymentChange(index, 'start_date', fromMonthValue(e.target.value))} />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">End Date</label>
                    {isBasicReadOnly ? (
                      <span className="text-sm text-text-primary">{emp.is_current ? 'Present' : formatMonthYear(emp.end_date)}</span>
                    ) : (
                      <input type="month" disabled={emp.is_current} className={`w-full px-3 py-2 border border-border rounded-md text-sm disabled:bg-subtle disabled:text-text-muted ${!toMonthValue(emp.end_date) ? 'date-input-empty' : ''}`} value={toMonthValue(emp.end_date)} onChange={(e) => handleEmploymentChange(index, 'end_date', fromMonthValue(e.target.value))} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" id={`current-emp-${index}`} checked={emp.is_current || false} onChange={(e) => handleEmploymentChange(index, 'is_current', e.target.checked)} className="w-4 h-4 rounded text-brand focus:ring-brand" />
                    <label htmlFor={`current-emp-${index}`} className="text-sm font-medium text-text-primary cursor-pointer">I currently work here</label>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-text-primary">Responsibilities Summary</label>
                    {isBasicReadOnly ? (
                      <div className="prose prose-sm max-w-none text-text-secondary text-sm" dangerouslySetInnerHTML={{ __html: emp.responsibilities_summary || '<em>Not provided</em>' }} />
                    ) : (
                      <RichTextEditor value={emp.responsibilities_summary || ''} onChange={(val) => handleEmploymentChange(index, 'responsibilities_summary', val)} placeholder="Describe key responsibilities..." />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Educational Details Section */}
        <Card className="p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
            <h3 className="text-lg font-semibold text-text-primary">Educational Details</h3>
            {!isBasicReadOnly && (
              <Button variant="secondary" type="button" onClick={addEducation} className="gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Add Education
              </Button>
            )}
          </div>

          {formData.educations.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-4 bg-subtle rounded-md border border-dashed border-border mb-2">No educational history added.</div>
          ) : (
            <div className="flex flex-col gap-6">
              {formData.educations.map((ed, index) => (
                <div key={index} className="relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-surface">
                  {!isBasicReadOnly && (
                    <button type="button" onClick={() => removeEducation(index)} className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-surface border border-border rounded-full text-error hover:bg-error-50 shadow-sm transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-text-primary">Institution/University Name</label>
                    <input type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={ed.institution_name || ''} onChange={(e) => handleEducationChange(index, 'institution_name', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Qualification Level</label>
                    <select className="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface" value={ed.qualification_level || ''} onChange={(e) => handleEducationChange(index, 'qualification_level', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="secondary">Secondary</option>
                      <option value="higher_secondary">Higher Secondary</option>
                      <option value="diploma">Diploma</option>
                      <option value="bachelor">Bachelor&apos;s</option>
                      <option value="master">Master&apos;s</option>
                      <option value="doctorate">Doctorate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Degree Name</label>
                    <input type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={ed.degree || ''} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} placeholder="e.g. B.Tech, BSc" />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-text-primary">Field of Study</label>
                    <input type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={ed.field_of_study || ''} onChange={(e) => handleEducationChange(index, 'field_of_study', e.target.value)} placeholder="e.g. Computer Science" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Start Year</label>
                    <input type="number" min="1900" max="2100" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={ed.start_year || ''} onChange={(e) => handleEducationChange(index, 'start_year', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">End Year</label>
                    <input type="number" min="1900" max="2100" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={ed.end_year || ''} onChange={(e) => handleEducationChange(index, 'end_year', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" id={`highest-ed-${index}`} checked={ed.is_highest || false} onChange={(e) => handleEducationChange(index, 'is_highest', e.target.checked)} className="w-4 h-4 rounded text-brand focus:ring-brand" />
                    <label htmlFor={`highest-ed-${index}`} className="text-sm font-medium text-text-primary cursor-pointer">This is my highest qualification</label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Certifications Section */}
        <Card className="p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
            <h3 className="text-lg font-semibold text-text-primary">Certifications</h3>
            {!isBasicReadOnly && (
              <Button variant="secondary" type="button" onClick={addCertification} className="gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Add Certification
              </Button>
            )}
          </div>

          {formData.certifications.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-4 bg-subtle rounded-md border border-dashed border-border mb-2">No certifications added.</div>
          ) : (
            <div className="flex flex-col gap-6">
              {formData.certifications.map((cert, index) => (
                <div key={index} className="relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-surface">
                  {!isBasicReadOnly && (
                    <button type="button" onClick={() => removeCertification(index)} className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-surface border border-border rounded-full text-error hover:bg-error-50 shadow-sm transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Certification Name <span className="text-error">*</span></label>
                    <input required type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={cert.certification_name || ''} onChange={(e) => handleCertificationChange(index, 'certification_name', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Issuer</label>
                    <input type="text" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={cert.issuer || ''} onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Issued On</label>
                    {isBasicReadOnly ? (
                      <span className="text-sm text-text-primary">{formatMonthYear(cert.issued_on)}</span>
                    ) : (
                      <input type="month" className={`w-full px-3 py-2 border border-border rounded-md text-sm ${!toMonthValue(cert.issued_on) ? 'date-input-empty' : ''}`} value={toMonthValue(cert.issued_on)} onChange={(e) => handleCertificationChange(index, 'issued_on', fromMonthValue(e.target.value))} />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">Expiry On</label>
                    {isBasicReadOnly ? (
                      <span className="text-sm text-text-primary">{cert.does_not_expire ? 'Does not expire' : formatMonthYear(cert.expiry_on)}</span>
                    ) : (
                      <input type="month" disabled={cert.does_not_expire} className={`w-full px-3 py-2 border border-border rounded-md text-sm disabled:bg-subtle disabled:text-text-muted ${!toMonthValue(cert.expiry_on) ? 'date-input-empty' : ''}`} value={toMonthValue(cert.expiry_on)} onChange={(e) => handleCertificationChange(index, 'expiry_on', fromMonthValue(e.target.value))} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" id={`no-expiry-${index}`} checked={cert.does_not_expire || false} onChange={(e) => handleCertificationChange(index, 'does_not_expire', e.target.checked)} className="w-4 h-4 rounded text-brand focus:ring-brand" />
                    <label htmlFor={`no-expiry-${index}`} className="text-sm font-medium text-text-primary cursor-pointer">This credential does not expire</label>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-text-primary">Credential URL</label>
                    <input type="url" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={cert.credential_url || ''} onChange={(e) => handleCertificationChange(index, 'credential_url', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        {/* Tags / Skills Section */}
        <Card className="p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-2 pb-2 border-b border-border/50">Skills</h3>
          <TagSelector
            typeFilter="skill"
            selectedTags={formData.tags as Tag[]}
            onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
            placeholder="Search skills (e.g. React, Java, Python)..."
            readOnly={isBasicReadOnly}
          />
        </Card>

        {/* Social Links Section */}
        <Card className="p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/50">
            <h3 className="text-lg font-semibold text-text-primary">Social & Profile Links</h3>
            {!isBasicReadOnly && (
              <Button variant="secondary" type="button" onClick={addSocialLink} className="gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Add Link
              </Button>
            )}
          </div>

          {formData.social_links.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-4 bg-subtle rounded-md border border-dashed border-border mb-2">No links added.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {formData.social_links.map((link, index) => (
                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 border border-border rounded-lg bg-surface">
                  <div className="flex flex-col gap-1.5 w-full sm:w-1/3">
                    <label className="text-sm font-medium text-text-primary">Platform <span className="text-error">*</span></label>
                    <select required className="w-full px-3 py-2 border border-border rounded-md text-sm bg-surface" value={link.link_type} onChange={(e) => handleSocialLinkChange(index, 'link_type', e.target.value)}>
                      <option value="linkedin">LinkedIn</option>
                      <option value="github">GitHub</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="website">Personal Website</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 w-full">
                    <label className="text-sm font-medium text-text-primary">URL <span className="text-error">*</span></label>
                    <input required type="url" className="w-full px-3 py-2 border border-border rounded-md text-sm" value={link.url || ''} onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)} placeholder="https://" />
                  </div>
                  {!isBasicReadOnly && (
                    <div className="flex items-center gap-2 shrink-0 pb-2">
                      <button type="button" onClick={() => removeSocialLink(index)} className="w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-md text-error hover:bg-error-50 shadow-sm transition-colors" aria-label="Remove Link">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </fieldset>

      {/* Additional Details */}
      <fieldset disabled={readOnly} className="contents">
        <Card className="p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-6 pb-2 border-b border-border/50">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Secondary Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.secondary_email}
                onChange={e => handleChange(e, 'secondary_email')}
                onBlur={() => handleBlur('secondary_email')}
                placeholder="e.g. alt.john@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Secondary Phone</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
                value={formData.secondary_phone}
                onChange={e => handleChange(e, 'secondary_phone')}
                onBlur={() => handleBlur('secondary_phone')}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </Card>

        {/* Compensation Snapshot */}
        <Card className="p-6 shadow-sm border border-border">
          <h3 className="text-lg font-semibold text-text-primary mb-6 pb-2 border-b border-border/50">Compensation Snapshot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Current CTC</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm" value={formData.current_ctc} onChange={e => handleChange(e, 'current_ctc')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Expected CTC</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm" value={formData.expected_ctc} onChange={e => handleChange(e, 'expected_ctc')} />
            </div>
          </div>
        </Card>
      </fieldset>
      <div className="flex justify-end gap-4 border-t border-border mt-2 pt-6">
        {readOnly ? (
          <Button variant="secondary" onClick={onCancel} type="button">
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onCancel} type="button" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (mode === 'edit' ? 'Update Candidate' : 'Save Candidate')}
            </Button>
          </>
        )}
      </div>
    </form>
  );
};
