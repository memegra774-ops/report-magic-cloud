DROP POLICY IF EXISTS "Users can update own profile (no privilege escalation)" ON public.profiles;

CREATE POLICY "Users can update own profile (no privilege escalation)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    password_change_required = (SELECT p.password_change_required FROM public.profiles p WHERE p.id = auth.uid())
    OR password_change_required = false
  )
);