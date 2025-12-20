-- Drop the old constraint that doesn't include department_id
ALTER TABLE public.monthly_reports 
DROP CONSTRAINT IF EXISTS monthly_reports_report_month_report_year_key;

-- Create a new unique index that includes department_id
-- Using COALESCE to handle NULL department_id values properly
CREATE UNIQUE INDEX monthly_reports_month_year_dept_idx 
ON public.monthly_reports (report_month, report_year, COALESCE(department_id, '00000000-0000-0000-0000-000000000000'));