import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Staff } from '@/types/staff';

/**
 * Fetches staff (with department + college info) for the custom report builder.
 * RLS on the staff table already scopes results to the caller's role.
 */
export const useCustomReportStaff = () => {
  return useQuery({
    queryKey: ['custom-report-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*, departments(*)')
        .order('full_name')
        .limit(5000);

      if (error) throw error;
      return (data || []) as unknown as Staff[];
    },
  });
};
