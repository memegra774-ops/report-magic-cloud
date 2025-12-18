-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('system_admin', 'department_head', 'avd', 'management');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Create function to get user's department_id
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = _user_id
$$;

-- RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "System admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'system_admin') OR auth.uid() = id
  );

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'system_admin'));

-- Update staff table RLS policies for department-based access
DROP POLICY IF EXISTS "Anyone can view staff" ON public.staff;
DROP POLICY IF EXISTS "Authenticated users can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Authenticated users can update staff" ON public.staff;
DROP POLICY IF EXISTS "Authenticated users can delete staff" ON public.staff;

CREATE POLICY "View staff based on role" ON public.staff
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin') OR
    public.has_role(auth.uid(), 'avd') OR
    public.has_role(auth.uid(), 'management') OR
    (public.has_role(auth.uid(), 'department_head') AND department_id = public.get_user_department(auth.uid()))
  );

CREATE POLICY "Department heads can insert own department staff" ON public.staff
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'system_admin') OR
    (public.has_role(auth.uid(), 'department_head') AND department_id = public.get_user_department(auth.uid()))
  );

CREATE POLICY "Department heads can update own department staff" ON public.staff
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin') OR
    (public.has_role(auth.uid(), 'department_head') AND department_id = public.get_user_department(auth.uid()))
  );

CREATE POLICY "Department heads can delete own department staff" ON public.staff
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin') OR
    (public.has_role(auth.uid(), 'department_head') AND department_id = public.get_user_department(auth.uid()))
  );

-- Update report_entries RLS for department-based access
DROP POLICY IF EXISTS "Anyone can view report entries" ON public.report_entries;
DROP POLICY IF EXISTS "Authenticated users can insert report entries" ON public.report_entries;
DROP POLICY IF EXISTS "Authenticated users can update report entries" ON public.report_entries;
DROP POLICY IF EXISTS "Authenticated users can delete report entries" ON public.report_entries;

CREATE POLICY "View report entries based on role" ON public.report_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert report entries" ON public.report_entries
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'system_admin') OR
    public.has_role(auth.uid(), 'department_head') OR
    public.has_role(auth.uid(), 'avd')
  );

CREATE POLICY "Update report entries" ON public.report_entries
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin') OR
    public.has_role(auth.uid(), 'department_head') OR
    public.has_role(auth.uid(), 'avd')
  );

CREATE POLICY "Delete report entries" ON public.report_entries
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin') OR
    public.has_role(auth.uid(), 'avd')
  );

-- Update monthly_reports RLS
DROP POLICY IF EXISTS "Anyone can view reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Authenticated users can insert reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Authenticated users can delete reports" ON public.monthly_reports;

CREATE POLICY "View reports" ON public.monthly_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert reports" ON public.monthly_reports
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'system_admin') OR
    public.has_role(auth.uid(), 'department_head') OR
    public.has_role(auth.uid(), 'avd')
  );

CREATE POLICY "Update reports" ON public.monthly_reports
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin') OR
    public.has_role(auth.uid(), 'avd')
  );

CREATE POLICY "Delete reports" ON public.monthly_reports
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin') OR
    public.has_role(auth.uid(), 'avd')
  );

-- Add department_id to monthly_reports for department-specific reports
ALTER TABLE public.monthly_reports ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Trigger for profile updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user creation (creates profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();