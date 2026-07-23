import { apiClient } from './client';

export interface Task {
  task_id: number;
  name: string;
  assignee: string[];
  assignee_role_names?: string | null;
  assigned_on: string;
  submitted_on: string | null;
  is_active: boolean;
  jd_id: string;
  candidate_id: string;
  candidate_name?: string;
  job_title?: string;
  jd_code?: string;
  application_id: string;
  jobposting_id: string;
  feedback_action?: string;
  feedback_reason?: string;
  submitted_by?: string;
}

export const TasksService = {
  getTasks: async () => {
    const res = await apiClient.get('/tasks');
    return res.data;
  },

  getTask: async (id: string) => {
    const res = await apiClient.get(`/tasks/${id}`);
    return res.data;
  },

  submitFeedback: async (id: string, action: 'approve' | 'reject', reason: string) => {
    const res = await apiClient.post(`/tasks/${id}/feedback`, { action, reason });
    return res.data;
  },
};
