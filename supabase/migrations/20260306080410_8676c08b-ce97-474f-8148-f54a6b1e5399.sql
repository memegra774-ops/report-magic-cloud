
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS fan_number text,
  ADD COLUMN IF NOT EXISTS employment_date_astu date,
  ADD COLUMN IF NOT EXISTS place_of_birth text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS first_employment_company text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS hdp_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mc_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS elip_certified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
