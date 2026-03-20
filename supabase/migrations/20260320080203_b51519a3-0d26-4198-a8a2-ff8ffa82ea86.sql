
-- Create colleges table
CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view colleges
CREATE POLICY "Anyone can view colleges" ON public.colleges FOR SELECT TO authenticated USING (true);
CREATE POLICY "System admin can insert colleges" ON public.colleges FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "System admin can update colleges" ON public.colleges FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));
CREATE POLICY "System admin can delete colleges" ON public.colleges FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- Add college_id to departments
ALTER TABLE public.departments ADD COLUMN college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE;

-- Add college_id to profiles (for AVD role - college-level assignment)
ALTER TABLE public.profiles ADD COLUMN college_id uuid REFERENCES public.colleges(id);

-- Insert default college from existing data
INSERT INTO public.colleges (name, code) VALUES ('College of Electrical Engineering & Computing', 'CoEEC');

-- Link existing departments to the default college
UPDATE public.departments SET college_id = (SELECT id FROM public.colleges WHERE code = 'CoEEC');

-- Link existing AVD profiles to the default college
UPDATE public.profiles SET college_id = (SELECT id FROM public.colleges WHERE code = 'CoEEC')
WHERE id IN (SELECT user_id FROM public.user_roles WHERE role = 'avd');
