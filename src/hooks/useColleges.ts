import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface College {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export const useColleges = () => {
  return useQuery({
    queryKey: ['colleges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as College[];
    },
  });
};

export const useCreateCollege = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (college: { name: string; code: string }) => {
      const { data, error } = await supabase
        .from('colleges')
        .insert(college)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      toast.success('College added successfully');
    },
    onError: (error) => toast.error('Failed to add college: ' + error.message),
  });
};

export const useUpdateCollege = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; code: string }) => {
      const { error } = await supabase
        .from('colleges')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('College updated successfully');
    },
    onError: (error) => toast.error('Failed to update college: ' + error.message),
  });
};

export const useDeleteCollege = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colleges')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('College deleted successfully');
    },
    onError: (error) => toast.error('Failed to delete college: ' + error.message),
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dept: { name: string; code: string; college_id: string; college_name: string }) => {
      const { data, error } = await supabase
        .from('departments')
        .insert(dept)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      toast.success('Department added successfully');
    },
    onError: (error) => toast.error('Failed to add department: ' + error.message),
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; code: string; college_id?: string; college_name?: string }) => {
      const { error } = await supabase
        .from('departments')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated successfully');
    },
    onError: (error) => toast.error('Failed to update department: ' + error.message),
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted successfully');
    },
    onError: (error) => toast.error('Failed to delete department: ' + error.message),
  });
};
