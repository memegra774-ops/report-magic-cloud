-- Add 'rejected' status and rejection_reason column
ALTER TABLE public.monthly_reports DROP CONSTRAINT IF EXISTS valid_report_status;
ALTER TABLE public.monthly_reports ADD CONSTRAINT valid_report_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));

ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE public.monthly_reports ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id);