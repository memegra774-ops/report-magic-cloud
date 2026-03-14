
-- Table to track all staff changes for approval workflow
CREATE TABLE public.staff_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL CHECK (action_type IN ('add', 'update', 'delete')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id),
  -- For 'add': new_data has the full record; old_data is null
  -- For 'update': old_data has previous values, new_data has new values (only changed fields)
  -- For 'delete': old_data has the full record; new_data is null
  old_data jsonb,
  new_data jsonb,
  staff_name text NOT NULL,
  performed_by_id uuid NOT NULL,
  performed_by_name text NOT NULL,
  reviewed_by_id uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_changes ENABLE ROW LEVEL SECURITY;

-- System admin can see all changes
CREATE POLICY "System admin can view all changes" ON public.staff_changes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'system_admin'));

-- AVD can see all changes
CREATE POLICY "AVD can view all changes" ON public.staff_changes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'avd'));

-- Department heads can see their own department changes
CREATE POLICY "Dept heads can view own dept changes" ON public.staff_changes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'department_head') AND department_id = get_user_department(auth.uid()));

-- Anyone authenticated can insert changes (they create change requests)
CREATE POLICY "Authenticated can insert changes" ON public.staff_changes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- System admin can update changes (approve/reject)
CREATE POLICY "System admin can update changes" ON public.staff_changes
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'system_admin'));

-- System admin can delete changes
CREATE POLICY "System admin can delete changes" ON public.staff_changes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'system_admin'));
