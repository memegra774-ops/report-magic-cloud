-- Create enum types for staff categories
CREATE TYPE public.staff_category AS ENUM (
  'Local Instructors',
  'Not On Duty',
  'On Study',
  'Not Reporting',
  'ARA',
  'Not On Duty ARA',
  'ASTU Sponsor'
);

CREATE TYPE public.sex_type AS ENUM ('M', 'F');

CREATE TYPE public.education_level AS ENUM ('Bsc', 'BSc', 'Msc', 'MSc', 'PHD', 'Dip');

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  college_name TEXT NOT NULL DEFAULT 'CoEEC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff table
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id TEXT,
  full_name TEXT NOT NULL,
  sex sex_type NOT NULL DEFAULT 'M',
  college_name TEXT NOT NULL DEFAULT 'CoEEC',
  department_id UUID REFERENCES public.departments(id),
  specialization TEXT,
  education_level education_level NOT NULL DEFAULT 'Msc',
  academic_rank TEXT,
  current_status TEXT NOT NULL DEFAULT 'On Duty',
  category staff_category NOT NULL DEFAULT 'Local Instructors',
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly reports table
CREATE TABLE public.monthly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_month INTEGER NOT NULL CHECK (report_month >= 1 AND report_month <= 12),
  report_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(report_month, report_year)
);

-- Create report entries linking staff to reports
CREATE TABLE public.report_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  category staff_category NOT NULL,
  current_status TEXT NOT NULL,
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, staff_id)
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_entries ENABLE ROW LEVEL SECURITY;

-- Create public read policies (staff directory is public)
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Anyone can view staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Anyone can view reports" ON public.monthly_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can view report entries" ON public.report_entries FOR SELECT USING (true);

-- Create insert/update/delete policies for authenticated users
CREATE POLICY "Authenticated users can insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update departments" ON public.departments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete departments" ON public.departments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert staff" ON public.staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update staff" ON public.staff FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete staff" ON public.staff FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert reports" ON public.monthly_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update reports" ON public.monthly_reports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete reports" ON public.monthly_reports FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert report entries" ON public.report_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update report entries" ON public.report_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete report entries" ON public.report_entries FOR DELETE TO authenticated USING (true);

-- Insert default departments
INSERT INTO public.departments (code, name, college_name) VALUES
  ('CSE', 'Computer Science & Engineering', 'CoEEC'),
  ('ECE', 'Electronics & Communication Engineering', 'CoEEC'),
  ('EPCE', 'Electrical Power & Control Engineering', 'CoEEC');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for staff table
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();