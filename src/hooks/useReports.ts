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
        .select('id, status')
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

      // Prevent regenerating a submitted report
      if (existingReport && regenerate && existingReport.status === 'submitted') {
        throw new Error('Cannot regenerate a submitted report. The report has already been submitted to AVD.');
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

      // Then copy all staff into report entries with full snapshot data (filtered by department if applicable)
      let staffQuery = supabase
        .from('staff')
        .select('id, staff_id, full_name, sex, college_name, department_id, specialization, education_level, academic_rank, category, current_status, remark, departments(code, name)');
      
      if (departmentId) {
        staffQuery = staffQuery.eq('department_id', departmentId);
      }

      const { data: staffData, error: staffError } = await staffQuery;

      if (staffError) throw staffError;

      if (staffData && staffData.length > 0) {
        const entries = staffData.map((staff: any) => ({
          report_id: report.id,
          staff_id: staff.id,
          category: staff.category,
          current_status: staff.current_status,
          remark: staff.remark,
          // Store snapshot data for immutability
          staff_id_number: staff.staff_id,
          full_name: staff.full_name,
          sex: staff.sex,
          college_name: staff.college_name,
          department_code: staff.departments?.code || null,
          department_name: staff.departments?.name || null,
          specialization: staff.specialization,
          education_level: staff.education_level,
          academic_rank: staff.academic_rank,
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

export const useSubmitReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, userId }: { reportId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('monthly_reports')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: userId
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      toast.success('Report submitted to AVD successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit report: ' + error.message);
    },
  });
};

export const useApproveReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase
        .from('monthly_reports')
        .update({ status: 'approved' })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      toast.success('Report approved successfully');
    },
    onError: (error) => {
      toast.error('Failed to approve report: ' + error.message);
    },
  });
};

export const useGenerateCollegeReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      // Check if a college-level report already exists
      const { data: existingReport } = await supabase
        .from('monthly_reports')
        .select('id')
        .eq('report_month', month)
        .eq('report_year', year)
        .is('department_id', null)
        .maybeSingle();

      if (existingReport) {
        throw new Error('A college-level report already exists for this period.');
      }

      // Get all approved department reports for this month/year
      const { data: approvedReports, error: reportsError } = await supabase
        .from('monthly_reports')
        .select('id, department_id')
        .eq('report_month', month)
        .eq('report_year', year)
        .eq('status', 'approved')
        .not('department_id', 'is', null);

      if (reportsError) throw reportsError;

      if (!approvedReports || approvedReports.length === 0) {
        throw new Error('No approved department reports found. Approve at least one department report first.');
      }

      // Create the college-level report
      const { data: report, error: reportError } = await supabase
        .from('monthly_reports')
        .insert({ 
          report_month: month, 
          report_year: year,
          department_id: null,
          status: 'draft'
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Get all entries from approved department reports
      const reportIds = approvedReports.map(r => r.id);
      const { data: entries, error: entriesError } = await supabase
        .from('report_entries')
        .select('*')
        .in('report_id', reportIds);

      if (entriesError) throw entriesError;

      if (entries && entries.length > 0) {
        // Copy entries to the new college report
        const newEntries = entries.map(entry => ({
          report_id: report.id,
          staff_id: entry.staff_id,
          category: entry.category,
          current_status: entry.current_status,
          remark: entry.remark,
          staff_id_number: entry.staff_id_number,
          full_name: entry.full_name,
          sex: entry.sex,
          college_name: entry.college_name,
          department_code: entry.department_code,
          department_name: entry.department_name,
          specialization: entry.specialization,
          education_level: entry.education_level,
          academic_rank: entry.academic_rank,
        }));

        const { error: insertError } = await supabase
          .from('report_entries')
          .insert(newEntries);

        if (insertError) throw insertError;
      }

      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      toast.success('College-level report generated from approved department reports');
    },
    onError: (error) => {
      toast.error('Failed to generate college report: ' + error.message);
    },
  });
};
