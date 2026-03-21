
-- Create function to get user's college_id
CREATE OR REPLACE FUNCTION public.get_user_college(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT college_id FROM public.profiles WHERE id = _user_id
$$;

-- Allow AVD to update staff_changes for departments in their college
CREATE POLICY "AVD can update changes for their college"
ON public.staff_changes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'avd'::app_role)
  AND department_id IN (
    SELECT id FROM public.departments WHERE college_id = get_user_college(auth.uid())
  )
);
