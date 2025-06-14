import { create } from 'zustand';
import { supabase, TABLES, handleSupabaseError } from '../config/supabase';
import { TrainingRequest, TrainingStatus, UserRole } from '../types';
// Removed old imports - using perfect notification system now

interface TrainingRequestsState {
  requests: TrainingRequest[];
  isLoading: boolean;
  error: string | null;
}

interface TrainingRequestsActions {
  fetchRequests: (filters?: RequestFilters) => Promise<void>;
  createRequest: (requestData: CreateRequestData) => Promise<TrainingRequest>;
  updateRequest: (id: string, updates: Partial<TrainingRequest>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  getRequestById: (id: string) => TrainingRequest | undefined;
  getRequestsByStatus: (status: TrainingStatus) => TrainingRequest[];
  getRequestsByUser: (userId: string) => TrainingRequest[];
  subscribeToRequests: () => () => void;
  clearError: () => void;
}

interface RequestFilters {
  status?: TrainingStatus;
  province?: string;
  specialization?: string;
  requesterId?: string;
  assignedTrainerId?: string;
  dateFrom?: string;
  dateTo?: string;
  userRole?: UserRole;
  userSpecializations?: string[];
  userId?: string;
}

interface CreateRequestData {
  title: string;
  description: string;
  specialization: string;
  province: string;
  requested_date: string;
  duration_hours: number;
  max_participants: number;
}

type TrainingRequestsStore = TrainingRequestsState & TrainingRequestsActions;

// Helper function to parse user specializations from database format
export const parseUserSpecializations = (specialization: any): string[] => {
  if (!specialization) return [];

  if (Array.isArray(specialization)) {
    return specialization;
  }

  try {
    // Try to parse as JSON array (PostgreSQL array format)
    const specString = String(specialization);
    const parsed = JSON.parse(specString.replace(/'/g, '"'));
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // If parsing fails, treat as single specialization
    return [String(specialization)];
  }
};

// Helper function to send workflow notifications using the perfect system
const sendWorkflowNotifications = async (
  requestId: string,
  requestTitle: string,
  newStatus: TrainingStatus,
  oldStatus?: TrainingStatus,
  specialization?: string,
  requesterName?: string
) => {
  try {
    const { workflowNotificationService } = await import('../services/WorkflowNotificationService');

    await workflowNotificationService.sendStatusChangeNotification({
      requestId,
      requestTitle,
      newStatus,
      oldStatus,
      specialization,
      requesterName
    });
  } catch (error) {
    console.error('❌ Error sending workflow notifications:', error);
  }
};



// Helper function to apply role-based filtering
const applyRoleBasedFiltering = async (
  requests: TrainingRequest[],
  userRole: UserRole,
  userSpecializations: string[],
  userId?: string
): Promise<TrainingRequest[]> => {
  // Mapping from English (used in training_requests) to Arabic (used in users)
  const specializationMapping: Record<string, string> = {
    'communication': 'التواصل الفعال',
    'presentation': 'العرض والتقديم',
    'mindset': 'العقلية',
    'teamwork': 'العمل الجماعي'
  };

  // Reverse mapping from Arabic to English
  const reverseMapping: Record<string, string> = {};
  Object.entries(specializationMapping).forEach(([eng, ar]) => {
    reverseMapping[ar] = eng;
  });

  switch (userRole) {
    case UserRole.TRAINER:
      // Trainers see requests that match their specializations and are ready for trainer applications
      return requests.filter(request => {
        // Show requests that are approved by PM (regardless of assignment status)
        // This allows multiple trainers to apply/show interest
        const isApprovedForTrainer = request.status === 'pm_approved';

        // Convert request specialization from English to Arabic for comparison
        const requestSpecInArabic = specializationMapping[request.specialization] || request.specialization;

        // Check if request specialization matches any of trainer's specializations
        const hasMatchingSpecialization = userSpecializations.includes(requestSpecInArabic);

        return isApprovedForTrainer && hasMatchingSpecialization;
      });

    case UserRole.PROGRAM_SUPERVISOR:
      // Supervisors see requests in their specialization that need their attention
      return requests.filter(request => {
        // Convert request specialization from English to Arabic for comparison
        const requestSpecInArabic = specializationMapping[request.specialization] || request.specialization;
        const hasMatchingSpecialization = userSpecializations.includes(requestSpecInArabic);

        // Show requests that need SV attention: pm_approved (for trainer selection) and tr_assigned (for approval)
        const isRelevantStatus = ['pm_approved', 'tr_assigned'].includes(request.status);

        return hasMatchingSpecialization && isRelevantStatus;
      });

    case UserRole.PROVINCIAL_DEVELOPMENT_OFFICER:
      // DV sees only their own requests
      if (userId) {
        return requests.filter(request => request.requester_id === userId);
      }
      return []; // If no userId provided, return empty for security

    case UserRole.DEVELOPMENT_MANAGEMENT_OFFICER:
      // CC sees requests that need their review
      return requests.filter(request => request.status === 'under_review');

    case UserRole.TRAINER_PREPARATION_PROJECT_MANAGER:
      // PM sees requests that need their approval and oversight
      return requests.filter(request =>
        ['cc_approved', 'sv_approved', 'pm_approved', 'tr_assigned', 'final_approved', 'scheduled', 'completed', 'cancelled'].includes(request.status)
      );

    case UserRole.BOARD_MEMBER:
      // Board members see all requests (no filter)
      return requests;

    default:
      // Other roles see all requests (fallback)
      return requests;
  }
};

export const useTrainingRequestsStore = create<TrainingRequestsStore>((set, get) => ({
  // State
  requests: [],
  isLoading: false,
  error: null,

  // Actions
  fetchRequests: async (filters?: RequestFilters) => {
    try {
      set({ isLoading: true, error: null });

      let query = supabase
        .from(TABLES.TRAINING_REQUESTS)
        .select(`
          *,
          requester:requester_id(id, full_name, email, role, province),
          assigned_trainer:assigned_trainer_id(id, full_name, email, specialization, rating)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.province) {
        query = query.eq('province', filters.province);
      }
      if (filters?.specialization) {
        query = query.eq('specialization', filters.specialization);
      }
      if (filters?.requesterId) {
        query = query.eq('requester_id', filters.requesterId);
      }
      if (filters?.assignedTrainerId) {
        query = query.eq('assigned_trainer_id', filters.assignedTrainerId);
      }
      if (filters?.dateFrom) {
        query = query.gte('requested_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('requested_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let filteredData = data || [];

      // Apply role-based filtering
      if (filters?.userRole && filters?.userSpecializations) {
        filteredData = await applyRoleBasedFiltering(filteredData, filters.userRole, filters.userSpecializations, filters.userId);
      }

      set({ requests: filteredData, isLoading: false });
    } catch (error) {
      set({
        error: handleSupabaseError(error),
        isLoading: false
      });
      throw error;
    }
  },

  createRequest: async (requestData: CreateRequestData) => {
    try {
      set({ isLoading: true, error: null });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const newRequest = {
        ...requestData,
        requester_id: user.id,
        status: 'under_review' as TrainingStatus, // يبدأ مباشرة في المراجعة
      };

      // Insert the basic record first
      const { data: insertResults, error: insertError } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .insert([newRequest])
        .select('*');

      if (insertError) {
        throw insertError;
      }

      const basicRecord = insertResults?.[0];
      if (!basicRecord) {
        throw new Error('Failed to create training request');
      }

      // Fetch the complete record with relations
      const { data: completeResults, error: fetchError } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .select(`
          *,
          requester:requester_id(id, full_name, email, role, province),
          assigned_trainer:assigned_trainer_id(id, full_name, email, specialization, rating)
        `)
        .eq('id', basicRecord.id);

      if (fetchError) {
        console.warn('Failed to fetch relations for new request:', fetchError);
      }

      // Use complete record if available, otherwise use basic record
      const data = completeResults?.[0] || basicRecord;

      // Add to local state
      set(state => ({
        requests: [data, ...state.requests],
        isLoading: false
      }));

      // Send notification for new training request using perfect system
      try {
        console.log('📤 Sending notifications for new training request...');
        const { workflowNotificationService } = await import('../services/WorkflowNotificationService');

        // Get requester name
        const { data: requesterData } = await supabase
          .from(TABLES.USERS)
          .select('full_name')
          .eq('id', user.id)
          .single();

        const requesterName = requesterData?.full_name || 'مستخدم غير معروف';

        await workflowNotificationService.sendNewTrainingRequestNotification(
          data.id,
          data.title,
          data.specialization,
          requesterName
        );

        console.log('✅ New training request notifications sent successfully');
      } catch (notificationError) {
        console.error('❌ Failed to send notifications:', notificationError);
        // Don't throw error - request was created successfully
      }

      return data;
    } catch (error) {
      set({ 
        error: handleSupabaseError(error), 
        isLoading: false 
      });
      throw error;
    }
  },

  updateRequest: async (id: string, updates: Partial<TrainingRequest>) => {
    try {
      set({ isLoading: true, error: null });

      // First, check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .select('id')
        .eq('id', id);

      if (checkError) {
        throw checkError;
      }

      if (!existingRecord || existingRecord.length === 0) {
        throw new Error(`Training request with id ${id} not found`);
      }

      // Update the record
      const { data: updateResults, error: updateError } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .update(updates)
        .eq('id', id)
        .select('*');

      if (updateError) {
        throw updateError;
      }

      const updatedRecord = updateResults?.[0];
      if (!updatedRecord) {
        throw new Error(`Failed to update training request with id ${id}`);
      }

      // Fetch the complete record with relations separately
      const { data: completeResults, error: fetchError } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .select(`
          *,
          requester:requester_id(id, full_name, email, role, province),
          assigned_trainer:assigned_trainer_id(id, full_name, email, specialization, rating)
        `)
        .eq('id', id);

      if (fetchError) {
        console.warn('Failed to fetch relations, using basic record:', fetchError);
        // Use the basic updated record if relations fail
        set(state => ({
          requests: state.requests.map(req =>
            req.id === id ? { ...req, ...updatedRecord } : req
          ),
          isLoading: false
        }));
        return;
      }

      const completeRecord = completeResults?.[0];
      if (completeRecord) {
        // Send workflow notifications if status changed
        if (updates.status && completeRecord.status !== updates.status) {
          await sendWorkflowNotifications(
            id,
            completeRecord.title,
            updates.status as TrainingStatus,
            completeRecord.status
          );
        }

        // Update local state with complete record
        set(state => ({
          requests: state.requests.map(req =>
            req.id === id ? completeRecord : req
          ),
          isLoading: false
        }));
      } else {
        // Send workflow notifications if status changed
        if (updates.status && updatedRecord.status !== updates.status) {
          await sendWorkflowNotifications(
            id,
            updatedRecord.title,
            updates.status as TrainingStatus,
            updatedRecord.status
          );
        }

        // Fallback to basic record
        set(state => ({
          requests: state.requests.map(req =>
            req.id === id ? { ...req, ...updatedRecord } : req
          ),
          isLoading: false
        }));
      }
    } catch (error) {
      set({
        error: handleSupabaseError(error),
        isLoading: false
      });
      throw error;
    }
  },

  deleteRequest: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Remove from local state
      set(state => ({
        requests: state.requests.filter(req => req.id !== id),
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: handleSupabaseError(error), 
        isLoading: false 
      });
      throw error;
    }
  },

  getRequestById: (id: string) => {
    return get().requests.find(req => req.id === id);
  },

  getRequestsByStatus: (status: TrainingStatus) => {
    return get().requests.filter(req => req.status === status);
  },

  getRequestsByUser: (userId: string) => {
    return get().requests.filter(req => 
      req.requester_id === userId || req.assigned_trainer_id === userId
    );
  },

  subscribeToRequests: () => {
    const subscription = supabase
      .channel('training_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.TRAINING_REQUESTS,
        },
        async (payload) => {
          console.log('Training request change:', payload);
          // Refresh requests when changes occur
          // We need to get current user info for filtering
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const { data: userData } = await supabase
                .from(TABLES.USERS)
                .select('role, specialization')
                .eq('id', authUser.id)
                .single();

              if (userData) {
                const userSpecializations = parseUserSpecializations(userData.specialization);

                const filters = {
                  userRole: userData.role,
                  userSpecializations,
                  userId: authUser.id
                };
                get().fetchRequests(filters);
              } else {
                get().fetchRequests();
              }
            } else {
              get().fetchRequests();
            }
          } catch (error) {
            console.error('Error refreshing requests:', error);
            get().fetchRequests();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Helper functions for role-based access
export const canCreateRequest = (userRole: UserRole): boolean => {
  return [
    UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,    // DV - مسؤول تنمية المحافظة
    UserRole.TRAINER_PREPARATION_PROJECT_MANAGER, // PM - مسؤول مشروع إعداد المدربين
  ].includes(userRole);
};

export const canEditRequest = (userRole: UserRole, requestStatus: TrainingStatus, requesterId: string, userId: string): boolean => {
  // Only DV (Provincial Development Officer) can edit requests
  if (userRole !== UserRole.PROVINCIAL_DEVELOPMENT_OFFICER) {
    return false;
  }

  // Only the requester can edit their own request
  if (requesterId !== userId) {
    return false;
  }

  // Can only edit requests that are still under review
  return requestStatus === TrainingStatus.UNDER_REVIEW;
};

export const canApproveRequest = (userRole: UserRole, requestStatus: TrainingStatus): boolean => {
  switch (requestStatus) {
    case 'under_review':
      return userRole === UserRole.DEVELOPMENT_MANAGEMENT_OFFICER; // CC يوافق أولاً
    case 'cc_approved':
      return userRole === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER; // PM يوافق ثانياً
    case 'tr_assigned':
      return userRole === UserRole.PROGRAM_SUPERVISOR; // SV يوافق ثالثاً
    case 'sv_approved':
      return userRole === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER; // PM يوافق نهائياً
    case 'final_approved':
      return userRole === UserRole.PROVINCIAL_DEVELOPMENT_OFFICER; // DV يضغط received
    case 'scheduled':
      return userRole === UserRole.PROVINCIAL_DEVELOPMENT_OFFICER ||
             userRole === UserRole.TRAINER; // DV أو المدرب يمكنهم إكمال/إلغاء
    default:
      return false;
  }
};

export const getStatusDisplayName = (status: TrainingStatus, language: string): string => {
  const statusNames = {
    en: {
      under_review: 'Under Review',
      cc_approved: 'CC Approved',
      pm_approved: 'PM Approved',
      tr_assigned: 'Trainer Assigned',
      sv_approved: 'SV Approved',
      final_approved: 'Final Approved',
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
    },
    ar: {
      under_review: 'قيد المراجعة',
      cc_approved: 'موافقة مسؤول الإدارة',
      pm_approved: 'موافقة مسؤول المشروع',
      tr_assigned: 'تم تعيين المدرب',
      sv_approved: 'موافقة المتابع',
      final_approved: 'الموافقة النهائية',
      scheduled: 'مجدول',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      rejected: 'مرفوض',
    },
  };

  return statusNames[language as keyof typeof statusNames]?.[status] || status;
};

export const getStatusColor = (status: TrainingStatus): string => {
  switch (status) {
    case 'under_review':
      return '#ffc107';
    case 'cc_approved':
    case 'pm_approved':
    case 'sv_approved':
      return '#17a2b8';
    case 'tr_assigned':
      return '#28a745';
    case 'final_approved':
      return '#28a745';
    case 'scheduled':
      return '#6f42c1';
    case 'completed':
      return '#28a745';
    case 'rejected':
    case 'cancelled':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};
