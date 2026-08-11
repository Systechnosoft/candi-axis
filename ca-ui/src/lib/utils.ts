import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const semanticColors = {
  stage: {
    new: "bg-subtle text-text-primary border-border",
    screening: "bg-status-info/10 text-status-info border-status-info/20",
    interviewing: "bg-purple-100 text-purple-700 border-purple-200",
    shortlisted: "bg-indigo-100 text-indigo-700 border-indigo-200",
    offered: "bg-orange-100 text-orange-700 border-orange-200",
    hired: "bg-status-success/10 text-status-success border-status-success/20",
    rejected: "bg-status-error/10 text-status-error border-status-error/20",
    onHold: "bg-status-warning/10 text-status-warning border-status-warning/20",
  },
  duplicate: {
    high: "text-status-error bg-status-error/10",
    medium: "text-status-warning bg-status-warning/10",
    low: "text-slate-600 bg-slate-100",
  },
  aiRating: {
    strong: "text-status-success",
    moderate: "text-status-info",
    weak: "text-status-warning",
    poor: "text-status-error",
  },
  interviewStatus: {
    scheduled: "text-status-info",
    rescheduled: "text-status-warning",
    completed: "text-status-success",
    cancelled: "text-status-error",
    pending: "text-status-warning",
    overdue: "text-status-error",
  },
  offerStatus: {
    draft: "text-text-secondary",
    sent: "text-status-info",
    accepted: "text-status-success",
    rejected: "text-status-error",
    withdrawn: "text-status-warning",
  }
};

export function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text.trim().replace(/ +/g, ' ');
}

export function formatToMonYear(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed.toLowerCase() === 'present') return 'Present';
  
  // If it's already in MON yyyy format (e.g., "Jan 2024" or "Jan, 2024")
  if (/^[A-Za-z]{3}\s+\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Try to parse standard YYYY-MM-DD
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const matches = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matches) {
      const year = parseInt(matches[1], 10);
      const monthIdx = parseInt(matches[2], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${months[monthIdx]} ${year}`;
      }
    }
    
    // Fallback standard Date parsing
    const monthStr = months[date.getMonth()];
    const yearStr = date.getFullYear();
    return `${monthStr} ${yearStr}`;
  }
  
  return trimmed;
}

export function formatToHtmlBullets(text: string | null | undefined): string {
  if (!text) return '';

  // 1. Normalize linebreaks and remove existing paragraph/div wrappers,
  // preserving block boundaries
  const clean = text
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ''); // Strip all other HTML tags

  // 2. Split into potential bullet points
  // Split by newlines or common inline bullet characters
  const bulletPattern = /[•●▪■\u2022\u25CF\u25AA\u25A0\u2023\u2043\u204F\u25CB\u25C9\u25CC\u25A1]/;
  const rawParts = clean.split(/\r?\n/);
  const items: string[] = [];

  for (const part of rawParts) {
    const subParts = part.split(bulletPattern);
    for (const subPart of subParts) {
      const trimmed = subPart.trim();
      if (!trimmed) continue;

      // Clean leading bullet marks, list numbers, spaces, hyphens/stars
      const cleaned = trimmed
        .replace(/^[•●▪■\-*–—\u2022\u25CF\u25AA\u25A0\u2023\u2043\u204F\u25CB\u25C9\u25CC\u25A1\s]+/, '')
        .replace(/^(\d+[\.\)]\s*)+/, '')
        .trim();

      if (cleaned) {
        items.push(cleaned);
      }
    }
  }

  if (items.length === 0) {
    return '';
  }

  // 3. Construct clean HTML list
  return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
}

export function formatDate(dateInput?: string | null | Date): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function toTitleCase(str?: string | null): string {
  if (!str) return '-';
  return str
    .split('_')
    .join(' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
