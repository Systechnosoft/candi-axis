/**
 * Base infrastructure payload shape.
 * All future async job payloads should optionally extend this or adhere
 * to tracking IDs inside it.
 */
export interface BaseJobPayload {
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface ParseResumeJobPayload extends BaseJobPayload {
  candidateId: string;
  documentId: string;
}

export interface AiRatingJobPayload extends BaseJobPayload {
  candidateId: string;
  applicationId: string;
  jdId?: string;
  trigger?: string;
}

export interface NotificationJobPayload extends BaseJobPayload {
  recipientId: string;
  templateId: string;
  data?: Record<string, any>;
}

export interface ReminderJobPayload extends BaseJobPayload {
  entityId: string;
  entityType: 'candidate' | 'requisition' | 'interview';
  action: string;
}

export interface MaintenanceJobPayload extends BaseJobPayload {
  taskName: string;
}

export interface SendCalendarInviteJobPayload extends BaseJobPayload {
  interviewId: string;
  emailSubject: string;
  note?: string;
  actorUserId: string;
  ccUserIds?: string[];
}
