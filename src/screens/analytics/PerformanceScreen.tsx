import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { analyticsService } from '../../services/analyticsService';
import { performanceManager } from '../../utils/performance';
import { cacheService } from '../../services/cacheService';
import { offlineService } from '../../services/offlineService';
import { isRTL, getTextAlign } from '../../i18n';

interface PerformanceStats {
  appPerformance: {
    memoryUsage: number;
    memoryWarnings: number;
    activeOperations: number;
  };
  cacheStats: {
    totalItems: number;
    totalSize: number;
    oldestItem: number;
    newestItem: number;
  };
  offlineStats: {
    queueSize: number;
    oldestAction: number;
    newestAction: number;
    actionTypes: Record<string, number>;
  };
  networkStats: {
    isOnline: boolean;
    connectionType: string;
    lastSyncTime: number;
  };
}

const PerformanceScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<PerformanceStats>({
    appPerformance: {
      memoryUsage: 0,
      memoryWarnings: 0,
      activeOperations: 0,
    },
    cacheStats: {
      totalItems: 0,
      totalSize: 0,
      oldestItem: 0,
      newestItem: 0,
    },
    offlineStats: {
      queueSize: 0,
      oldestAction: 0,
      newestAction: 0,
      actionTypes: {},
    },
    networkStats: {
      isOnline: true,
      connectionType: 'unknown',
      lastSyncTime: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isRtl = isRTL(i18n.language);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Get performance metrics
      const appMetrics = performanceManager.getMetrics();
      
      // Get cache statistics
      const cacheStats = await cacheService.getStats();
      
      // Get offline statistics
      const offlineStats = await offlineService.getOfflineStats();
      
      // Get network state
      const networkState = offlineService.getNetworkState();

      setStats({
        appPerformance: {
          memoryUsage: 0, // Would need native module to get actual memory usage
          memoryWarnings: appMetrics.memoryWarnings,
          activeOperations: appMetrics.activeOperations,
        },
        cacheStats,
        offlineStats,
        networkStats: {
          isOnline: networkState.isConnected,
          connectionType: networkState.type,
          lastSyncTime: Date.now(), // Mock value
        },
      });
    } catch (error) {
      console.error('Error loading performance stats:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return 'غير متاح';
    const date = new Date(timestamp);
    return date.toLocaleString(isRtl ? 'ar-SA' : 'en-US');
  };

  const getStatusColor = (isGood: boolean): string => {
    return isGood ? '#28a745' : '#dc3545';
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    subtitle?: string,
    icon?: string,
    color?: string
  ) => (
    <View style={[styles.statCard, { width: (screenWidth - 48) / 2 }]}>
      <View style={[styles.statHeader, isRtl && styles.statHeaderRtl]}>
        {icon && (
          <Ionicons 
            name={icon as any} 
            size={24} 
            color={color || '#667eea'} 
          />
        )}
        <Text style={[styles.statValue, { color: color || '#333' }]}>
          {value}
        </Text>
      </View>
      <Text style={[styles.statTitle, { textAlign: getTextAlign(i18n.language) }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
        {title}
      </Text>
      <View style={[styles.statsGrid, isRtl && styles.statsGridRtl]}>
        {children}
      </View>
    </View>
  );

  const renderActionButton = (
    title: string,
    subtitle: string,
    icon: string,
    onPress: () => void,
    color: string = '#667eea'
  ) => (
    <TouchableOpacity
      style={[styles.actionButton, { borderColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={24} color={color} />
      <View style={styles.actionInfo}>
        <Text style={[styles.actionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {title}
        </Text>
        <Text style={[styles.actionSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons 
        name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"} 
        size={20} 
        color="#ccc" 
      />
    </TouchableOpacity>
  );

  const handleClearCache = async () => {
    try {
      await cacheService.clear();
      await loadStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const handleOptimizeStorage = async () => {
    try {
      performanceManager.clearCache();
      await loadStats();
    } catch (error) {
      console.error('Error optimizing storage:', error);
    }
  };

  const handleSyncOfflineData = async () => {
    try {
      await offlineService.syncOfflineActions();
      await loadStats();
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { textAlign: getTextAlign(i18n.language) }]}>
          جاري تحميل الإحصائيات...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* App Performance */}
      {renderSection(
        '📱 أداء التطبيق',
        <>
          {renderStatCard(
            'تحذيرات الذاكرة',
            stats.appPerformance.memoryWarnings,
            undefined,
            'warning-outline',
            getStatusColor(stats.appPerformance.memoryWarnings === 0)
          )}
          {renderStatCard(
            'العمليات النشطة',
            stats.appPerformance.activeOperations,
            undefined,
            'pulse-outline',
            getStatusColor(stats.appPerformance.activeOperations < 5)
          )}
        </>
      )}

      {/* Cache Statistics */}
      {renderSection(
        '💾 إحصائيات التخزين المؤقت',
        <>
          {renderStatCard(
            'العناصر المحفوظة',
            stats.cacheStats.totalItems,
            undefined,
            'archive-outline'
          )}
          {renderStatCard(
            'حجم البيانات',
            formatBytes(stats.cacheStats.totalSize),
            undefined,
            'folder-outline'
          )}
        </>
      )}

      {/* Offline Statistics */}
      {renderSection(
        '📴 إحصائيات العمل بدون إنترنت',
        <>
          {renderStatCard(
            'الإجراءات المعلقة',
            stats.offlineStats.queueSize,
            undefined,
            'cloud-upload-outline',
            getStatusColor(stats.offlineStats.queueSize === 0)
          )}
          {renderStatCard(
            'أقدم إجراء',
            stats.offlineStats.oldestAction > 0 
              ? formatTime(stats.offlineStats.oldestAction).split(' ')[0]
              : 'لا يوجد',
            undefined,
            'time-outline'
          )}
        </>
      )}

      {/* Network Status */}
      {renderSection(
        '🌐 حالة الشبكة',
        <>
          {renderStatCard(
            'حالة الاتصال',
            stats.networkStats.isOnline ? 'متصل' : 'غير متصل',
            stats.networkStats.connectionType,
            'wifi-outline',
            getStatusColor(stats.networkStats.isOnline)
          )}
          {renderStatCard(
            'آخر مزامنة',
            formatTime(stats.networkStats.lastSyncTime).split(' ')[1] || 'غير متاح',
            undefined,
            'sync-outline'
          )}
        </>
      )}

      {/* Action Types Breakdown */}
      {stats.offlineStats.queueSize > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
            📊 تفصيل الإجراءات المعلقة
          </Text>
          {Object.entries(stats.offlineStats.actionTypes).map(([type, count]) => (
            <View key={type} style={[styles.actionTypeItem, isRtl && styles.actionTypeItemRtl]}>
              <Text style={[styles.actionTypeName, { textAlign: getTextAlign(i18n.language) }]}>
                {type}
              </Text>
              <Text style={styles.actionTypeCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Optimization Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          🔧 إجراءات التحسين
        </Text>

        {renderActionButton(
          'مسح التخزين المؤقت',
          'حذف البيانات المؤقتة لتوفير مساحة',
          'trash-outline',
          handleClearCache,
          '#dc3545'
        )}

        {renderActionButton(
          'تحسين التخزين',
          'تنظيف الملفات المؤقتة وتحسين الأداء',
          'build-outline',
          handleOptimizeStorage,
          '#ffc107'
        )}

        {stats.offlineStats.queueSize > 0 && renderActionButton(
          'مزامنة البيانات',
          `مزامنة ${stats.offlineStats.queueSize} إجراء معلق`,
          'cloud-upload-outline',
          handleSyncOfflineData,
          '#28a745'
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#ffffff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsGridRtl: {
    flexDirection: 'row-reverse',
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  actionTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionTypeItemRtl: {
    flexDirection: 'row-reverse',
  },
  actionTypeName: {
    fontSize: 14,
    color: '#333',
  },
  actionTypeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  actionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default PerformanceScreen;
