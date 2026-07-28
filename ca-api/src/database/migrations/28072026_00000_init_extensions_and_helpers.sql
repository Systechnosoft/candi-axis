-- 00001_init_extensions_and_helpers.sql
-- Enables core extensions and defines shared helper functions.

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for older compatibility if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_trgm for future full-text / trigram searches
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create universal updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION protect_code_column()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.code IS NOT NULL AND OLD.code IS DISTINCT FROM NEW.code THEN
    RAISE EXCEPTION 'The code column cannot be updated after creation.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
