import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Staff, StaffCategory, SexType, EducationLevel } from '@/types/staff';
import { toast } from 'sonner';
import { sendStaffNotificationToAVD } from '@/lib/emailNotifications';

export const useStaff = (filters?: {
  category?: StaffCategory;
  departmentId?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['staff', filters],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('*, departments(*)');

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.departmentId) {
        query = query.eq('department_id', filters.departmentId);
      }

      if (filters?.search) {
        query = query.ilike('full_name', `%${filters.search}%`);
      }

      const { data, error } = await query.order('full_name');

      if (error) throw error;
      return data as Staff[];
    },
  });
};

export const useDepartments = () => {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('code');

      if (error) throw error;
      return data;
    },
  });
};

interface CreateStaffOptions {
  departmentName?: string;
  performedBy?: string;
  skipNotification?: boolean;
}

export const useCreateStaff = (options?: CreateStaffOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: Omit<Staff, 'id' | 'created_at' | 'updated_at' | 'departments'> & { 
      notificationOptions?: CreateStaffOptions 
    }) => {
      const { notificationOptions, ...staffData } = staff;
      const { data, error } = await supabase
        .from('staff')
        .insert(staffData)
        .select('*, departments(*)')
        .single();

      if (error) throw error;
      
      // Send notification to AVD
      const opts = notificationOptions || options;
      if (!opts?.skipNotification) {
        const deptName = (data as any)?.departments?.name || opts?.departmentName || 'Unknown Department';
        const performer = opts?.performedBy || 'Department User';
        
        // Send notification asynchronously (don't await)
        sendStaffNotificationToAVD('added', data.full_name, deptName, performer)
          .catch(err => console.error('Failed to send AVD notification:', err));
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      toast.success('Staff member added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add staff member: ' + error.message);
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...staff }: Partial<Staff> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff')
        .update(staff)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      toast.success('Staff member updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update staff member: ' + error.message);
    },
  });
};

interface DeleteStaffOptions {
  staffName?: string;
  departmentName?: string;
  performedBy?: string;
}

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, options }: { id: string; options?: DeleteStaffOptions }) => {
      // First get the staff details for notification
      const { data: staffData, error: fetchError } = await supabase
        .from('staff')
        .select('full_name, departments(name)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Then delete
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Send notification to AVD
      const staffName = options?.staffName || staffData?.full_name || 'Unknown Staff';
      const deptName = options?.departmentName || (staffData as any)?.departments?.name || 'Unknown Department';
      const performer = options?.performedBy || 'Department User';
      
      // Send notification asynchronously (don't await)
      sendStaffNotificationToAVD('deleted', staffName, deptName, performer)
        .catch(err => console.error('Failed to send AVD notification:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      toast.success('Staff member deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete staff member: ' + error.message);
    },
  });
};

export const useStaffStats = (departmentId?: string) => {
  return useQuery({
    queryKey: ['staff-stats', departmentId],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('category, sex, education_level, academic_rank, current_status');
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data.length,
        byCategory: {} as Record<StaffCategory, number>,
        bySex: { M: 0, F: 0 },
        byEducation: {} as Record<string, number>,
        byRank: {
          'Lecturer': 0,
          'Asst. Prof.': 0,
          'Asso. Prof.': 0,
          'Professor': 0,
        } as Record<string, number>,
        byStatus: {
          'On Duty': 0,
          'Not On Duty': 0,
          'On Study': 0,
        } as Record<string, number>,
        onDutyByRank: {
          total: 0,
          lecturer: 0,
          asstProf: 0,
          assoProf: 0,
          professor: 0,
        },
      };

      data.forEach((staff) => {
        const cat = staff.category as StaffCategory;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
        stats.bySex[staff.sex as SexType]++;
        const edu = staff.education_level as string;
        stats.byEducation[edu] = (stats.byEducation[edu] || 0) + 1;
        
        // Count by status
        const status = staff.current_status || '';
        if (status === 'On Duty') stats.byStatus['On Duty']++;
        else if (status === 'Not On Duty') stats.byStatus['Not On Duty']++;
        else if (status === 'On Study' || status === 'On Study Leave') stats.byStatus['On Study']++;
        
        // Count by academic rank (normalize variations)
        const rank = staff.academic_rank?.toLowerCase() || '';
        if (rank.includes('lecturer') && !rank.includes('senior') && !rank.includes('s.')) {
          stats.byRank['Lecturer']++;
          if (status === 'On Duty') stats.onDutyByRank.lecturer++;
        } else if (rank.includes('asst') || rank.includes('assistant')) {
          stats.byRank['Asst. Prof.']++;
          if (status === 'On Duty') stats.onDutyByRank.asstProf++;
        } else if (rank.includes('asso') || rank.includes('associate')) {
          stats.byRank['Asso. Prof.']++;
          if (status === 'On Duty') stats.onDutyByRank.assoProf++;
        } else if (rank === 'professor' || rank === 'prof' || rank === 'prof.') {
          stats.byRank['Professor']++;
          if (status === 'On Duty') stats.onDutyByRank.professor++;
        }
        
        // Count on duty total
        if (status === 'On Duty') {
          stats.onDutyByRank.total++;
        }
      });

      return stats;
    },
  });
};

// Hook for department-wise statistics with gender by status and on-duty by rank
export const useDepartmentStats = () => {
  return useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, code, name')
        .order('code');

      if (deptError) throw deptError;

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('department_id, current_status, academic_rank, sex');

      if (staffError) throw staffError;

      const deptStats = departments.map((dept) => {
        const deptStaff = staffData.filter((s) => s.department_id === dept.id);
        
        // Gender by status
        const genderByStatus = {
          onDuty: { M: 0, F: 0 },
          notOnDuty: { M: 0, F: 0 },
          onStudy: { M: 0, F: 0 },
        };

        deptStaff.forEach((staff) => {
          const sex = staff.sex as 'M' | 'F';
          const status = staff.current_status;
          if (status === 'On Duty') {
            genderByStatus.onDuty[sex]++;
          } else if (status === 'Not On Duty') {
            genderByStatus.notOnDuty[sex]++;
          } else if (status === 'On Study' || status === 'On Study Leave') {
            genderByStatus.onStudy[sex]++;
          }
        });

        // On duty staff by rank
        const onDutyStaff = deptStaff.filter((s) => s.current_status === 'On Duty');
        const onDutyByRank = {
          total: onDutyStaff.length,
          lecturer: 0,
          asstProf: 0,
          assoProf: 0,
          professor: 0,
        };

        onDutyStaff.forEach((staff) => {
          const rank = staff.academic_rank?.toLowerCase() || '';
          if (rank.includes('lecturer') && !rank.includes('senior') && !rank.includes('s.')) {
            onDutyByRank.lecturer++;
          } else if (rank.includes('asst') || rank.includes('assistant')) {
            onDutyByRank.asstProf++;
          } else if (rank.includes('asso') || rank.includes('associate')) {
            onDutyByRank.assoProf++;
          } else if (rank === 'professor' || rank === 'prof' || rank === 'prof.') {
            onDutyByRank.professor++;
          }
        });

        const byStatus = {
          onDuty: deptStaff.filter((s) => s.current_status === 'On Duty').length,
          notOnDuty: deptStaff.filter((s) => s.current_status === 'Not On Duty').length,
          onStudy: deptStaff.filter((s) => s.current_status === 'On Study' || s.current_status === 'On Study Leave').length,
        };

        return {
          id: dept.id,
          code: dept.code,
          name: dept.name,
          total: deptStaff.length,
          byStatus,
          genderByStatus,
          onDutyByRank,
        };
      });

      return deptStats;
    },
  });
};
