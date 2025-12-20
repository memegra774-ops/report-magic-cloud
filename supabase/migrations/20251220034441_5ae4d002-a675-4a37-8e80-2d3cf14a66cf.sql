-- Drop existing staff policies that need updating
DROP POLICY IF EXISTS "Department heads can delete own department staff" ON public.staff;
DROP POLICY IF EXISTS "Department heads can insert own department staff" ON public.staff;
DROP POLICY IF EXISTS "Department heads can update own department staff" ON public.staff;

-- Recreate policies to include AVD role for all departments
CREATE POLICY "Staff delete policy" 
ON public.staff 
FOR DELETE 
USING (
  has_role(auth.uid(), 'system_admin') OR 
  has_role(auth.uid(), 'avd') OR
  (has_role(auth.uid(), 'department_head') AND department_id = get_user_department(auth.uid()))
);

CREATE POLICY "Staff insert policy" 
ON public.staff 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'system_admin') OR 
  has_role(auth.uid(), 'avd') OR
  (has_role(auth.uid(), 'department_head') AND department_id = get_user_department(auth.uid()))
);

CREATE POLICY "Staff update policy" 
ON public.staff 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'system_admin') OR 
  has_role(auth.uid(), 'avd') OR
  (has_role(auth.uid(), 'department_head') AND department_id = get_user_department(auth.uid()))
);