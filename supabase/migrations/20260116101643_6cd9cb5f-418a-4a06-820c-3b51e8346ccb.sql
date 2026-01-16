-- Add status tracking columns to monthly_reports
ALTER TABLE public.monthly_reports
ADD COLUMN status text NOT NULL DEFAULT 'draft',
ADD COLUMN submitted_at timestamptz,
ADD COLUMN submitted_by uuid;

-- Add check constraint for valid status values
ALTER TABLE public.monthly_reports
ADD CONSTRAINT valid_report_status CHECK (status IN ('draft', 'submitted'));

-- Update RLS policies to prevent department heads from modifying submitted reports

-- Drop existing update policy
DROP POLICY IF EXISTS "Update reports" ON public.monthly_reports;

-- Create new update policy that only allows updates on draft reports for department heads
CREATE POLICY "Update reports" ON public.monthly_reports
FOR UPDATE USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  OR has_role(auth.uid(), 'avd'::app_role)
  OR (
    has_role(auth.uid(), 'department_head'::app_role) 
    AND department_id = get_user_department(auth.uid())
    AND status = 'draft'
  )
);

-- Drop existing delete policy
DROP POLICY IF EXISTS "Delete reports" ON public.monthly_reports;

-- Create new delete policy that only allows deleting draft reports for department heads
CREATE POLICY "Delete reports" ON public.monthly_reports
FOR DELETE USING (
  has_role(auth.uid(), 'system_admin'::app_role) 
  OR has_role(auth.uid(), 'avd'::app_role)
  OR (
    has_role(auth.uid(), 'department_head'::app_role) 
    AND department_id = get_user_department(auth.uid())
    AND status = 'draft'
  )
);