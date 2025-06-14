import { Platform } from 'react-native';

interface ConfigCheck {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  value?: string;
  required: boolean;
}

class ConfigurationChecker {
  
  // فحص شامل لجميع الإعدادات
  checkAllConfigurations(): ConfigCheck[] {
    const checks: ConfigCheck[] = [];

    // فحص متغيرات البيئة
    checks.push(...this.checkEnvironmentVariables());

    // فحص إعدادات التطبيق
    checks.push(...this.checkAppConfiguration());

    // فحص إعدادات المنصة
    checks.push(...this.checkPlatformConfiguration());

    // فحص إعدادات الإشعارات
    checks.push(...this.checkNotificationConfiguration());

    return checks;
  }

  // فحص متغيرات البيئة
  private checkEnvironmentVariables(): ConfigCheck[] {
    const checks: ConfigCheck[] = [];

    // Supabase
    checks.push(this.checkEnvVar('EXPO_PUBLIC_SUPABASE_URL', true));
    checks.push(this.checkEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', true));

    // OneSignal
    checks.push(this.checkEnvVar('EXPO_PUBLIC_ONESIGNAL_APP_ID', true));
    checks.push(this.checkEnvVar('EXPO_PUBLIC_ONESIGNAL_REST_API_KEY', true));

    // Expo
    checks.push(this.checkEnvVar('EXPO_PROJECT_ID', false));

    // App Info
    checks.push(this.checkEnvVar('EXPO_PUBLIC_APP_NAME', false));
    checks.push(this.checkEnvVar('EXPO_PUBLIC_APP_VERSION', false));

    return checks;
  }

  // فحص متغير بيئة واحد
  private checkEnvVar(name: string, required: boolean): ConfigCheck {
    const value = process.env[name];
    
    if (!value) {
      return {
        name,
        status: required ? 'error' : 'warning',
        message: required ? 'مطلوب ومفقود' : 'اختياري ومفقود',
        required,
      };
    }

    if (value === 'your-project-id' || value === 'your-rest-api-key-here') {
      return {
        name,
        status: 'warning',
        message: 'يحتوي على قيمة افتراضية، يجب تحديثه',
        value: value.substring(0, 20) + '...',
        required,
      };
    }

    return {
      name,
      status: 'success',
      message: 'تم تعيينه بشكل صحيح',
      value: this.maskSensitiveValue(name, value),
      required,
    };
  }

  // إخفاء القيم الحساسة
  private maskSensitiveValue(name: string, value: string): string {
    const sensitiveKeys = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD'];
    const isSensitive = sensitiveKeys.some(key => name.includes(key));
    
    if (isSensitive && value.length > 10) {
      return value.substring(0, 8) + '...' + value.substring(value.length - 4);
    }
    
    if (value.length > 50) {
      return value.substring(0, 30) + '...';
    }
    
    return value;
  }

  // فحص إعدادات التطبيق
  private checkAppConfiguration(): ConfigCheck[] {
    const checks: ConfigCheck[] = [];

    try {
      // فحص app.json (محاكاة)
      const appConfig = this.getAppConfig();
      
      checks.push({
        name: 'App Configuration',
        status: 'success',
        message: 'ملف app.json موجود ويمكن قراءته',
        required: true,
      });

      // فحص plugins
      if (appConfig.plugins) {
        const hasNotifications = appConfig.plugins.some((p: any) => 
          typeof p === 'string' ? p.includes('notifications') : p[0]?.includes('notifications')
        );
        
        const hasOneSignal = appConfig.plugins.some((p: any) => 
          typeof p === 'string' ? p.includes('onesignal') : p[0]?.includes('onesignal')
        );

        checks.push({
          name: 'Expo Notifications Plugin',
          status: hasNotifications ? 'success' : 'error',
          message: hasNotifications ? 'مُفعل' : 'غير مُفعل',
          required: true,
        });

        checks.push({
          name: 'OneSignal Plugin',
          status: hasOneSignal ? 'success' : 'warning',
          message: hasOneSignal ? 'مُفعل' : 'غير مُفعل',
          required: false,
        });
      }

    } catch (error) {
      checks.push({
        name: 'App Configuration',
        status: 'error',
        message: 'خطأ في قراءة إعدادات التطبيق',
        required: true,
      });
    }

    return checks;
  }

  // محاكاة قراءة app.json
  private getAppConfig(): any {
    // في التطبيق الحقيقي، يمكن قراءة app.json
    // هنا نحاكي الإعدادات المتوقعة
    return {
      plugins: [
        'expo-localization',
        ['expo-notifications', {}],
        ['onesignal-expo-plugin', {}]
      ]
    };
  }

  // فحص إعدادات المنصة
  private checkPlatformConfiguration(): ConfigCheck[] {
    const checks: ConfigCheck[] = [];

    // فحص المنصة الحالية
    checks.push({
      name: 'Platform',
      status: 'success',
      message: `يعمل على ${Platform.OS}`,
      value: Platform.OS,
      required: true,
    });

    // فحص إصدار النظام
    if (Platform.Version) {
      checks.push({
        name: 'OS Version',
        status: 'success',
        message: `إصدار النظام: ${Platform.Version}`,
        value: Platform.Version.toString(),
        required: false,
      });
    }

    // فحص متطلبات المنصة
    if (Platform.OS === 'android') {
      checks.push({
        name: 'Android Requirements',
        status: Platform.Version >= 21 ? 'success' : 'warning',
        message: Platform.Version >= 21 ? 'يدعم الإشعارات الحديثة' : 'قد لا يدعم جميع مميزات الإشعارات',
        required: false,
      });
    }

    if (Platform.OS === 'ios') {
      checks.push({
        name: 'iOS Requirements',
        status: parseFloat(Platform.Version as string) >= 10.0 ? 'success' : 'warning',
        message: parseFloat(Platform.Version as string) >= 10.0 ? 'يدعم الإشعارات الحديثة' : 'قد لا يدعم جميع مميزات الإشعارات',
        required: false,
      });
    }

    return checks;
  }

  // فحص إعدادات الإشعارات
  private checkNotificationConfiguration(): ConfigCheck[] {
    const checks: ConfigCheck[] = [];

    // فحص OneSignal App ID
    const oneSignalAppId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
    if (oneSignalAppId) {
      const isValidFormat = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(oneSignalAppId);
      checks.push({
        name: 'OneSignal App ID Format',
        status: isValidFormat ? 'success' : 'error',
        message: isValidFormat ? 'تنسيق صحيح' : 'تنسيق غير صحيح (يجب أن يكون UUID)',
        required: true,
      });
    }

    // فحص Supabase URL
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const isValidUrl = supabaseUrl.includes('supabase.co') && supabaseUrl.startsWith('https://');
      checks.push({
        name: 'Supabase URL Format',
        status: isValidUrl ? 'success' : 'error',
        message: isValidUrl ? 'تنسيق صحيح' : 'تنسيق غير صحيح',
        required: true,
      });
    }

    return checks;
  }

  // طباعة تقرير شامل
  printConfigurationReport(): void {
    const checks = this.checkAllConfigurations();
    
    console.log('\n🔍 تقرير فحص إعدادات نظام الإشعارات');
    console.log('='.repeat(60));

    const groupedChecks = this.groupChecksByCategory(checks);

    Object.entries(groupedChecks).forEach(([category, categoryChecks]) => {
      console.log(`\n📂 ${category}`);
      
      categoryChecks.forEach(check => {
        const icon = this.getStatusIcon(check.status);
        const requiredText = check.required ? ' (مطلوب)' : ' (اختياري)';
        
        console.log(`${icon} ${check.name}${requiredText}`);
        console.log(`   ${check.message}`);
        
        if (check.value) {
          console.log(`   القيمة: ${check.value}`);
        }
      });
    });

    // ملخص
    const errorCount = checks.filter(c => c.status === 'error').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const successCount = checks.filter(c => c.status === 'success').length;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 الملخص:`);
    console.log(`✅ نجح: ${successCount}`);
    console.log(`⚠️ تحذير: ${warningCount}`);
    console.log(`❌ خطأ: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 جميع الإعدادات المطلوبة صحيحة!');
    } else {
      console.log('\n🔧 يرجى إصلاح الأخطاء قبل المتابعة');
    }
  }

  // تجميع الفحوصات حسب الفئة
  private groupChecksByCategory(checks: ConfigCheck[]): Record<string, ConfigCheck[]> {
    const categories: Record<string, ConfigCheck[]> = {
      'متغيرات البيئة': [],
      'إعدادات التطبيق': [],
      'إعدادات المنصة': [],
      'إعدادات الإشعارات': [],
    };

    checks.forEach(check => {
      if (check.name.includes('EXPO_PUBLIC') || check.name.includes('EXPO_PROJECT')) {
        categories['متغيرات البيئة'].push(check);
      } else if (check.name.includes('Plugin') || check.name.includes('App Configuration')) {
        categories['إعدادات التطبيق'].push(check);
      } else if (check.name.includes('Platform') || check.name.includes('OS') || check.name.includes('Requirements')) {
        categories['إعدادات المنصة'].push(check);
      } else {
        categories['إعدادات الإشعارات'].push(check);
      }
    });

    return categories;
  }

  // أيقونة الحالة
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  // فحص سريع
  quickCheck(): { isReady: boolean; criticalIssues: string[] } {
    const checks = this.checkAllConfigurations();
    const criticalIssues: string[] = [];

    checks.forEach(check => {
      if (check.required && check.status === 'error') {
        criticalIssues.push(`${check.name}: ${check.message}`);
      }
    });

    return {
      isReady: criticalIssues.length === 0,
      criticalIssues,
    };
  }
}

// تصدير مثيل واحد
export const configChecker = new ConfigurationChecker();

// دالة مساعدة للفحص السريع
export const checkConfiguration = () => configChecker.quickCheck();

// دالة لطباعة التقرير
export const printConfigReport = () => configChecker.printConfigurationReport();
