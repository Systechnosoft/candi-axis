import { Injectable } from '@nestjs/common';
import { CreateCandidateManualDto } from './dto/create-candidate-manual.dto';

interface ChildRowEducation {
  qualification_level?: string;
  degree?: string;
  field_of_study?: string;
  institution_name?: string;
  start_year?: string | number;
  end_year?: string | number;
  grade_or_percentage?: string;
}

interface ChildRowEmployment {
  company_name: string;
  job_title?: string;
  employment_type?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  responsibilities_summary?: string;
}

interface ChildRowCertification {
  certification_name: string;
  issuer?: string;
  issued_on?: string;
  expiry_on?: string;
}

interface ChildRowLink {
  link_type: string;
  url: string;
  display_label?: string;
}

interface ChildRowProject {
  title: string;
  description?: string;
  technologies?: string;
  duration?: string;
  role?: string;
  project_url?: string;
}

export interface MappedCandidatePayload {
  candidate: CreateCandidateManualDto;
  educations: ChildRowEducation[];
  employments: ChildRowEmployment[];
  certifications: ChildRowCertification[];
  links: ChildRowLink[];
  projects: ChildRowProject[];
}

@Injectable()
export class CandidateParserMappingService {
  public mapParsedJson(json: any): MappedCandidatePayload {
    // This is an integration point for the Resume Parser output.
    // It safely extracts fields from `json` payload.
    // The exact JSON structure depends on the chosen vendor (e.g. Affinda, Sovren, AWS Textract).
    // For Phase 1 backend, we assume a generically structured JSON.

    const cand: CreateCandidateManualDto = {
      full_name: json?.name?.raw || json?.full_name || 'Unknown Candidate',
      first_name: json?.name?.first || json?.first_name || undefined,
      last_name: json?.name?.last || json?.last_name || undefined,
      email: json?.emails?.[0] || json?.email || undefined,
      phone: json?.phones?.[0] || json?.phone || undefined,
      location: json?.location?.raw || json?.location || undefined,
      total_exp_months: json?.totalYearsExperience
        ? Math.floor(json.totalYearsExperience * 12)
        : undefined,
      profile_summary: json?.summary || undefined,
      tags: json?.skills || undefined,
    };

    const educations: ChildRowEducation[] = (json?.education || []).map(
      (ed: any) => ({
        qualification_level: this.mapQualificationLevel(ed.educationLevel),
        degree: ed.accreditation?.education || ed.degree,
        field_of_study: ed.accreditation?.educationType || ed.field_of_study,
        institution_name: ed.organization || ed.institution,
        start_year: this.extractYear(ed.dates?.startDate || ed.start_date),
        end_year: this.extractYear(ed.dates?.endDate || ed.end_date),
        grade_or_percentage: ed.grade,
      }),
    );

    const employments: ChildRowEmployment[] = (
      json?.workExperience ||
      json?.employments ||
      []
    ).map((emp: any) => ({
      company_name: emp.organization || emp.company || 'Unknown Company',
      job_title: emp.jobTitle || emp.role,
      location: emp.location?.raw || emp.location,
      start_date: emp.dates?.startDate || emp.start_date,
      end_date: emp.dates?.endDate || emp.end_date,
      is_current: emp.dates?.isCurrent || emp.is_current || false,
      responsibilities_summary: emp.jobDescription || emp.description,
    }));

    const certifications: ChildRowCertification[] = (json?.certifications || [])
      .map((cert: any) => ({
        certification_name:
          typeof cert === 'string'
            ? cert
            : cert.name || cert.certification_name,
        issuer: cert.issuer,
        issued_on: cert.issued_on,
        expiry_on: cert.expiry_on,
      }))
      .filter((c: any) => c.certification_name);

    const links: ChildRowLink[] = [];
    (json?.websites || json?.links || []).forEach((linkStr: string) => {
      const type = this.inferLinkType(linkStr);
      links.push({ link_type: type, url: linkStr });
    });
    if (json?.linkedin)
      links.push({ link_type: 'linkedin', url: json.linkedin });
    if (json?.github) links.push({ link_type: 'github', url: json.github });

    if (json?.social_links && Array.isArray(json.social_links)) {
      json.social_links.forEach((link: any) => {
        // Prevent duplicates if already added by other fields
        if (!links.some((l) => l.url === link.url)) {
          links.push({
            link_type: this.inferLinkType(link.url, link.type),
            url: link.url,
            display_label: link.label || undefined,
          });
        }
      });
    }

    const projects: ChildRowProject[] = (json?.projects || [])
      .map((proj: any) => {
        let tech = proj.technologies;
        if (Array.isArray(tech)) {
          tech = tech.join(', ');
        }
        return {
          title: proj.title || proj.name || 'Unknown Project',
          description: proj.description || undefined,
          technologies: tech || undefined,
          duration: proj.duration || undefined,
          role: proj.role || undefined,
          project_url:
            proj.project_url || proj.project_link || proj.url || undefined,
        };
      })
      .filter((proj: any) => proj.title);

    return {
      candidate: cand,
      educations,
      employments,
      certifications,
      links,
      projects,
    };
  }

  private extractYear(dateStr?: string): number | undefined {
    if (!dateStr) return undefined;
    const match = dateStr.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : undefined;
  }

  private inferLinkType(url: string, suggestedType?: string): string {
    const type = suggestedType?.toLowerCase() || '';
    const validTypes = ['linkedin', 'github', 'portfolio', 'website', 'other'];
    if (validTypes.includes(type)) return type;

    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('github.com')) return 'github';
    return 'portfolio'; // Default fallback per DB constraints
  }

  private mapQualificationLevel(levelRaw?: string): string | undefined {
    if (!levelRaw) return undefined;
    const l = levelRaw.toLowerCase();
    if (
      l.includes('bachelor') ||
      l.includes('bsc') ||
      l.includes('ba') ||
      l.includes('b.tech') ||
      l.includes('btech') ||
      l.includes('b.e.') ||
      l.includes('be ')
    )
      return 'bachelor';
    if (
      l.includes('master') ||
      l.includes('msc') ||
      l.includes('ma') ||
      l.includes('m.tech') ||
      l.includes('mtech')
    )
      return 'master';
    if (l.includes('doctor') || l.includes('phd')) return 'doctorate';
    if (l.includes('diploma')) return 'diploma';
    return 'other';
  }
}
