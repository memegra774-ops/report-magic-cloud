-- Fix 1: Restrict profiles SELECT - users see own profile, admins/HR/AVD/dean see broader scope
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Privileged roles can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR has_role(auth.uid(), 'avd'::app_role)
  OR has_role(auth.uid(), 'hr'::app_role)
  OR has_role(auth.uid(), 'management'::app_role)
  OR has_role(auth.uid(), 'college_dean'::app_role)
  OR has_role(auth.uid(), 'department_head'::app_role)
);

-- Fix 2: Prevent users from clearing password_change_required themselves
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (no privilege escalation)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND password_change_required = (SELECT password_change_required FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "System admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- Fix 3: Restrict staff_changes INSERT to authorized roles, prevent spoofing performed_by_id
DROP POLICY IF EXISTS "Authenticated can insert changes" ON public.staff_changes;

CREATE POLICY "Authorized roles can insert staff changes"
ON public.staff_changes
FOR INSERT
TO authenticated
WITH CHECK (
  performed_by_id = auth.uid()
  AND (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'avd'::app_role)
    OR has_role(auth.uid(), 'department_head'::app_role)
  )
);

-- Fix 4: Restrict notifications INSERT to authorized roles
DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;

CREATE POLICY "Authorized roles can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'system_admin'::app_role)
  OR has_role(auth.uid(), 'avd'::app_role)
  OR has_role(auth.uid(), 'department_head'::app_role)
  OR has_role(auth.uid(), 'hr'::app_role)
  OR has_role(auth.uid(), 'college_dean'::app_role)
);