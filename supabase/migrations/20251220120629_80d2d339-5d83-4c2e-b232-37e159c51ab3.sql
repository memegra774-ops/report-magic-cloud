-- Drop and recreate the DELETE policy for monthly_reports to include department heads
DROP POLICY IF EXISTS "Delete reports" ON public.monthly_reports;

CREATE POLICY "Delete reports" 
ON public.monthly_reports 
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  OR has_role(auth.uid(), 'avd'::app_role) 
  OR (has_role(auth.uid(), 'department_head'::app_role) AND department_id = get_user_department(auth.uid()))
);

-- Drop and recreate the UPDATE policy to include department heads for their own reports
DROP POLICY IF EXISTS "Update reports" ON public.monthly_reports;

CREATE POLICY "Update reports" 
ON public.monthly_reports 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  OR has_role(auth.uid(), 'avd'::app_role) 
  OR (has_role(auth.uid(), 'department_head'::app_role) AND department_id = get_user_department(auth.uid()))
);

-- Create notifications table for AVD dashboard
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  staff_name text,
  performed_by text,
  is_read boolean NOT NULL DEFAULT false,
  target_role public.app_role NOT NULL DEFAULT 'avd'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- AVD and system admins can view notifications targeted to them
CREATE POLICY "View notifications" 
ON public.notifications 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  OR (target_role = 'avd'::app_role AND has_role(auth.uid(), 'avd'::app_role))
);

-- Anyone can insert notifications (for department heads to notify AVD)
CREATE POLICY "Insert notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- AVD and system admins can update notifications (mark as read)
CREATE POLICY "Update notifications" 
ON public.notifications 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  OR has_role(auth.uid(), 'avd'::app_role)
);

-- AVD and system admins can delete notifications
CREATE POLICY "Delete notifications" 
ON public.notifications 
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  OR has_role(auth.uid(), 'avd'::app_role)
);