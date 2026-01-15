-- Add columns to store staff data snapshot at report generation time
ALTER TABLE public.report_entries 
ADD COLUMN IF NOT EXISTS staff_id_number text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS sex text,
ADD COLUMN IF NOT EXISTS college_name text,
ADD COLUMN IF NOT EXISTS department_code text,
ADD COLUMN IF NOT EXISTS department_name text,
ADD COLUMN IF NOT EXISTS specialization text,
ADD COLUMN IF NOT EXISTS education_level text,
ADD COLUMN IF NOT EXISTS academic_rank text;