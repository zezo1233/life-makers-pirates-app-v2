import { supabase, TABLES } from '../config/supabase';
import { TrainingStatus, UserRole } from '../types';

export interface AnalyticsData {
  overview: {
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    pendingRequests: number;
    totalTrainers: number;
    activeTrainers: number;
    totalTrainingHours: number;
    averageRating: number;
  };
  requestsByStatus: {
    status: TrainingStatus;
    count: number;
    percentage: number;
  }[];
  requestsByProvince: {
    province: string;
    count: number;
    percentage: number;
  }[];
  requestsBySpecialization: {
    specialization: string;
    count: number;
    percentage: number;
  }[];
  trainerPerformance: {
    trainerId: string;
    trainerName: string;
    totalTrainings: number;
    averageRating: number;
    totalHours: number;
    completionRate: number;
  }[];
  monthlyTrends: {
    month: string;
    requests: number;
    completedTrainings: number;
    averageRating: number;
  }[];
  topPerformers: {
    trainers: {
      id: string;
      name: string;
      rating: number;
      totalHours: number;
    }[];
    provinces: {
      province: string;
      completionRate: number;
      averageRating: number;
    }[];
  };
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  province?: string;
  specialization?: string;
  trainerId?: string;
  status?: TrainingStatus;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get comprehensive analytics data
   */
  async getAnalyticsData(filters: AnalyticsFilters = {}): Promise<AnalyticsData> {
    try {
      const [
        overview,
        requestsByStatus,
        requestsByProvince,
        requestsBySpecialization,
        trainerPerformance,
        monthlyTrends,
        topPerformers,
      ] = await Promise.all([
        this.getOverviewData(filters),
        this.getRequestsByStatus(filters),
        this.getRequestsByProvince(filters),
        this.getRequestsBySpecialization(filters),
        this.getTrainerPerformance(filters),
        this.getMonthlyTrends(filters),
        this.getTopPerformers(filters),
      ]);

      return {
        overview,
        requestsByStatus,
        requestsByProvince,
        requestsBySpecialization,
        trainerPerformance,
        monthlyTrends,
        topPerformers,
      };
    } catch (error) {
      console.error('Analytics Service Error:', error);
      throw new Error('Failed to fetch analytics data');
    }
  }

  /**
   * Get overview statistics
   */
  private async getOverviewData(filters: AnalyticsFilters) {
    // Get training requests data
    let requestsQuery = supabase
      .from(TABLES.TRAINING_REQUESTS)
      .select('status, duration_hours');

    if (filters.dateFrom) {
      requestsQuery = requestsQuery.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      requestsQuery = requestsQuery.lte('created_at', filters.dateTo);
    }
    if (filters.province) {
      requestsQuery = requestsQuery.eq('province', filters.province);
    }

    const { data: requests, error: requestsError } = await requestsQuery;
    if (requestsError) throw requestsError;

    // Get trainers data
    const { data: trainers, error: trainersError } = await supabase
      .from(TABLES.USERS)
      .select('id, is_active, rating, total_training_hours')
      .eq('role', UserRole.TRAINER);

    if (trainersError) throw trainersError;

    const totalRequests = requests?.length || 0;
    const approvedRequests = requests?.filter(r => r.status === TrainingStatus.FINAL_APPROVED).length || 0;
    const rejectedRequests = requests?.filter(r => r.status === TrainingStatus.REJECTED).length || 0;
    const pendingRequests = totalRequests - approvedRequests - rejectedRequests;

    const totalTrainers = trainers?.length || 0;
    const activeTrainers = trainers?.filter(t => t.is_active).length || 0;
    
    const totalTrainingHours = trainers?.reduce((sum, trainer) => 
      sum + (trainer.total_training_hours || 0), 0) || 0;
    
    const averageRating = trainers?.length > 0 
      ? trainers.reduce((sum, trainer) => sum + (trainer.rating || 0), 0) / trainers.length 
      : 0;

    return {
      totalRequests,
      approvedRequests,
      rejectedRequests,
      pendingRequests,
      totalTrainers,
      activeTrainers,
      totalTrainingHours,
      averageRating: Math.round(averageRating * 100) / 100,
    };
  }

  /**
   * Get requests breakdown by status
   */
  private async getRequestsByStatus(filters: AnalyticsFilters) {
    let query = supabase
      .from(TABLES.TRAINING_REQUESTS)
      .select('status');

    // Apply filters
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
    if (filters.province) query = query.eq('province', filters.province);

    const { data: requests, error } = await query;
    if (error) throw error;

    const statusCounts: Record<string, number> = {};
    const total = requests?.length || 0;

    requests?.forEach(request => {
      statusCounts[request.status] = (statusCounts[request.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status as TrainingStatus,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  /**
   * Get requests breakdown by province
   */
  private async getRequestsByProvince(filters: AnalyticsFilters) {
    let query = supabase
      .from(TABLES.TRAINING_REQUESTS)
      .select('province');

    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

    const { data: requests, error } = await query;
    if (error) throw error;

    const provinceCounts: Record<string, number> = {};
    const total = requests?.length || 0;

    requests?.forEach(request => {
      provinceCounts[request.province] = (provinceCounts[request.province] || 0) + 1;
    });

    return Object.entries(provinceCounts).map(([province, count]) => ({
      province,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  /**
   * Get requests breakdown by specialization
   */
  private async getRequestsBySpecialization(filters: AnalyticsFilters) {
    let query = supabase
      .from(TABLES.TRAINING_REQUESTS)
      .select('specialization');

    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
    if (filters.province) query = query.eq('province', filters.province);

    const { data: requests, error } = await query;
    if (error) throw error;

    const specializationCounts: Record<string, number> = {};
    const total = requests?.length || 0;

    requests?.forEach(request => {
      specializationCounts[request.specialization] = (specializationCounts[request.specialization] || 0) + 1;
    });

    return Object.entries(specializationCounts).map(([specialization, count]) => ({
      specialization,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  /**
   * Get trainer performance data
   */
  private async getTrainerPerformance(filters: AnalyticsFilters) {
    // First get trainers
    const { data: trainers, error: trainersError } = await supabase
      .from(TABLES.USERS)
      .select('id, full_name, rating, total_training_hours')
      .eq('role', UserRole.TRAINER)
      .eq('is_active', true);

    if (trainersError) throw trainersError;
    if (!trainers || trainers.length === 0) return [];

    // Then get their statistics separately
    const trainerIds = trainers.map(t => t.id);
    const { data: stats, error: statsError } = await supabase
      .from('trainer_statistics')
      .select('trainer_id, total_trainings, completion_rate')
      .in('trainer_id', trainerIds);

    if (statsError) {
      console.warn('Failed to fetch trainer statistics:', statsError);
      // Continue without stats
    }

    return trainers.map(trainer => {
      const trainerStats = stats?.find(s => s.trainer_id === trainer.id);
      return {
        trainerId: trainer.id,
        trainerName: trainer.full_name,
        totalTrainings: trainerStats?.total_trainings || 0,
        averageRating: trainer.rating || 0,
        totalHours: trainer.total_training_hours || 0,
        completionRate: trainerStats?.completion_rate || 0,
      };
    });
  }

  /**
   * Get monthly trends data
   */
  private async getMonthlyTrends(filters: AnalyticsFilters) {
    // This would typically use a more complex query with date functions
    // For now, we'll return mock data structure
    const months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      months.push({
        month: monthName,
        requests: Math.floor(Math.random() * 50) + 10,
        completedTrainings: Math.floor(Math.random() * 30) + 5,
        averageRating: Math.round((Math.random() * 2 + 3) * 100) / 100,
      });
    }

    return months;
  }

  /**
   * Get top performers
   */
  private async getTopPerformers(filters: AnalyticsFilters) {
    // Get top trainers
    const { data: topTrainers, error: trainersError } = await supabase
      .from(TABLES.USERS)
      .select('id, full_name, rating, total_training_hours')
      .eq('role', UserRole.TRAINER)
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .limit(5);

    if (trainersError) throw trainersError;

    // Mock province performance data
    const topProvinces = [
      { province: 'cairo', completionRate: 95, averageRating: 4.8 },
      { province: 'alexandria', completionRate: 92, averageRating: 4.6 },
      { province: 'giza', completionRate: 88, averageRating: 4.5 },
    ];

    return {
      trainers: topTrainers?.map(trainer => ({
        id: trainer.id,
        name: trainer.full_name,
        rating: trainer.rating || 0,
        totalHours: trainer.total_training_hours || 0,
      })) || [],
      provinces: topProvinces,
    };
  }

  /**
   * Get real-time statistics
   */
  async getRealTimeStats() {
    try {
      const { data: activeTrainings, error } = await supabase
        .from(TABLES.CALENDAR_EVENTS)
        .select('*')
        .eq('type', 'training')
        .gte('start_date', new Date().toISOString())
        .lte('start_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      return {
        activeTrainings: activeTrainings?.length || 0,
        upcomingToday: activeTrainings?.filter(event => {
          const eventDate = new Date(event.start_date).toDateString();
          const today = new Date().toDateString();
          return eventDate === today;
        }).length || 0,
      };
    } catch (error) {
      console.error('Real-time stats error:', error);
      return { activeTrainings: 0, upcomingToday: 0 };
    }
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
