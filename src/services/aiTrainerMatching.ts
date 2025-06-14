import { supabase, TABLES } from '../config/supabase';
import { User, TrainingRequest, UserRole } from '../types';

interface TrainerScore {
  trainerId: string;
  trainer: User;
  score: number;
  factors: {
    locationMatch: number;
    specializationMatch: number;
    availabilityMatch: number;
    ratingScore: number;
    experienceScore: number;
    workloadScore: number;
  };
  reasoning: string[];
}

interface MatchingCriteria {
  province: string;
  specialization: string;
  requestedDate: string;
  duration: number;
  priority: 'low' | 'medium' | 'high';
  maxTrainers?: number;
}

export class AITrainerMatchingService {
  private static instance: AITrainerMatchingService;

  public static getInstance(): AITrainerMatchingService {
    if (!AITrainerMatchingService.instance) {
      AITrainerMatchingService.instance = new AITrainerMatchingService();
    }
    return AITrainerMatchingService.instance;
  }

  /**
   * Find the best matching trainers for a training request
   */
  async findBestTrainers(
    request: TrainingRequest,
    maxResults: number = 5
  ): Promise<TrainerScore[]> {
    try {
      const criteria: MatchingCriteria = {
        province: request.province,
        specialization: request.specialization,
        requestedDate: request.requested_date,
        duration: 2, // Default 2 hours
        priority: this.determinePriority(request),
        maxTrainers: maxResults,
      };

      // Get all active trainers
      const trainers = await this.fetchAvailableTrainers(criteria);
      
      // Score each trainer
      const scoredTrainers = await Promise.all(
        trainers.map(trainer => this.scoreTrainer(trainer, criteria))
      );

      // Sort by score and return top results
      return scoredTrainers
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

    } catch (error) {
      console.error('AI Trainer Matching Error:', error);
      throw new Error('Failed to find matching trainers');
    }
  }

  /**
   * Fetch available trainers based on criteria
   */
  private async fetchAvailableTrainers(criteria: MatchingCriteria): Promise<User[]> {
    // First get trainers
    const { data: trainers, error: trainersError } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('role', UserRole.TRAINER)
      .eq('is_active', true);

    if (trainersError) throw trainersError;
    if (!trainers || trainers.length === 0) return [];

    // Then get their statistics separately
    const trainerIds = trainers.map(t => t.id);
    const { data: stats, error: statsError } = await supabase
      .from('trainer_statistics')
      .select('*')
      .in('trainer_id', trainerIds);

    if (statsError) {
      console.warn('Failed to fetch trainer statistics:', statsError);
      // Continue without stats
      return trainers;
    }

    // Merge stats into trainer objects
    const trainersWithStats = trainers.map(trainer => {
      const trainerStats = stats?.find(s => s.trainer_id === trainer.id);
      return {
        ...trainer,
        trainer_stats: trainerStats || null
      };
    });

    return trainersWithStats;
  }

  /**
   * Score a trainer based on multiple factors
   */
  private async scoreTrainer(
    trainer: User,
    criteria: MatchingCriteria
  ): Promise<TrainerScore> {
    const factors = {
      locationMatch: this.calculateLocationScore(trainer.province, criteria.province),
      specializationMatch: this.calculateSpecializationScore(trainer.specialization, criteria.specialization),
      availabilityMatch: await this.calculateAvailabilityScore(trainer.id, criteria.requestedDate),
      ratingScore: this.calculateRatingScore(trainer),
      experienceScore: this.calculateExperienceScore(trainer),
      workloadScore: await this.calculateWorkloadScore(trainer.id),
    };

    // Weighted scoring
    const weights = {
      locationMatch: 0.25,
      specializationMatch: 0.30,
      availabilityMatch: 0.20,
      ratingScore: 0.15,
      experienceScore: 0.05,
      workloadScore: 0.05,
    };

    const score = Object.entries(factors).reduce(
      (total, [key, value]) => total + value * weights[key as keyof typeof weights],
      0
    );

    const reasoning = this.generateReasoning(factors, trainer);

    return {
      trainerId: trainer.id,
      trainer,
      score: Math.round(score * 100) / 100,
      factors,
      reasoning,
    };
  }

  /**
   * Calculate location matching score
   */
  private calculateLocationScore(trainerProvince: string, requestProvince: string): number {
    // Map English frontend values to Arabic database values
    const provinceMapping: Record<string, string> = {
      'cairo': 'القاهرة',
      'giza': 'الجيزة',
      'alexandria': 'الإسكندرية',
      'dakahlia': 'الدقهلية',
      'red_sea': 'البحر الأحمر',
      'beheira': 'البحيرة',
      'fayoum': 'الفيّوم',
      'gharbiya': 'الغربية',
      'ismailia': 'الإسماعيلية',
      'menofia': 'المنوفية',
      'minya': 'المنيا',
      'qalyubia': 'القليوبيّة',
      'new_valley': 'الوادي الجديد',
      'suez': 'السويس',
      'asyut': 'أسيوط',
      'qena': 'قنا',
      'damietta': 'دمياط',
      'aswan': 'أسوان',
      'sharqia': 'الشرقيّة',
      'south_sinai': 'جنوب سيناء',
      'kafr_el_sheikh': 'كفر الشيخ',
      'matrouh': 'مطروح',
      'luxor': 'الأقصر',
      'north_sinai': 'شمال سيناء',
      'beni_suef': 'بني سويف',
      'sohag': 'سوهاج',
      'port_said': 'بورسعيد'
    };

    const arabicRequestProvince = provinceMapping[requestProvince] || requestProvince;

    if (trainerProvince === arabicRequestProvince) return 1.0;

    // Adjacent provinces get partial score (using English keys for simplicity)
    const adjacentProvinces: Record<string, string[]> = {
      'cairo': ['giza', 'qalyubia'],
      'giza': ['cairo', 'fayoum', 'beni_suef'],
      'alexandria': ['beheira', 'matrouh'],
      'dakahlia': ['sharqia', 'damietta'],
      'beheira': ['alexandria', 'gharbiya', 'menofia'],
      'sharqia': ['dakahlia', 'ismailia', 'suez'],
      'gharbiya': ['beheira', 'menofia', 'kafr_el_sheikh'],
      'qalyubia': ['cairo', 'menofia', 'sharqia'],
      'ismailia': ['sharqia', 'suez', 'north_sinai'],
      'suez': ['sharqia', 'ismailia', 'red_sea'],
      'beni_suef': ['giza', 'fayoum', 'minya'],
      'fayoum': ['giza', 'beni_suef'],
      'minya': ['beni_suef', 'asyut'],
    };

    // Check if trainer province matches any adjacent provinces
    const adjacentList = adjacentProvinces[requestProvince] || [];
    for (const adjacent of adjacentList) {
      if (trainerProvince === provinceMapping[adjacent]) {
        return 0.6;
      }
    }

    return 0.2; // Different region
  }

  /**
   * Calculate specialization matching score
   */
  private calculateSpecializationScore(trainerSpec: string | string[], requestSpec: string): number {
    // Map English frontend values to Arabic database values
    const specMapping: Record<string, string> = {
      'communication': 'التواصل الفعال',
      'presentation': 'العرض والتقديم',
      'mindset': 'العقلية',
      'teamwork': 'العمل الجماعي'
    };

    const arabicRequestSpec = specMapping[requestSpec] || requestSpec;

    // Handle trainer specialization (could be string or array)
    let trainerSpecs: string[] = [];
    if (Array.isArray(trainerSpec)) {
      trainerSpecs = trainerSpec;
    } else if (typeof trainerSpec === 'string') {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(trainerSpec);
        trainerSpecs = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        trainerSpecs = [trainerSpec];
      }
    }

    // Check for exact match
    if (trainerSpecs.includes(arabicRequestSpec)) {
      return 1.0;
    }

    // Related specializations get partial score
    const relatedSpecs: Record<string, string[]> = {
      'التواصل الفعال': ['العرض والتقديم', 'العقلية'],
      'العرض والتقديم': ['التواصل الفعال', 'العقلية'],
      'العقلية': ['التواصل الفعال', 'العمل الجماعي'],
      'العمل الجماعي': ['العقلية', 'التواصل الفعال'],
    };

    if (relatedSpecs[arabicRequestSpec]?.some(related => trainerSpecs.includes(related))) {
      return 0.7;
    }

    return 0.3; // Different specialization
  }

  /**
   * Calculate availability score
   */
  private async calculateAvailabilityScore(trainerId: string, requestedDate: string): Promise<number> {
    try {
      // Check trainer availability
      const { data: availability, error } = await supabase
        .from(TABLES.TRAINER_AVAILABILITY)
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('date', requestedDate.split('T')[0])
        .single();

      if (error || !availability) return 0.3; // No availability data

      if (availability.is_available) return 1.0;
      return 0.1; // Not available
    } catch {
      return 0.3; // Default score if check fails
    }
  }

  /**
   * Calculate rating score
   */
  private calculateRatingScore(trainer: User): number {
    // Try to get rating from trainer_stats first, then fallback to user record
    const rating = (trainer as any).trainer_stats?.average_rating ||
                  trainer.rating || 0;
    return Math.min(parseFloat(rating.toString()) / 5.0, 1.0);
  }

  /**
   * Calculate experience score
   */
  private calculateExperienceScore(trainer: User): number {
    // Try to get hours from trainer_stats first, then fallback to user record
    const totalHours = (trainer as any).trainer_stats?.total_hours ||
                      trainer.total_training_hours || 0;

    if (totalHours >= 100) return 1.0;
    if (totalHours >= 50) return 0.8;
    if (totalHours >= 20) return 0.6;
    if (totalHours >= 5) return 0.4;
    return 0.2;
  }

  /**
   * Calculate current workload score (lower workload = higher score)
   */
  private async calculateWorkloadScore(trainerId: string): Promise<number> {
    try {
      const currentDate = new Date();
      const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: events, error } = await supabase
        .from(TABLES.CALENDAR_EVENTS)
        .select('*')
        .eq('assigned_trainer_id', trainerId)
        .gte('start_date', currentDate.toISOString())
        .lte('start_date', nextWeek.toISOString());

      if (error) return 0.5; // Default score

      const eventCount = events?.length || 0;
      
      if (eventCount === 0) return 1.0; // No events = high availability
      if (eventCount <= 2) return 0.8;
      if (eventCount <= 4) return 0.6;
      if (eventCount <= 6) return 0.4;
      return 0.2; // Very busy
    } catch {
      return 0.5;
    }
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(factors: TrainerScore['factors'], trainer: User): string[] {
    const reasoning: string[] = [];

    if (factors.locationMatch >= 0.8) {
      reasoning.push(`✅ Located in the same province`);
    } else if (factors.locationMatch >= 0.5) {
      reasoning.push(`📍 Located in nearby province`);
    }

    if (factors.specializationMatch >= 0.8) {
      reasoning.push(`🎯 Perfect specialization match`);
    } else if (factors.specializationMatch >= 0.6) {
      reasoning.push(`🔗 Related specialization`);
    }

    if (factors.availabilityMatch >= 0.8) {
      reasoning.push(`✅ Available on requested date`);
    }

    if (factors.ratingScore >= 0.8) {
      reasoning.push(`⭐ Highly rated trainer (${trainer.rating}/5)`);
    }

    if (factors.experienceScore >= 0.8) {
      reasoning.push(`🏆 Experienced trainer (${trainer.total_training_hours}+ hours)`);
    }

    if (factors.workloadScore >= 0.8) {
      reasoning.push(`⚡ Low current workload`);
    }

    return reasoning;
  }

  /**
   * Determine request priority
   */
  private determinePriority(request: TrainingRequest): 'low' | 'medium' | 'high' {
    const requestDate = new Date(request.requested_date);
    const now = new Date();
    const daysUntilRequest = Math.ceil((requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilRequest <= 3) return 'high';
    if (daysUntilRequest <= 7) return 'medium';
    return 'low';
  }

  /**
   * Get trainer recommendations from applications
   */
  async getTrainerRecommendations(requestId: string): Promise<{
    recommendations: TrainerScore[];
    summary: string;
  }> {
    try {
      // Fetch the training request
      const { data: request, error } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) {
        throw new Error('Training request not found');
      }

      // Get pending applications for this request
      const { data: applications, error: appsError } = await supabase
        .from(TABLES.TRAINER_APPLICATIONS)
        .select(`
          *,
          trainer:trainer_id(*)
        `)
        .eq('training_request_id', requestId)
        .eq('status', 'pending');

      if (appsError) {
        throw appsError;
      }

      if (!applications || applications.length === 0) {
        return { recommendations: [], summary: 'No pending applications found for this request.' };
      }

      // Score only the trainers who applied
      const criteria: MatchingCriteria = {
        province: request.province,
        specialization: request.specialization,
        requestedDate: request.requested_date,
        duration: request.duration_hours || 2,
        priority: this.determinePriority(request),
      };

      const scoredTrainers = await Promise.all(
        applications.map(app => this.scoreTrainer(app.trainer, criteria))
      );

      // Sort by score
      const recommendations = scoredTrainers.sort((a, b) => b.score - a.score);

      const summary = this.generateSummary(recommendations, request);

      return { recommendations, summary };
    } catch (error) {
      console.error('Get recommendations error:', error);
      throw error;
    }
  }

  /**
   * Generate summary of recommendations
   */
  private generateSummary(recommendations: TrainerScore[], request: TrainingRequest): string {
    if (recommendations.length === 0) {
      return 'No suitable trainers found for this request. Consider adjusting the criteria or date.';
    }

    const bestMatch = recommendations[0];
    const avgScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length;

    return `Found ${recommendations.length} suitable trainers. Best match: ${bestMatch.trainer.full_name} (${Math.round(bestMatch.score * 100)}% match). Average compatibility: ${Math.round(avgScore * 100)}%.`;
  }
}

// Export singleton instance
export const aiTrainerMatching = AITrainerMatchingService.getInstance();
