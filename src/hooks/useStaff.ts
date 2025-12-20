import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Staff, StaffCategory, SexType, EducationLevel } from '@/types/staff';
import { toast } from 'sonner';

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

export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: Omit<Staff, 'id' | 'created_at' | 'updated_at' | 'departments'>) => {
      const { data, error } = await supabase
        .from('staff')
        .insert(staff)
        .select()
        .single();

      if (error) throw error;
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

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
        } else if (rank.includes('asst') || rank.includes('assistant')) {
          stats.byRank['Asst. Prof.']++;
        } else if (rank.includes('asso') || rank.includes('associate')) {
          stats.byRank['Asso. Prof.']++;
        } else if (rank === 'professor' || rank === 'prof' || rank === 'prof.') {
          stats.byRank['Professor']++;
        }
      });

      return stats;
    },
  });
};

// New hook for department-wise statistics
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
        .select('department_id, current_status, academic_rank');

      if (staffError) throw staffError;

      const deptStats = departments.map((dept) => {
        const deptStaff = staffData.filter((s) => s.department_id === dept.id);
        
        const byStatus = {
          onDuty: deptStaff.filter((s) => s.current_status === 'On Duty').length,
          notOnDuty: deptStaff.filter((s) => s.current_status === 'Not On Duty').length,
          onStudy: deptStaff.filter((s) => s.current_status === 'On Study' || s.current_status === 'On Study Leave').length,
        };

        const byRank = {
          lecturer: 0,
          asstProf: 0,
          assoProf: 0,
          professor: 0,
        };

        deptStaff.forEach((staff) => {
          const rank = staff.academic_rank?.toLowerCase() || '';
          if (rank.includes('lecturer') && !rank.includes('senior') && !rank.includes('s.')) {
            byRank.lecturer++;
          } else if (rank.includes('asst') || rank.includes('assistant')) {
            byRank.asstProf++;
          } else if (rank.includes('asso') || rank.includes('associate')) {
            byRank.assoProf++;
          } else if (rank === 'professor' || rank === 'prof' || rank === 'prof.') {
            byRank.professor++;
          }
        });

        return {
          id: dept.id,
          code: dept.code,
          name: dept.name,
          total: deptStaff.length,
          byStatus,
          byRank,
        };
      });

      return deptStats;
    },
  });
};
