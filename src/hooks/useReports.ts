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
        .select('*, departments(*)')
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
    mutationFn: async ({ month, year, departmentId, regenerate = false }: { month: number; year: number; departmentId?: string | null; regenerate?: boolean }) => {
      // Check if a report already exists for this month/year/department
      let existingQuery = supabase
        .from('monthly_reports')
        .select('id')
        .eq('report_month', month)
        .eq('report_year', year);
      
      if (departmentId) {
        existingQuery = existingQuery.eq('department_id', departmentId);
      } else {
        existingQuery = existingQuery.is('department_id', null);
      }

      const { data: existingReport } = await existingQuery.maybeSingle();

      if (existingReport && !regenerate) {
        throw new Error('A report already exists for this period. Use regenerate to update it.');
      }

      // If regenerating, delete the existing report first (cascade will delete entries)
      if (existingReport && regenerate) {
        const { error: deleteError } = await supabase
          .from('monthly_reports')
          .delete()
          .eq('id', existingReport.id);
        
        if (deleteError) throw deleteError;
      }

      // Create the report
      const { data: report, error: reportError } = await supabase
        .from('monthly_reports')
        .insert({ 
          report_month: month, 
          report_year: year,
          department_id: departmentId || null 
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Then copy all staff into report entries (filtered by department if applicable)
      let staffQuery = supabase
        .from('staff')
        .select('id, category, current_status, remark');
      
      if (departmentId) {
        staffQuery = staffQuery.eq('department_id', departmentId);
      }

      const { data: staffData, error: staffError } = await staffQuery;

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

export const useUpdateReportEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, current_status, remark }: { id: string; current_status?: string; remark?: string }) => {
      const { data, error } = await supabase
        .from('report_entries')
        .update({ current_status, remark })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-entries'] });
      toast.success('Entry updated');
    },
    onError: (error) => {
      toast.error('Failed to update entry: ' + error.message);
    },
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
