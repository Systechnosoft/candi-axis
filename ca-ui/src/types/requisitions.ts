export type RequisitionPriority = 'low' | 'medium' | 'high' | 'critical';
export type RequisitionStatus = 'draft' | 'open' | 'on_hold' | 'closed';

export interface Requisition {
  id: string;
  code: string;
  title: string;
  department: string;
  openings_count: number;
  priority: RequisitionPriority;
  hiring_manager_id: string;
  owner_user_id?: string | null;
  status: RequisitionStatus;
  status_reason?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface CreateRequisitionRequest {
  code: string;
  title: string;
  department: string;
  openings_count: number;
  priority: RequisitionPriority;
  hiring_manager_id: string;
  owner_user_id?: string | null;
  status?: RequisitionStatus;
  status_reason?: string | null;
}

export type UpdateRequisitionRequest = Partial<CreateRequisitionRequest>;
