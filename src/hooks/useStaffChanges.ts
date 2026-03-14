import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StaffChange {
  id: string;
  action_type: 'add' | 'update' | 'delete';
  status: 'pending' | 'approved' | 'rejected';
  staff_id: string | null;
  department_id: string | null;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  staff_name: string;
  performed_by_id: string;
  performed_by_name: string;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export const usePendingChanges = () => {
  return useQuery({
    queryKey: ['staff-changes', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_changes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StaffChange[];
    },
  });
};

export const useStaffChanges = (filters?: { status?: string; departmentId?: string }) => {
  return useQuery({
    queryKey: ['staff-changes', filters],
    queryFn: async () => {
      let query = supabase
        .from('staff_changes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId);

      const { data, error } = await query;
      if (error) throw error;
      return data as StaffChange[];
    },
  });
};

export const usePendingChangesCount = () => {
  return useQuery({
    queryKey: ['staff-changes-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('staff_changes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });
};

export const useCreateStaffChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: {
      action_type: 'add' | 'update' | 'delete';
      staff_id?: string | null;
      department_id: string | null;
      old_data?: Record<string, any> | null;
      new_data?: Record<string, any> | null;
      staff_name: string;
      performed_by_id: string;
      performed_by_name: string;
    }) => {
      const { data, error } = await supabase
        .from('staff_changes')
        .insert({
          action_type: change.action_type,
          staff_id: change.staff_id || null,
          department_id: change.department_id,
          old_data: change.old_data || null,
          new_data: change.new_data || null,
          staff_name: change.staff_name,
          performed_by_id: change.performed_by_id,
          performed_by_name: change.performed_by_name,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for system admin
      await supabase.from('notifications').insert({
        type: `change_${change.action_type}`,
        title: `Staff ${change.action_type === 'add' ? 'Addition' : change.action_type === 'update' ? 'Update' : 'Deletion'} Pending`,
        message: `${change.performed_by_name} wants to ${change.action_type} ${change.staff_name}. Awaiting your approval.`,
        department_id: change.department_id,
        staff_name: change.staff_name,
        performed_by: change.performed_by_name,
        target_role: 'system_admin' as const,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-changes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
};

export const useApproveChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ changeId, reviewerId }: { changeId: string; reviewerId: string }) => {
      // Get the change
      const { data: change, error: fetchError } = await supabase
        .from('staff_changes')
        .select('*')
        .eq('id', changeId)
        .single();

      if (fetchError) throw fetchError;

      const ch = change as StaffChange;

      // Apply the change
      if (ch.action_type === 'add' && ch.new_data) {
        const { departments, id, created_at, updated_at, ...insertData } = ch.new_data as any;
        const { error } = await supabase.from('staff').insert(insertData);
        if (error) throw error;
      } else if (ch.action_type === 'update' && ch.staff_id && ch.new_data) {
        const { error } = await supabase
          .from('staff')
          .update(ch.new_data)
          .eq('id', ch.staff_id);
        if (error) throw error;
      } else if (ch.action_type === 'delete' && ch.staff_id) {
        const { error } = await supabase
          .from('staff')
          .delete()
          .eq('id', ch.staff_id);
        if (error) throw error;
      }

      // Mark as approved
      const { error: updateError } = await supabase
        .from('staff_changes')
        .update({
          status: 'approved',
          reviewed_by_id: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', changeId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-changes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Change approved and applied');
    },
    onError: (error) => {
      toast.error('Failed to approve change: ' + error.message);
    },
  });
};

export const useRejectChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ changeId, reviewerId, note }: { changeId: string; reviewerId: string; note?: string }) => {
      // For updates that were already applied (hybrid mode), revert them
      const { data: change, error: fetchError } = await supabase
        .from('staff_changes')
        .select('*')
        .eq('id', changeId)
        .single();

      if (fetchError) throw fetchError;

      const ch = change as StaffChange;

      // If it's an update, revert to old data
      if (ch.action_type === 'update' && ch.staff_id && ch.old_data) {
        const { error } = await supabase
          .from('staff')
          .update(ch.old_data)
          .eq('id', ch.staff_id);
        if (error) throw error;
      }

      // Mark as rejected
      const { error: updateError } = await supabase
        .from('staff_changes')
        .update({
          status: 'rejected',
          reviewed_by_id: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_note: note || null,
        })
        .eq('id', changeId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-changes'] });
      queryClient.invalidateQueries({ queryKey: ['staff-changes-pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Change rejected');
    },
    onError: (error) => {
      toast.error('Failed to reject change: ' + error.message);
    },
  });
};
