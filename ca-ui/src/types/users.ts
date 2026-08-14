export interface UserLookup {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  employee_code?: string;
  department?: string;
  status: 'active' | 'inactive' | 'locked' | 'invited';
  is_active: boolean;
  role_code: string;
  org_id?: string;
  created_at: string;
  updated_at?: string;
  updated_by_name?: string;
}

export interface CreateUserRequest {
  email: string;
  full_name: string;
  role_code: string;
  employee_code?: string;
  department?: string;
  org_id?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateUserRequest {
  full_name?: string;
  role_code?: string;
  employee_code?: string;
  department?: string;
  org_id?: string;
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'inactive';
}

