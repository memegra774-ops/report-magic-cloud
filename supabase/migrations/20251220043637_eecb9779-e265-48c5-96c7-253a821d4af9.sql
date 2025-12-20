-- Add version column to monthly_reports table
ALTER TABLE public.monthly_reports 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Create function to auto-increment version for same month/year reports
CREATE OR REPLACE FUNCTION public.set_report_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_version integer;
BEGIN
  -- Get the max version for this month/year combination
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM public.monthly_reports
  WHERE report_month = NEW.report_month 
    AND report_year = NEW.report_year
    AND (NEW.department_id IS NULL OR department_id = NEW.department_id);
  
  NEW.version := max_version + 1;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-versioning
DROP TRIGGER IF EXISTS set_report_version_trigger ON public.monthly_reports;
CREATE TRIGGER set_report_version_trigger
  BEFORE INSERT ON public.monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_report_version();