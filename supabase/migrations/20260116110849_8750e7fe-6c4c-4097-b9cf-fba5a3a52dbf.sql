-- Update the check constraint to include 'approved' status
ALTER TABLE public.monthly_reports DROP CONSTRAINT IF EXISTS valid_report_status;
ALTER TABLE public.monthly_reports ADD CONSTRAINT valid_report_status CHECK (status IN ('draft', 'submitted', 'approved'));

-- Update RLS policies to allow AVD to approve reports
DROP POLICY IF EXISTS "Update reports" ON public.monthly_reports;
CREATE POLICY "Update reports" ON public.monthly_reports
FOR UPDATE USING (
  has_role(auth.uid(), 'system_admin') OR 
  has_role(auth.uid(), 'avd') OR 
  (has_role(auth.uid(), 'department_head') AND department_id = get_user_department(auth.uid()) AND status = 'draft')
);