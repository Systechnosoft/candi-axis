-- 000_seed_organisations.sql
INSERT INTO public.organisations (id, name, status)
VALUES ('7af2ebf4-6888-4757-a585-bcd9115bb0da', 'ATS Organisation', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;
