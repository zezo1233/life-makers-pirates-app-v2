import { create } from 'zustand';
import { supabase, TABLES, handleSupabaseError } from '../config/supabase';
import { TrainerApplication } from '../types';

interface TrainerApplicationsState {
  applications: TrainerApplication[];
  isLoading: boolean;
  error: string | null;
}

interface TrainerApplicationsActions {
  fetchApplications: (requestId?: string, trainerId?: string) => Promise<void>;
  applyForRequest: (requestId: string, message?: string) => Promise<void>;
  rejectApplication: (applicationId: string) => Promise<void>;
  rejectRemainingApplications: (requestId: string, selectedTrainerId: string) => Promise<void>;
  getApplicationsByRequest: (requestId: string) => TrainerApplication[];
  getAvailableApplicationsByRequest: (requestId: string) => TrainerApplication[];
  getApplicationsByTrainer: (trainerId: string) => TrainerApplication[];
  hasApplied: (requestId: string, trainerId: string) => boolean;
  subscribeToApplications: () => () => void;
}

type TrainerApplicationsStore = TrainerApplicationsState & TrainerApplicationsActions;

export const useTrainerApplicationsStore = create<TrainerApplicationsStore>((set, get) => ({
  // State
  applications: [],
  isLoading: false,
  error: null,

  // Actions
  fetchApplications: async (requestId?: string, trainerId?: string) => {
    try {
      set({ isLoading: true, error: null });

      let query = supabase
        .from(TABLES.TRAINER_APPLICATIONS)
        .select(`
          *,
          trainer:trainer_id(id, full_name, email, specialization, rating, province),
          reviewer:reviewed_by(id, full_name, email, role)
        `)
        .order('applied_at', { ascending: false });

      if (requestId) {
        query = query.eq('training_request_id', requestId);
      }
      if (trainerId) {
        query = query.eq('trainer_id', trainerId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      set({ applications: data || [], isLoading: false });
    } catch (error) {
      set({ 
        error: handleSupabaseError(error), 
        isLoading: false 
      });
      throw error;
    }
  },

  applyForRequest: async (requestId: string, message?: string) => {
    try {
      set({ isLoading: true, error: null });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if already applied
      const { data: existingApplication } = await supabase
        .from(TABLES.TRAINER_APPLICATIONS)
        .select('id')
        .eq('training_request_id', requestId)
        .eq('trainer_id', user.id)
        .single();

      if (existingApplication) {
        throw new Error('You have already applied for this training request');
      }

      // Create application
      const { data, error } = await supabase
        .from(TABLES.TRAINER_APPLICATIONS)
        .insert({
          training_request_id: requestId,
          trainer_id: user.id,
          application_message: message,
          status: 'pending'
        })
        .select(`
          *,
          trainer:trainer_id(id, full_name, email, specialization, rating, province),
          reviewer:reviewed_by(id, full_name, email, role)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add to local state
      set(state => ({
        applications: [data, ...state.applications],
        isLoading: false
      }));

      return data;
    } catch (error) {
      set({ 
        error: handleSupabaseError(error), 
        isLoading: false 
      });
      throw error;
    }
  },

  rejectApplication: async (applicationId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from(TABLES.TRAINER_APPLICATIONS)
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', applicationId)
        .select(`
          *,
          trainer:trainer_id(id, full_name, email, specialization, rating, province),
          reviewer:reviewed_by(id, full_name, email, role)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      set(state => ({
        applications: state.applications.map(app =>
          app.id === applicationId ? data : app
        ),
        isLoading: false
      }));

      return data;
    } catch (error) {
      set({
        error: handleSupabaseError(error),
        isLoading: false
      });
      throw error;
    }
  },

  rejectRemainingApplications: async (requestId: string, selectedTrainerId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Reject all pending applications for this request except the selected trainer
      const { data, error } = await supabase
        .from(TABLES.TRAINER_APPLICATIONS)
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('training_request_id', requestId)
        .eq('status', 'pending')
        .neq('trainer_id', selectedTrainerId)
        .select(`
          *,
          trainer:trainer_id(id, full_name, email, specialization, rating, province),
          reviewer:reviewed_by(id, full_name, email, role)
        `);

      if (error) {
        throw error;
      }

      // Update local state
      set(state => ({
        applications: state.applications.map(app => {
          // If this application was updated (rejected), update it
          const updatedApp = data?.find(updated => updated.id === app.id);
          return updatedApp || app;
        }),
        isLoading: false
      }));

      return data;
    } catch (error) {
      set({
        error: handleSupabaseError(error),
        isLoading: false
      });
      throw error;
    }
  },

  getApplicationsByRequest: (requestId: string) => {
    return get().applications.filter(app => app.training_request_id === requestId);
  },

  getAvailableApplicationsByRequest: (requestId: string) => {
    return get().applications.filter(app =>
      app.training_request_id === requestId && app.status === 'pending'
    );
  },

  getApplicationsByTrainer: (trainerId: string) => {
    return get().applications.filter(app => app.trainer_id === trainerId);
  },

  hasApplied: (requestId: string, trainerId: string) => {
    return get().applications.some(app => 
      app.training_request_id === requestId && 
      app.trainer_id === trainerId
    );
  },

  subscribeToApplications: () => {
    const subscription = supabase
      .channel('trainer_applications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.TRAINER_APPLICATIONS,
        },
        (payload) => {
          console.log('Trainer application change:', payload);
          // Refresh applications when changes occur
          get().fetchApplications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
}));

// Helper functions
export const canReviewApplications = (userRole: string): boolean => {
  return userRole === 'SV' || userRole === 'PM';
};

export const getApplicationStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#ffc107';
    case 'rejected':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

export const getApplicationStatusDisplayName = (status: string, language: string): string => {
  const statusNames = {
    en: {
      pending: 'Pending',
      rejected: 'Rejected',
    },
    ar: {
      pending: 'في الانتظار',
      rejected: 'مرفوض',
    },
  };

  return statusNames[language as keyof typeof statusNames]?.[status] || status;
};
