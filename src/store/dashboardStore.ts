import { create } from 'zustand';
import { supabase, TABLES, handleSupabaseError } from '../config/supabase';
import { UserRole, TrainingStatus } from '../types';

export interface DashboardStats {
  totalRequests: number;
  pendingActions: number;
  completedToday: number;
  avgProcessingTime: number;
  successRate: number;
}

export interface RoleDashboard {
  role: UserRole;
  stats: DashboardStats;
  quickActions: QuickAction[];
  alerts: Alert[];
  recentActivity: ActivityItem[];
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  count?: number;
  priority: 'high' | 'medium' | 'low';
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  requestId?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'request_created' | 'status_changed' | 'trainer_assigned' | 'completed';
  title: string;
  description: string;
  timestamp: string;
  requestId?: string;
}

interface DashboardState {
  dashboard: RoleDashboard | null;
  isLoading: boolean;
  error: string | null;
}

interface DashboardActions {
  fetchDashboard: (userId: string, userRole: UserRole) => Promise<void>;
  refreshStats: (userId: string, userRole: UserRole) => Promise<void>;
  clearError: () => void;
}

type DashboardStore = DashboardState & DashboardActions;

// Role-specific dashboard configurations
export const getRoleDashboardConfig = (role: UserRole): Partial<RoleDashboard> => {
  const configs = {
    [UserRole.DEVELOPMENT_MANAGEMENT_OFFICER]: {
      quickActions: [
        {
          id: 'review_pending',
          title: 'مراجعة الطلبات المعلقة',
          description: 'طلبات تحتاج مراجعة فورية',
          icon: 'document-text-outline',
          action: 'review_requests',
          priority: 'high' as const
        },
        {
          id: 'quick_approve',
          title: 'موافقة سريعة',
          description: 'موافقة على الطلبات المعيارية',
          icon: 'checkmark-circle-outline',
          action: 'quick_approve',
          priority: 'medium' as const
        },
        {
          id: 'request_info',
          title: 'طلب معلومات إضافية',
          description: 'طلب توضيحات من المنشئين',
          icon: 'help-circle-outline',
          action: 'request_info',
          priority: 'low' as const
        }
      ]
    },
    [UserRole.TRAINER_PREPARATION_PROJECT_MANAGER]: {
      quickActions: [
        {
          id: 'approve_batch',
          title: 'موافقة مجمعة',
          description: 'موافقة على عدة طلبات معاً',
          icon: 'checkmark-done-outline',
          action: 'batch_approve',
          priority: 'high' as const
        },
        {
          id: 'resource_planning',
          title: 'تخطيط الموارد',
          description: 'تحليل الموارد المتاحة',
          icon: 'analytics-outline',
          action: 'resource_planning',
          priority: 'medium' as const
        },
        {
          id: 'schedule_optimization',
          title: 'تحسين الجدولة',
          description: 'تحسين جدولة التدريبات',
          icon: 'calendar-outline',
          action: 'optimize_schedule',
          priority: 'medium' as const
        }
      ]
    },
    [UserRole.PROGRAM_SUPERVISOR]: {
      quickActions: [
        {
          id: 'ai_trainer_match',
          title: 'مطابقة ذكية للمدربين',
          description: 'استخدام الذكاء الاصطناعي لاختيار المدرب',
          icon: 'bulb-outline',
          action: 'ai_trainer_match',
          priority: 'high' as const
        },
        {
          id: 'trainer_performance',
          title: 'تقييم أداء المدربين',
          description: 'مراجعة تقييمات المدربين',
          icon: 'star-outline',
          action: 'trainer_performance',
          priority: 'medium' as const
        },
        {
          id: 'quick_assign',
          title: 'تعيين سريع',
          description: 'تعيين مدربين للطلبات العاجلة',
          icon: 'flash-outline',
          action: 'quick_assign',
          priority: 'high' as const
        }
      ]
    },
    [UserRole.PROVINCIAL_DEVELOPMENT_OFFICER]: {
      quickActions: [
        {
          id: 'create_request',
          title: 'إنشاء طلب جديد',
          description: 'إنشاء طلب تدريب جديد',
          icon: 'add-circle-outline',
          action: 'create_request',
          priority: 'high' as const
        },
        {
          id: 'schedule_training',
          title: 'جدولة التدريبات',
          description: 'جدولة التدريبات المعتمدة',
          icon: 'calendar-outline',
          action: 'schedule_training',
          priority: 'medium' as const
        },
        {
          id: 'track_progress',
          title: 'متابعة التقدم',
          description: 'متابعة حالة الطلبات',
          icon: 'trending-up-outline',
          action: 'track_progress',
          priority: 'low' as const
        }
      ]
    },
    [UserRole.TRAINER]: {
      quickActions: [
        {
          id: 'browse_opportunities',
          title: 'تصفح الفرص',
          description: 'تصفح فرص التدريب المتاحة',
          icon: 'search-outline',
          action: 'browse_opportunities',
          priority: 'high' as const
        },
        {
          id: 'update_availability',
          title: 'تحديث التوفر',
          description: 'تحديث جدول التوفر',
          icon: 'time-outline',
          action: 'update_availability',
          priority: 'medium' as const
        },
        {
          id: 'view_feedback',
          title: 'عرض التقييمات',
          description: 'مراجعة تقييمات التدريبات السابقة',
          icon: 'chatbubble-outline',
          action: 'view_feedback',
          priority: 'low' as const
        }
      ]
    },
    [UserRole.BOARD_MEMBER]: {
      quickActions: [
        {
          id: 'view_analytics',
          title: 'عرض التحليلات',
          description: 'تحليلات شاملة للنظام',
          icon: 'bar-chart-outline',
          action: 'view_analytics',
          priority: 'high' as const
        },
        {
          id: 'strategic_overview',
          title: 'نظرة استراتيجية',
          description: 'ملخص استراتيجي للأداء',
          icon: 'telescope-outline',
          action: 'strategic_overview',
          priority: 'medium' as const
        }
      ]
    }
  };

  return configs[role] || { quickActions: [] };
};

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // State
  dashboard: null,
  isLoading: false,
  error: null,

  // Actions
  fetchDashboard: async (userId: string, userRole: UserRole) => {
    try {
      set({ isLoading: true, error: null });

      // Fetch user-specific stats
      const stats = await fetchUserStats(userId, userRole);
      const alerts = await fetchUserAlerts(userId, userRole);
      const recentActivity = await fetchRecentActivity(userId, userRole);

      // Get role configuration
      const roleConfig = getRoleDashboardConfig(userRole);

      // Add counts to quick actions
      const quickActions = await Promise.all(
        (roleConfig.quickActions || []).map(async (action) => ({
          ...action,
          count: await getActionCount(action.action, userId, userRole)
        }))
      );

      const dashboard: RoleDashboard = {
        role: userRole,
        stats,
        quickActions,
        alerts,
        recentActivity
      };

      set({ dashboard, isLoading: false });
    } catch (error) {
      set({
        error: handleSupabaseError(error),
        isLoading: false
      });
    }
  },

  refreshStats: async (userId: string, userRole: UserRole) => {
    const currentDashboard = get().dashboard;
    if (!currentDashboard) return;

    try {
      const stats = await fetchUserStats(userId, userRole);
      set({
        dashboard: {
          ...currentDashboard,
          stats
        }
      });
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));

// Helper functions
async function fetchUserStats(userId: string, userRole: UserRole): Promise<DashboardStats> {
  // Implementation will vary based on role
  const { data: requests } = await supabase
    .from(TABLES.TRAINING_REQUESTS)
    .select('*')
    .or(getUserStatsFilter(userId, userRole));

  const totalRequests = requests?.length || 0;
  const pendingActions = requests?.filter(r => needsUserAction(r, userRole)).length || 0;
  const completedToday = requests?.filter(r => 
    r.status === 'completed' && 
    new Date(r.updated_at).toDateString() === new Date().toDateString()
  ).length || 0;

  return {
    totalRequests,
    pendingActions,
    completedToday,
    avgProcessingTime: 5.2, // Mock data - calculate from actual data
    successRate: 94.5 // Mock data - calculate from actual data
  };
}

async function fetchUserAlerts(userId: string, userRole: UserRole): Promise<Alert[]> {
  // Mock implementation - replace with actual logic
  return [];
}

async function fetchRecentActivity(userId: string, userRole: UserRole): Promise<ActivityItem[]> {
  // Mock implementation - replace with actual logic
  return [];
}

async function getActionCount(action: string, userId: string, userRole: UserRole): Promise<number> {
  // Mock implementation - replace with actual logic
  return Math.floor(Math.random() * 10);
}

function getUserStatsFilter(userId: string, userRole: UserRole): string {
  switch (userRole) {
    case UserRole.PROVINCIAL_DEVELOPMENT_OFFICER:
      return `requester_id.eq.${userId}`;
    case UserRole.DEVELOPMENT_MANAGEMENT_OFFICER:
      return `status.eq.under_review`;
    case UserRole.TRAINER_PREPARATION_PROJECT_MANAGER:
      return `status.in.(cc_approved,sv_approved)`;
    default:
      return `id.neq.null`; // All requests
  }
}

function needsUserAction(request: any, userRole: UserRole): boolean {
  switch (userRole) {
    case UserRole.DEVELOPMENT_MANAGEMENT_OFFICER:
      return request.status === 'under_review';
    case UserRole.TRAINER_PREPARATION_PROJECT_MANAGER:
      return ['cc_approved', 'sv_approved'].includes(request.status);
    case UserRole.PROGRAM_SUPERVISOR:
      return ['pm_approved', 'tr_assigned'].includes(request.status);
    case UserRole.PROVINCIAL_DEVELOPMENT_OFFICER:
      return request.status === 'final_approved';
    default:
      return false;
  }
}
