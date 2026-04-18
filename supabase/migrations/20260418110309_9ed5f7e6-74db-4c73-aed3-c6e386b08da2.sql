-- Tighten SELECT on report_entries to match role-based access used on staff table
DROP POLICY IF EXISTS "View report entries based on role" ON public.report_entries;

CREATE POLICY "View report entries based on role"
ON public.report_entries
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR has_role(auth.uid(), 'avd'::app_role)
  OR has_role(auth.uid(), 'management'::app_role)
  OR has_role(auth.uid(), 'hr'::app_role)
  OR (
    has_role(auth.uid(), 'college_dean'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.monthly_reports mr
      WHERE mr.id = report_entries.report_id
        AND (
          mr.college_id = get_user_college(auth.uid())
          OR mr.department_id IN (
            SELECT d.id FROM public.departments d
            WHERE d.college_id = get_user_college(auth.uid())
          )
        )
    )
  )
  OR (
    has_role(auth.uid(), 'department_head'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.monthly_reports mr
      WHERE mr.id = report_entries.report_id
        AND mr.department_id = get_user_department(auth.uid())
    )
  )
);