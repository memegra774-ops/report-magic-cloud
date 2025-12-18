import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyReport, Staff, StaffCategory } from '@/types/staff';
import { toast } from 'sonner';

export const useMonthlyReports = () => {
  return useQuery({
    queryKey: ['monthly-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .order('report_year', { ascending: false })
        .order('report_month', { ascending: false });

      if (error) throw error;
      return data as MonthlyReport[];
    },
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      // First create the report
      const { data: report, error: reportError } = await supabase
        .from('monthly_reports')
        .insert({ report_month: month, report_year: year })
        .select()
        .single();

      if (reportError) throw reportError;

      // Then copy all staff into report entries
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, category, current_status, remark');

      if (staffError) throw staffError;

      if (staffData && staffData.length > 0) {
        const entries = staffData.map((staff) => ({
          report_id: report.id,
          staff_id: staff.id,
          category: staff.category,
          current_status: staff.current_status,
          remark: staff.remark,
        }));

        const { error: entriesError } = await supabase
          .from('report_entries')
          .insert(entries);

        if (entriesError) throw entriesError;
      }

      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      toast.success('Monthly report created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create report: ' + error.message);
    },
  });
};

export const useReportEntries = (reportId: string | undefined) => {
  return useQuery({
    queryKey: ['report-entries', reportId],
    queryFn: async () => {
      if (!reportId) return [];

      const { data, error } = await supabase
        .from('report_entries')
        .select(`
          *,
          staff (
            *,
            departments (*)
          )
        `)
        .eq('report_id', reportId);

      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monthly_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      toast.success('Report deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete report: ' + error.message);
    },
  });
};
