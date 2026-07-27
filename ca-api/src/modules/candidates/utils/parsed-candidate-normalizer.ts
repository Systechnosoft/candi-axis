import { Logger } from '@nestjs/common';

const logger = new Logger('ParsedCandidateNormalizer');

export function normalizeResumeDateToPgDate(
  value: string | null | undefined,
  isEndDate = false,
): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Handle "Present", "Current", etc. for end dates
  const currentKeywords = ['present', 'current', 'till date', 'ongoing', 'now'];
  if (currentKeywords.includes(trimmed.toLowerCase())) {
    return null;
  }

  // Common month names
  const months: Record<string, string> = {
    jan: '01',
    january: '01',
    feb: '02',
    february: '02',
    mar: '03',
    march: '03',
    apr: '04',
    april: '04',
    may: '05',
    jun: '06',
    june: '06',
    jul: '07',
    july: '07',
    aug: '08',
    august: '08',
    sep: '09',
    september: '09',
    oct: '10',
    october: '10',
    nov: '11',
    november: '11',
    dec: '12',
    december: '12',
  };

  try {
    // Check for "MM YYYY" or "Month YYYY" or "YYYY"
    const parts = trimmed.split(/[\s,/-]+/).filter(Boolean);

    let year: string | null = null;
    let month = '01';

    if (parts.length === 1) {
      // Could be just YYYY
      if (/^\d{4}$/.test(parts[0])) {
        year = parts[0];
      }
    } else if (parts.length >= 2) {
      // Check if one is month and other is year
      const p0 = parts[0].toLowerCase();
      const p1 = parts[1].toLowerCase();

      if (months[p0]) {
        month = months[p0];
        if (/^\d{4}$/.test(parts[1])) year = parts[1];
      } else if (months[p1]) {
        month = months[p1];
        if (/^\d{4}$/.test(parts[0])) year = parts[0];
      } else {
        // Try numeric month
        if (/^\d{1,2}$/.test(parts[0]) && /^\d{4}$/.test(parts[1])) {
          month = parts[0].padStart(2, '0');
          year = parts[1];
        } else if (/^\d{4}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
          year = parts[0];
          month = parts[1].padStart(2, '0');
        }
      }
    }

    if (year) {
      return `${year}-${month}-01`;
    }

    // Try standard JS Date parsing as fallback
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}-01`;
    }
  } catch (e) {
    logger.warn(`Failed to normalize date: ${trimmed}. Error: ${e.message}`);
  }

  logger.warn(`Unparseable date format: ${trimmed}`);
  return null;
}

export function normalizeYear(value: any): string | number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (!str) return null;

  return str;
}

export function splitDegreeAndField(degree: string | null): {
  degree: string | null;
  field_of_study: string | null;
} {
  if (!degree) return { degree: null, field_of_study: null };

  const trimmed = degree.trim();

  // Common separators: "in", " - ", ": ", " | ", ","
  const separators = [' in ', ' - ', ': ', ' | ', ', '];

  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep);
      const d = parts[0].trim();
      const f = parts.slice(1).join(sep).trim();

      if (d && f) {
        return { degree: d, field_of_study: f };
      }
    }
  }

  return { degree: trimmed, field_of_study: null };
}

export function normalizeCandidateChildData(data: any) {
  const result = { ...data };

  if (result.employments) {
    let foundCurrent = false;
    result.employments = result.employments.map((emp: any) => {
      // Handle date ranges in a single string if provided
      let startDate = emp.start_date;
      let endDate = emp.end_date;
      let isCurrent = !!emp.is_current;

      if (typeof startDate === 'string' && startDate.includes(' - ')) {
        const parts = startDate.split(' - ');
        startDate = parts[0];
        endDate = parts[1];
      }

      const normalizedStart = normalizeResumeDateToPgDate(startDate);
      const normalizedEnd = normalizeResumeDateToPgDate(endDate, true);

      // If end date is a current keyword, normalizedEnd is null and isCurrent is true
      if (
        !normalizedEnd &&
        endDate &&
        ['present', 'current', 'till date', 'ongoing', 'now'].includes(
          endDate.trim().toLowerCase(),
        )
      ) {
        isCurrent = true;
      }

      if (isCurrent) {
        if (foundCurrent) {
          isCurrent = false;
        } else {
          foundCurrent = true;
        }
      }

      return {
        ...emp,
        start_date: normalizedStart,
        end_date: normalizedEnd,
        is_current: isCurrent,
      };
    });
  }

  if (result.educations) {
    result.educations = result.educations.map((ed: any) => {
      let startYearVal = ed.start_year;
      let endYearVal = ed.end_year;

      // Check if startYearVal itself is a range
      if (typeof startYearVal === 'string' && startYearVal.includes(' - ')) {
        const parts = startYearVal.split(' - ');
        startYearVal = parts[0];
        if (!endYearVal) endYearVal = parts[1];
      }

      const startYear = normalizeYear(startYearVal);
      const endYear = normalizeYear(endYearVal);

      let degree = ed.degree;
      let fieldOfStudy = ed.field_of_study;

      if (degree && !fieldOfStudy) {
        const split = splitDegreeAndField(degree);
        degree = split.degree;
        fieldOfStudy = split.field_of_study;
      }

      return {
        ...ed,
        start_year: startYear,
        end_year: endYear,
        degree,
        field_of_study: fieldOfStudy,
      };
    });
  }

  if (result.certifications) {
    result.certifications = result.certifications.map((cert: any) => {
      return {
        ...cert,
        issued_on: normalizeResumeDateToPgDate(cert.issued_on),
        expiry_on: cert.does_not_expire
          ? null
          : normalizeResumeDateToPgDate(cert.expiry_on, true),
      };
    });
  }

  if (result.projects) {
    result.projects = result.projects
      .map((proj: any) => {
        let tech = proj.technologies;
        if (Array.isArray(tech)) {
          tech = tech.join(', ');
        }
        return {
          ...proj,
          title: proj.title || proj.name || '',
          description: proj.description || null,
          technologies: tech || null,
          duration: proj.duration || null,
          role: proj.role || null,
          project_url:
            proj.project_url || proj.project_link || proj.url || null,
        };
      })
      .filter((proj: any) => proj.title && proj.title.trim() !== '');
  }

  return result;
}
