-- Update RLS policy to allow department heads to edit rejected reports and resubmit
DROP POLICY IF EXISTS "Update reports" ON public.monthly_reports;

CREATE POLICY "Update reports" ON public.monthly_reports
FOR UPDATE 
USING (
  has_role(auth.uid(), 'system_admin') OR 
  has_role(auth.uid(), 'avd') OR 
  (has_role(auth.uid(), 'department_head') AND department_id = get_user_department(auth.uid()) AND status IN ('draft', 'rejected'))
)
WITH CHECK (
  has_role(auth.uid(), 'system_admin') OR 
  has_role(auth.uid(), 'avd') OR 
  (has_role(auth.uid(), 'department_head') AND department_id = get_user_department(auth.uid()) AND status IN ('draft', 'submitted'))
);