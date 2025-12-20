-- Add password_change_required field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT false;

-- Comment explaining the column
COMMENT ON COLUMN public.profiles.password_change_required IS 'Flag to indicate if user must change password on first login';