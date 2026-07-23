export const QUEUE_NAMES = {
  RESUME_PARSING: 'resume-parsing',
  AI_RATING: 'ai-rating',
  NOTIFICATIONS: 'notifications',
  REMINDERS: 'reminders',
  MAINTENANCE: 'maintenance',
  CALENDAR_INVITES: 'calendar-invites',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Default MVP queue options
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 100, // Keep last 100 jobs for debug
  removeOnFail: 500,     // Keep 500 failed jobs for inspection
};
