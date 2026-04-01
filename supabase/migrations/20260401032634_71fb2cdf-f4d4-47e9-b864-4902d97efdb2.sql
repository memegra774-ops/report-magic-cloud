
-- RLS: college_dean can view staff in their college's departments
CREATE POLICY "College dean can view staff in their college"
ON public.staff FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'college_dean'::app_role) AND
  department_id IN (SELECT id FROM departments WHERE college_id = get_user_college(auth.uid()))
);

-- RLS: hr can view all staff
CREATE POLICY "HR can view all staff"
ON public.staff FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role));

-- RLS: college_dean can view reports
CREATE POLICY "College dean can view reports"
ON public.monthly_reports FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'college_dean'::app_role));

-- RLS: hr can view all reports
CREATE POLICY "HR can view reports"
ON public.monthly_reports FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role));

-- RLS: hr can insert reports (for university-level report generation)
CREATE POLICY "HR can insert reports"
ON public.monthly_reports FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- RLS: hr can delete reports
CREATE POLICY "HR can delete reports"
ON public.monthly_reports FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role));

-- RLS: hr can insert report entries
CREATE POLICY "HR can insert report entries"
ON public.report_entries FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- RLS: hr can delete report entries
CREATE POLICY "HR can delete report entries"
ON public.report_entries FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role));

-- RLS: college_dean can view notifications
CREATE POLICY "College dean can view notifications"
ON public.notifications FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'college_dean'::app_role));
