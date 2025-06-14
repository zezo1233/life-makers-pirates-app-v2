import { supabase, TABLES } from '../config/supabase';
import { UserRole, TrainingRequest } from '../types';

interface TrainerRecommendation {
  trainerId: string;
  trainerName: string;
  score: number;
  reasons: string[];
  location: string;
  totalHours: number;
  rating: number;
  distance: number;
}

interface FeedbackAnalysis {
  originalText: string;
  suggestedRating: number;
  confidence: number;
  reasoning: string;
  keywords: string[];
}

export class AIChatService {
  private static instance: AIChatService;
  
  // Training packages knowledge base
  private trainingPackages = {
    communication: {
      name: 'التواصل الفعال',
      topics: [
        'مهارات الاستماع الفعال',
        'التواصل غير اللفظي',
        'إدارة الحوار والنقاش',
        'التواصل في بيئة العمل',
        'حل النزاعات والخلافات'
      ],
      duration: '8-16 ساعة',
      objectives: 'تطوير مهارات التواصل الشخصي والمهني'
    },
    presentation: {
      name: 'العرض والتقديم',
      topics: [
        'تصميم العروض التقديمية',
        'مهارات الإلقاء والخطابة',
        'استخدام الوسائل البصرية',
        'إدارة القلق والتوتر',
        'التفاعل مع الجمهور'
      ],
      duration: '12-20 ساعة',
      objectives: 'إتقان فنون العرض والتقديم المؤثر'
    },
    mindset: {
      name: 'العقلية',
      topics: [
        'التفكير الإيجابي',
        'إدارة الضغوط النفسية',
        'بناء الثقة بالنفس',
        'تطوير الذات',
        'القيادة الذاتية'
      ],
      duration: '10-18 ساعة',
      objectives: 'تطوير العقلية الإيجابية والنمو الشخصي'
    },
    teamwork: {
      name: 'العمل الجماعي',
      topics: [
        'ديناميكية الفريق',
        'أدوار أعضاء الفريق',
        'حل المشكلات الجماعية',
        'اتخاذ القرارات الجماعية',
        'بناء روح الفريق'
      ],
      duration: '8-14 ساعة',
      objectives: 'تعزيز مهارات العمل الجماعي والتعاون'
    }
  };

  static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  // AI Chat for training packages
  async processTrainingQuery(query: string, userRole: UserRole): Promise<string> {
    const lowerQuery = query.toLowerCase();
    
    // Check if user has access
    if (!this.hasAIAccess(userRole)) {
      return 'عذراً، هذه الخدمة متاحة فقط لمسؤول المشروع والمتابعين والمدربين.';
    }

    // Analyze query intent
    const intent = this.analyzeQueryIntent(lowerQuery);
    
    switch (intent.type) {
      case 'package_info':
        return this.getPackageInfo(intent.specialization);
      case 'training_tips':
        return this.getTrainingTips(intent.specialization);
      case 'duration_info':
        return this.getDurationInfo(intent.specialization);
      case 'objectives':
        return this.getObjectives(intent.specialization);
      case 'general_help':
        return this.getGeneralHelp();
      default:
        return this.getDefaultResponse(query);
    }
  }

  // Trainer recommendation for supervisors
  async recommendTrainers(requestId: string, supervisorId: string): Promise<TrainerRecommendation[]> {
    try {
      // Get training request details
      const { data: request } = await supabase
        .from(TABLES.TRAINING_REQUESTS)
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) {
        throw new Error('Training request not found');
      }

      // Get approved trainers for this request
      const { data: applications } = await supabase
        .from('trainer_applications')
        .select(`
          trainer_id,
          trainer:trainer_id(
            id, full_name, province, rating, total_training_hours,
            specialization
          )
        `)
        .eq('training_request_id', requestId)
        .eq('status', 'pending');

      if (!applications || applications.length === 0) {
        return [];
      }

      const recommendations: TrainerRecommendation[] = [];

      for (const app of applications) {
        const trainer = app.trainer;
        if (!trainer) continue;

        const score = this.calculateTrainerScore(
          trainer,
          request.province,
          request.specialization
        );

        const reasons = this.generateRecommendationReasons(trainer, request);

        recommendations.push({
          trainerId: trainer.id,
          trainerName: trainer.full_name,
          score,
          reasons,
          location: trainer.province,
          totalHours: trainer.total_training_hours || 0,
          rating: trainer.rating || 0,
          distance: this.calculateDistance(trainer.province, request.province)
        });
      }

      // Sort by score (highest first)
      return recommendations.sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('Error recommending trainers:', error);
      return [];
    }
  }

  // Analyze feedback and convert to star rating
  async analyzeFeedback(feedbackText: string): Promise<FeedbackAnalysis> {
    const analysis = this.performSentimentAnalysis(feedbackText);
    
    return {
      originalText: feedbackText,
      suggestedRating: analysis.rating,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      keywords: analysis.keywords
    };
  }

  // Private helper methods
  private hasAIAccess(userRole: UserRole): boolean {
    return [
      UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
      UserRole.PROGRAM_SUPERVISOR,
      UserRole.TRAINER
    ].includes(userRole);
  }

  private analyzeQueryIntent(query: string): { type: string; specialization?: string } {
    const specializations = Object.keys(this.trainingPackages);
    
    // Check for specialization mentions
    let specialization: string | undefined;
    for (const spec of specializations) {
      const packageName = this.trainingPackages[spec as keyof typeof this.trainingPackages].name;
      if (query.includes(spec) || query.includes(packageName.toLowerCase())) {
        specialization = spec;
        break;
      }
    }

    // Determine intent type
    if (query.includes('معلومات') || query.includes('ما هو') || query.includes('عن')) {
      return { type: 'package_info', specialization };
    }
    
    if (query.includes('نصائح') || query.includes('كيف') || query.includes('طريقة')) {
      return { type: 'training_tips', specialization };
    }
    
    if (query.includes('مدة') || query.includes('ساعات') || query.includes('وقت')) {
      return { type: 'duration_info', specialization };
    }
    
    if (query.includes('أهداف') || query.includes('غرض') || query.includes('فائدة')) {
      return { type: 'objectives', specialization };
    }
    
    if (query.includes('مساعدة') || query.includes('help')) {
      return { type: 'general_help' };
    }

    return { type: 'general', specialization };
  }

  private getPackageInfo(specialization?: string): string {
    if (!specialization) {
      return `الحقائب التدريبية المتاحة:
      
🗣️ **التواصل الفعال**: ${this.trainingPackages.communication.objectives}
📊 **العرض والتقديم**: ${this.trainingPackages.presentation.objectives}  
🧠 **العقلية**: ${this.trainingPackages.mindset.objectives}
👥 **العمل الجماعي**: ${this.trainingPackages.teamwork.objectives}

اسأل عن أي حقيبة تدريبية محددة للحصول على تفاصيل أكثر!`;
    }

    const pkg = this.trainingPackages[specialization as keyof typeof this.trainingPackages];
    if (!pkg) {
      return 'عذراً، لم أجد معلومات عن هذه الحقيبة التدريبية.';
    }

    return `📚 **${pkg.name}**

**الموضوعات الرئيسية:**
${pkg.topics.map(topic => `• ${topic}`).join('\n')}

**المدة المقترحة:** ${pkg.duration}
**الهدف:** ${pkg.objectives}`;
  }

  private getTrainingTips(specialization?: string): string {
    const tips = {
      communication: [
        'ابدأ بكسر الجليد وخلق بيئة مريحة',
        'استخدم أمثلة من الواقع العملي',
        'شجع المشاركة والتفاعل',
        'مارس تمارين الاستماع الفعال'
      ],
      presentation: [
        'حضر المحتوى مسبقاً واختبر التقنيات',
        'ابدأ بقصة أو سؤال جذاب',
        'استخدم الحركة والإيماءات بطريقة طبيعية',
        'اترك وقتاً للأسئلة والنقاش'
      ],
      mindset: [
        'ركز على التطبيق العملي للمفاهيم',
        'استخدم قصص النجاح الملهمة',
        'شجع المشاركين على وضع أهداف شخصية',
        'اربط المحتوى بالحياة اليومية'
      ],
      teamwork: [
        'قسم المشاركين لمجموعات صغيرة',
        'استخدم الألعاب التفاعلية',
        'شجع على تبادل الخبرات',
        'ركز على حل المشكلات الجماعية'
      ]
    };

    if (!specialization) {
      return 'حدد التخصص للحصول على نصائح تدريبية مخصصة!';
    }

    const specTips = tips[specialization as keyof typeof tips];
    if (!specTips) {
      return 'عذراً، لا توجد نصائح متاحة لهذا التخصص حالياً.';
    }

    return `💡 **نصائح تدريبية لـ ${this.trainingPackages[specialization as keyof typeof this.trainingPackages].name}:**

${specTips.map(tip => `• ${tip}`).join('\n')}`;
  }

  private getDurationInfo(specialization?: string): string {
    if (!specialization) {
      return `⏰ **المدد التدريبية المقترحة:**

• التواصل الفعال: ${this.trainingPackages.communication.duration}
• العرض والتقديم: ${this.trainingPackages.presentation.duration}
• العقلية: ${this.trainingPackages.mindset.duration}
• العمل الجماعي: ${this.trainingPackages.teamwork.duration}`;
    }

    const pkg = this.trainingPackages[specialization as keyof typeof this.trainingPackages];
    return pkg ? `⏰ المدة المقترحة لـ **${pkg.name}**: ${pkg.duration}` : 'معلومات المدة غير متاحة.';
  }

  private getObjectives(specialization?: string): string {
    if (!specialization) {
      return 'حدد التخصص للحصول على الأهداف التفصيلية!';
    }

    const pkg = this.trainingPackages[specialization as keyof typeof this.trainingPackages];
    return pkg ? `🎯 **هدف ${pkg.name}:** ${pkg.objectives}` : 'الأهداف غير متاحة لهذا التخصص.';
  }

  private getGeneralHelp(): string {
    return `🤖 **مساعد الحقائب التدريبية**

يمكنني مساعدتك في:
• معلومات عن الحقائب التدريبية
• نصائح للتدريب الفعال
• الأهداف والمدد التدريبية
• ترشيح أفضل المدربين (للمتابعين)

**أمثلة على الأسئلة:**
- "أخبرني عن حقيبة التواصل الفعال"
- "نصائح لتدريب العرض والتقديم"
- "كم المدة المطلوبة للعمل الجماعي؟"`;
  }

  private getDefaultResponse(query: string): string {
    return `شكراً لسؤالك: "${query}"

🤖 أنا مساعد الحقائب التدريبية، يمكنني مساعدتك في:
• معلومات الحقائب التدريبية
• نصائح التدريب
• ترشيح المدربين

جرب أن تسأل عن حقيبة تدريبية محددة أو اطلب نصائح تدريبية!`;
  }

  private calculateTrainerScore(trainer: any, requestProvince: string, specialization: string): number {
    let score = 0;

    // Location score (40% weight)
    const distance = this.calculateDistance(trainer.province, requestProvince);
    const locationScore = Math.max(0, 100 - (distance * 10)); // Closer = higher score
    score += locationScore * 0.4;

    // Experience score (30% weight)
    const hours = trainer.total_training_hours || 0;
    const experienceScore = Math.min(100, hours / 10); // 1000 hours = 100 points
    score += experienceScore * 0.3;

    // Rating score (30% weight)
    const rating = trainer.rating || 0;
    const ratingScore = (rating / 5) * 100; // Convert 5-star to 100-point scale
    score += ratingScore * 0.3;

    return Math.round(score);
  }

  private calculateDistance(province1: string, province2: string): number {
    // Simplified distance calculation (in practice, use real coordinates)
    if (province1 === province2) return 0;
    
    // Mock distances between Egyptian governorates (0-10 scale)
    const distances: Record<string, Record<string, number>> = {
      'القاهرة': { 'الجيزة': 1, 'الإسكندرية': 3, 'أسوان': 8 },
      'الجيزة': { 'القاهرة': 1, 'الإسكندرية': 3, 'أسوان': 8 },
      'الإسكندرية': { 'القاهرة': 3, 'الجيزة': 3, 'أسوان': 9 },
      'أسوان': { 'القاهرة': 8, 'الجيزة': 8, 'الإسكندرية': 9 }
    };

    return distances[province1]?.[province2] || 5; // Default medium distance
  }

  private generateRecommendationReasons(trainer: any, request: any): string[] {
    const reasons: string[] = [];
    
    const distance = this.calculateDistance(trainer.province, request.province);
    if (distance <= 2) {
      reasons.push('قريب جغرافياً من موقع التدريب');
    }
    
    if (trainer.total_training_hours > 500) {
      reasons.push('خبرة تدريبية واسعة');
    }
    
    if (trainer.rating >= 4) {
      reasons.push('تقييم عالي من المتدربين السابقين');
    }
    
    if (trainer.rating >= 4.5) {
      reasons.push('تقييم ممتاز ومتميز');
    }

    return reasons.length > 0 ? reasons : ['مدرب مؤهل للتدريب'];
  }

  private performSentimentAnalysis(text: string): {
    rating: number;
    confidence: number;
    reasoning: string;
    keywords: string[];
  } {
    const positiveWords = ['ممتاز', 'رائع', 'مفيد', 'جيد', 'مميز', 'احترافي', 'متقن', 'واضح', 'مبدع'];
    const negativeWords = ['سيء', 'ضعيف', 'مملل', 'غير مفيد', 'سطحي', 'مشتت', 'غير واضح'];
    const neutralWords = ['عادي', 'مقبول', 'متوسط'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const foundKeywords: string[] = [];

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) {
        positiveCount++;
        foundKeywords.push(word);
      } else if (negativeWords.some(nw => word.includes(nw))) {
        negativeCount++;
        foundKeywords.push(word);
      } else if (neutralWords.some(neu => word.includes(neu))) {
        neutralCount++;
        foundKeywords.push(word);
      }
    });

    // Calculate rating (1-5 stars)
    let rating = 3; // Default neutral
    if (positiveCount > negativeCount) {
      rating = Math.min(5, 3 + (positiveCount - negativeCount));
    } else if (negativeCount > positiveCount) {
      rating = Math.max(1, 3 - (negativeCount - positiveCount));
    }

    // Calculate confidence
    const totalSentimentWords = positiveCount + negativeCount + neutralCount;
    const confidence = Math.min(100, (totalSentimentWords / words.length) * 100 * 2);

    // Generate reasoning
    let reasoning = '';
    if (positiveCount > negativeCount) {
      reasoning = `تحليل إيجابي: وجدت ${positiveCount} كلمة إيجابية مقابل ${negativeCount} سلبية`;
    } else if (negativeCount > positiveCount) {
      reasoning = `تحليل سلبي: وجدت ${negativeCount} كلمة سلبية مقابل ${positiveCount} إيجابية`;
    } else {
      reasoning = 'تحليل متوازن: عدد متساوي من الكلمات الإيجابية والسلبية';
    }

    return {
      rating,
      confidence: Math.round(confidence),
      reasoning,
      keywords: foundKeywords
    };
  }
}

export const aiChatService = AIChatService.getInstance();
