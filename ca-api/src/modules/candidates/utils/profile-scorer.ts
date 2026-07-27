export const DEFAULT_WEIGHTS: Record<string, number> = {
  contact: 5,
  summary: 5,
  experience: 20,
  skills: 15,
  progression: 10,
  achievements: 20,
  readability: 10,
  grammar: 10,
  social: 5,
};

const commonActionVerbs = [
  'lead',
  'manage',
  'develop',
  'design',
  'build',
  'conduct',
  'create',
  'improve',
  'drive',
  'increase',
];
const commonFillerWords = [
  'very',
  'really',
  'actually',
  'basically',
  'just',
  'etc',
];

function countActionVerbs(text: string): number {
  const tokens = text.toLowerCase().split(/\W+/);
  return tokens.filter((tok) => commonActionVerbs.includes(tok)).length;
}

function countFillerWords(text: string): number {
  const tokens = text.toLowerCase().split(/\W+/);
  return tokens.filter((tok) => commonFillerWords.includes(tok)).length;
}

function computeFleschReadingEase(text: string): number {
  // Matching frontend placeholder of 60
  return 60;
}

function countGrammarErrors(text: string): number {
  // Matching frontend placeholder of 0
  return 0;
}

const isPresent = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  return true;
};

export function calculateProfileScore(
  candidate: any,
  educations: any[],
  employments: any[],
  certifications: any[],
  socialLinks: any[],
  projects: any[],
  tags: any[],
  customWeights?: Record<string, number>,
): number {
  const activeWeights = customWeights || DEFAULT_WEIGHTS;

  // 1. Text extraction
  const summaryText = candidate.profile_summary || '';
  const fullText = [summaryText]
    .concat(employments?.map((e) => e.responsibilities_summary || '') || [])
    .concat(projects?.map((p) => p.description || '') || [])
    .join('\n');

  const readabilityScore = computeFleschReadingEase(fullText);
  const grammarErrorsCount = countGrammarErrors(fullText);
  const fillerWordsCount = countFillerWords(fullText);
  const actionVerbCount = countActionVerbs(fullText);

  const hasLinkedIn =
    socialLinks?.some(
      (link) => link.url && link.url.includes('linkedin.com'),
    ) || false;
  const hasGitHub =
    socialLinks?.some((link) => link.url && link.url.includes('github.com')) ||
    false;

  const promotionsCount = (() => {
    const titles =
      employments?.map((e) => e.job_title?.toLowerCase() || '') || [];
    let count = 0;
    for (let i = 1; i < titles.length; i++) {
      if (titles[i] !== titles[i - 1]) count++;
    }
    return count;
  })();

  // 2. Score calculations for each component:

  // Contact details score
  let contactScore = 0;
  if (isPresent(candidate.first_name) && isPresent(candidate.last_name))
    contactScore += 0.4;
  if (isPresent(candidate.email)) contactScore += 0.2;
  if (isPresent(candidate.phone)) contactScore += 0.2;
  if (isPresent(candidate.location)) contactScore += 0.2;
  contactScore = Math.min(1, contactScore);

  // Summary score
  let summaryScore = 0;
  if (isPresent(candidate.profile_summary)) {
    const base = 1;
    const readabilityBonus = readabilityScore / 100;
    summaryScore = Math.min(1, base * 0.8 + readabilityBonus * 0.2);
  }

  // Experience score
  const expYears = (candidate.total_exp_months || 0) / 12;
  let expScore = 0;
  if (expYears >= 5) expScore += 0.4;
  else if (expYears >= 2) expScore += 0.2;
  if (employments) {
    const roles = employments.length;
    expScore += Math.min(0.4, roles * 0.1);
    const senior = employments.some((e) => {
      const t = e.job_title?.toLowerCase() || '';
      return (
        t.includes('senior') ||
        t.includes('manager') ||
        t.includes('lead') ||
        t.includes('director')
      );
    });
    if (senior) expScore += 0.1;
  }
  // Penalize based on gap details if present
  const gapCount = candidate.gap_details
    ? candidate.gap_details.split('; ').length
    : 0;
  if (gapCount > 0) {
    expScore -= 0.1 * gapCount;
  }
  expScore = Math.max(0, Math.min(1, expScore));

  // Skills score
  let skillsScore = 0.1;
  const count = tags?.length || 0;
  if (count >= 10) skillsScore = 1;
  else if (count >= 6) skillsScore = 0.8;
  else if (count >= 3) skillsScore = 0.6;
  else if (count > 0) skillsScore = 0.4;

  // Progression score
  let progScore = 0;
  if (employments) {
    const roles = employments.length;
    progScore += Math.min(0.6, roles * 0.2);
    if (promotionsCount > 0) {
      progScore += 0.2;
    }
    if (roles === 0 && educations && educations.length >= 2) {
      progScore += 0.4;
    }
  }
  progScore = Math.min(1, progScore);

  // Achievements score
  let achScore = 0;
  let numMetrics = 0;
  let totalBullets = 0;
  employments?.forEach((e) => {
    if (!e.responsibilities_summary) return;
    const bullets = e.responsibilities_summary
      .split(/[\r\n]+/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    bullets.forEach((b: string) => {
      totalBullets++;
      if (/\d+%|\d+\s*percent|\$\d+/i.test(b)) numMetrics++;
    });
  });
  if (totalBullets > 0) {
    achScore += Math.min(0.5, (numMetrics / totalBullets) * 0.5);
  }
  if ((projects?.length || 0) > 0) achScore += 0.2;
  if ((certifications?.length || 0) > 0) achScore += 0.1;
  achScore = Math.min(1, achScore);

  // Quality score
  const grammarScore = Math.max(0, 1 - grammarErrorsCount / 10);
  const readabilityBonus = Math.min(1, readabilityScore / 100);
  const fillerPenalty = Math.max(0, 1 - fillerWordsCount * 0.05);
  const qualityScore =
    grammarScore * 0.4 + readabilityBonus * 0.4 + fillerPenalty * 0.2;

  // Social score
  let socialScore = 0;
  if (hasLinkedIn) socialScore += 0.5;
  if (hasGitHub) socialScore += 0.5;
  socialScore = Math.min(1, socialScore);

  // Weighted sum (out of 100)
  const weightedSum =
    contactScore * (activeWeights.contact ?? DEFAULT_WEIGHTS.contact) +
    summaryScore * (activeWeights.summary ?? DEFAULT_WEIGHTS.summary) +
    expScore * (activeWeights.experience ?? DEFAULT_WEIGHTS.experience) +
    skillsScore * (activeWeights.skills ?? DEFAULT_WEIGHTS.skills) +
    progScore * (activeWeights.progression ?? DEFAULT_WEIGHTS.progression) +
    achScore * (activeWeights.achievements ?? DEFAULT_WEIGHTS.achievements) +
    qualityScore * (activeWeights.readability ?? DEFAULT_WEIGHTS.readability) +
    qualityScore * (activeWeights.grammar ?? DEFAULT_WEIGHTS.grammar) +
    socialScore * (activeWeights.social ?? DEFAULT_WEIGHTS.social);

  return Math.min(100, Math.max(0, Math.round(weightedSum * 100) / 100));
}
