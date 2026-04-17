import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Staff, StaffCategory, SexType, EducationLevel } from '@/types/staff';
import { toast } from 'sonner';
import { sendStaffNotificationToAVD } from '@/lib/emailNotifications';

// Helper to create database notification for AVD
const createAVDNotification = async (
  type: 'staff_added' | 'staff_deleted',
  staffName: string,
  departmentId: string | null,
  departmentName: string,
  performedBy: string
) => {
  try {
    const action = type === 'staff_added' ? 'added to' : 'removed from';
    await supabase.from('notifications').insert({
      type,
      title: `Staff ${type === 'staff_added' ? 'Added' : 'Deleted'}`,
      message: `${staffName} has been ${action} ${departmentName} by ${performedBy}`,
      department_id: departmentId,
      staff_name: staffName,
      performed_by: performedBy,
      target_role: 'avd' as const,
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

// Helper to create a staff change request
const createChangeRequest = async (params: {
  action_type: 'add' | 'update' | 'delete';
  staff_id?: string | null;
  department_id: string | null;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  staff_name: string;
  performed_by_id: string;
  performed_by_name: string;
}) => {
  const { error } = await supabase.from('staff_changes').insert({
    action_type: params.action_type,
    staff_id: params.staff_id || null,
    department_id: params.department_id,
    old_data: params.old_data || null,
    new_data: params.new_data || null,
    staff_name: params.staff_name,
    performed_by_id: params.performed_by_id,
    performed_by_name: params.performed_by_name,
  });
  if (error) console.error('Failed to create change request:', error);

  // Notify system admin and AVD
  const notifications = [
    {
      type: `change_${params.action_type}`,
      title: `Staff ${params.action_type === 'add' ? 'Addition' : params.action_type === 'update' ? 'Update' : 'Deletion'} Pending`,
      message: `${params.performed_by_name} wants to ${params.action_type} ${params.staff_name}. Awaiting approval.`,
      department_id: params.department_id,
      staff_name: params.staff_name,
      performed_by: params.performed_by_name,
      target_role: 'system_admin' as const,
    },
    {
      type: `change_${params.action_type}`,
      title: `Staff ${params.action_type === 'add' ? 'Addition' : params.action_type === 'update' ? 'Update' : 'Deletion'} Pending`,
      message: `${params.performed_by_name} wants to ${params.action_type} ${params.staff_name}. Awaiting approval.`,
      department_id: params.department_id,
      staff_name: params.staff_name,
      performed_by: params.performed_by_name,
      target_role: 'avd' as const,
    },
  ];

  await supabase.from('notifications').insert(notifications);
};

export const useStaff = (filters?: {
  category?: StaffCategory;
  departmentId?: string;
  departmentIds?: string[];
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
      } else if (filters?.departmentIds && filters.departmentIds.length > 0) {
        query = query.in('department_id', filters.departmentIds);
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

export const useDepartments = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ['departments', collegeId],
    queryFn: async () => {
      let query = supabase
        .from('departments')
        .select('*')
        .order('code');

      if (collegeId) {
        query = query.eq('college_id', collegeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

interface CreateStaffOptions {
  departmentName?: string;
  performedBy?: string;
  skipNotification?: boolean;
  isAdmin?: boolean;
  userId?: string;
}

export const useCreateStaff = (options?: CreateStaffOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: Omit<Staff, 'id' | 'created_at' | 'updated_at' | 'departments'> & { 
      notificationOptions?: CreateStaffOptions 
    }) => {
      const { notificationOptions, ...staffData } = staff;
      const opts = notificationOptions || options;
      const isAdmin = opts?.isAdmin ?? false;

      if (!isAdmin) {
        // Non-admin: create pending change request, don't insert staff yet
        await createChangeRequest({
          action_type: 'add',
          department_id: staffData.department_id || null,
          new_data: staffData,
          staff_name: staffData.full_name,
          performed_by_id: opts?.userId || '',
          performed_by_name: opts?.performedBy || 'Department User',
        });
        toast.info('Staff addition submitted for admin approval');
        return null;
      }

      // Admin: insert directly
      const { data, error } = await supabase
        .from('staff')
        .insert(staffData)
        .select('*, departments(*)')
        .single();

      if (error) throw error;
      
      if (!opts?.skipNotification) {
        const deptName = (data as any)?.departments?.name || opts?.departmentName || 'Unknown Department';
        const deptId = (data as any)?.department_id || null;
        const performer = opts?.performedBy || 'System Admin';
        
        createAVDNotification('staff_added', data.full_name, deptId, deptName, performer);
        sendStaffNotificationToAVD('added', data.full_name, deptName, performer)
          .catch(err => console.error('Failed to send AVD notification:', err));
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (data) toast.success('Staff member added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add staff member: ' + error.message);
    },
  });
};

interface UpdateStaffOptions {
  isAdmin?: boolean;
  userId?: string;
  performedBy?: string;
}

export const useUpdateStaff = (updateOptions?: UpdateStaffOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, _updateOpts, ...staffUpdate }: Partial<Staff> & { id: string; _updateOpts?: UpdateStaffOptions }) => {
      const opts = _updateOpts || updateOptions;
      const isAdmin = opts?.isAdmin ?? false;

      if (!isAdmin) {
        // Hybrid: apply the edit immediately but track for undo
        // First get old data
        const { data: oldStaff, error: fetchErr } = await supabase
          .from('staff')
          .select('*')
          .eq('id', id)
          .single();
        if (fetchErr) throw fetchErr;

        // Build old_data with only the changed fields
        const oldData: Record<string, any> = {};
        for (const key of Object.keys(staffUpdate)) {
          oldData[key] = (oldStaff as any)[key];
        }

        // Apply the update
        const { data, error } = await supabase
          .from('staff')
          .update(staffUpdate)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;

        // Create change request for tracking / undo
        await createChangeRequest({
          action_type: 'update',
          staff_id: id,
          department_id: oldStaff.department_id,
          old_data: oldData,
          new_data: staffUpdate as Record<string, any>,
          staff_name: oldStaff.full_name,
          performed_by_id: opts?.userId || '',
          performed_by_name: opts?.performedBy || 'Department User',
        });

        return data;
      }

      // Admin: update directly, no tracking
      const { data, error } = await supabase
        .from('staff')
        .update(staffUpdate)
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
      queryClient.invalidateQueries({ queryKey: ['staff-changes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
  isAdmin?: boolean;
  userId?: string;
}

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, options }: { id: string; options?: DeleteStaffOptions }) => {
      const isAdmin = options?.isAdmin ?? false;

      // Get staff details
      const { data: staffData, error: fetchError } = await supabase
        .from('staff')
        .select('*, departments(name)')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const staffName = options?.staffName || staffData?.full_name || 'Unknown Staff';
      const deptName = options?.departmentName || (staffData as any)?.departments?.name || 'Unknown Department';
      const deptId = staffData?.department_id || null;
      const performer = options?.performedBy || 'Department User';

      if (!isAdmin) {
        // Non-admin: create pending deletion request, don't delete yet
        await createChangeRequest({
          action_type: 'delete',
          staff_id: id,
          department_id: deptId,
          old_data: staffData as any,
          staff_name: staffName,
          performed_by_id: options?.userId || '',
          performed_by_name: performer,
        });
        toast.info('Staff deletion submitted for admin approval');
        return;
      }

      // Admin: delete directly
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      createAVDNotification('staff_deleted', staffName, deptId, deptName, performer);
      sendStaffNotificationToAVD('deleted', staffName, deptName, performer)
        .catch(err => console.error('Failed to send AVD notification:', err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Staff member deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete staff member: ' + error.message);
    },
  });
};

export const useStaffStats = (departmentId?: string, departmentIds?: string[]) => {
  return useQuery({
    queryKey: ['staff-stats', departmentId, departmentIds],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('category, sex, education_level, academic_rank, current_status');
      
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      } else if (departmentIds && departmentIds.length > 0) {
        query = query.in('department_id', departmentIds);
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
        byStatus: {} as Record<string, number>,
        onDutyByRank: {
          total: 0,
          lecturer: 0,
          asstProf: 0,
          assoProf: 0,
          professor: 0,
        },
        onDutyARACount: 0,
      };

      data.forEach((staff) => {
        const cat = staff.category as StaffCategory;
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
        stats.bySex[staff.sex as SexType]++;
        const edu = staff.education_level as string;
        stats.byEducation[edu] = (stats.byEducation[edu] || 0) + 1;
        
        const rawStatus = staff.current_status || 'Unknown';
        let status = rawStatus;
        if (rawStatus.toLowerCase() === 'on duty') status = 'On Duty';
        else if (rawStatus.toLowerCase() === 'not on duty') status = 'Not On Duty';
        
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        
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
        
        if (status === 'On Duty') {
          stats.onDutyByRank.total++;
        }
      });

      return stats;
    },
  });
};

export const useDepartmentStats = (collegeId?: string | null) => {
  return useQuery({
    queryKey: ['department-stats', collegeId],
    queryFn: async () => {
      let deptQuery = supabase
        .from('departments')
        .select('id, code, name')
        .order('code');

      if (collegeId) {
        deptQuery = deptQuery.eq('college_id', collegeId);
      }

      const { data: departments, error: deptError } = await deptQuery;

      if (deptError) throw deptError;

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('department_id, current_status, academic_rank, sex, category');

      if (staffError) throw staffError;

      const deptStats = departments.map((dept) => {
        const deptStaff = staffData.filter((s) => s.department_id === dept.id);
        
        const genderByStatus = {
          onDuty: { M: 0, F: 0 },
          notOnDuty: { M: 0, F: 0 },
          onStudy: { M: 0, F: 0 },
          sick: { M: 0, F: 0 },
          onStudyNotReporting: { M: 0, F: 0 },
          onDutyARA: { M: 0, F: 0 },
        };

        deptStaff.forEach((staff) => {
          const sex = staff.sex as 'M' | 'F';
          const status = staff.current_status;
          const category = (staff as any).category;
          const isARA = category === 'ARA';
          
          if (status === 'On Duty') {
            if (isARA) {
              genderByStatus.onDutyARA[sex]++;
            } else {
              genderByStatus.onDuty[sex]++;
            }
          } else if (status === 'Not On Duty') {
            genderByStatus.notOnDuty[sex]++;
          } else if (status === 'On Study' || status === 'On Study Leave') {
            genderByStatus.onStudy[sex]++;
          } else if (status === 'Sick') {
            genderByStatus.sick[sex]++;
          } else if (status === 'On Study and Not Reporting') {
            genderByStatus.onStudyNotReporting[sex]++;
          }
        });

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

        const onDutyARACount = deptStaff.filter((s) => 
          (s as any).category === 'ARA' && s.current_status === 'On Duty'
        ).length;

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
          onDutyARACount,
        };
      });

      return deptStats;
    },
  });
};
