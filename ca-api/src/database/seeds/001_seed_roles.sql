-- 001_seed_roles.sql

INSERT INTO roles (code, name, description, is_system, sort_order)
VALUES
  ('super_admin', 'Super Admin', 'Unrestricted system access (Bootstrap only)', true, 5),
  ('admin', 'Admin', 'Platform administrator', true, 10),
  ('hr_recruiter', 'HR / Recruiter', 'Manages requisitions, candidates, and pipelines', true, 30),
  ('hiring_manager', 'Hiring Manager', 'Manages own requisitions and reviews candidates', true, 40),
  ('interviewer', 'Interviewer', 'Conducts interviews and submits feedback', true, 50)
ON CONFLICT (code) WHERE org_id IS NULL AND deleted_at IS NULL DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order;
