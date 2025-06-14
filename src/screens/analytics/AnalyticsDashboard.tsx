import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { analyticsService, AnalyticsData } from '../../services/analyticsService';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

const { width } = Dimensions.get('window');

const AnalyticsDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date filters based on selected period
      const now = new Date();
      let dateFrom: string;
      
      switch (selectedPeriod) {
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          break;
        case 'quarter':
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          dateFrom = new Date(now.getFullYear(), quarterStart, 1).toISOString();
          break;
      }

      const data = await analyticsService.getAnalyticsData({
        dateFrom,
        dateTo: now.toISOString(),
      });

      setAnalyticsData(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.loadFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const renderOverviewCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string,
    gradient: string[]
  ) => (
    <View style={styles.overviewCardContainer}>
      <LinearGradient colors={gradient} style={styles.overviewCard}>
        <View style={[styles.overviewCardContent, isRtl && styles.overviewCardContentRtl]}>
          <View style={styles.overviewCardIcon}>
            <Ionicons name={icon as any} size={24} color="#ffffff" />
          </View>
          <View style={styles.overviewCardText}>
            <Text style={[styles.overviewCardValue, { textAlign: getTextAlign(i18n.language) }]}>
              {value}
            </Text>
            <Text style={[styles.overviewCardTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {title}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['week', 'month', 'quarter'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {t(`analytics.${period}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatusChart = () => {
    if (!analyticsData?.requestsByStatus.length) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('analytics.requestsByStatus')}
        </Text>
        {analyticsData.requestsByStatus.map((item, index) => (
          <View key={item.status} style={styles.chartItem}>
            <View style={[styles.chartItemInfo, isRtl && styles.chartItemInfoRtl]}>
              <View style={[styles.chartItemDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={[styles.chartItemLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t(`training.status.${item.status}`)}
              </Text>
            </View>
            <View style={styles.chartItemValue}>
              <Text style={styles.chartItemCount}>{item.count}</Text>
              <Text style={styles.chartItemPercentage}>{item.percentage}%</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTopPerformers = () => {
    if (!analyticsData?.topPerformers.trainers.length) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('analytics.topTrainers')}
        </Text>
        {analyticsData.topPerformers.trainers.slice(0, 5).map((trainer, index) => (
          <View key={trainer.id} style={styles.performerItem}>
            <View style={[styles.performerRank, { backgroundColor: getRankColor(index) }]}>
              <Text style={styles.performerRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.performerInfo}>
              <Text style={[styles.performerName, { textAlign: getTextAlign(i18n.language) }]}>
                {trainer.name}
              </Text>
              <View style={[styles.performerStats, isRtl && styles.performerStatsRtl]}>
                <View style={styles.performerStat}>
                  <Ionicons name="star" size={14} color="#ffc107" />
                  <Text style={styles.performerStatText}>{trainer.rating}/5</Text>
                </View>
                <View style={styles.performerStat}>
                  <Ionicons name="time" size={14} color="#666" />
                  <Text style={styles.performerStatText}>{trainer.totalHours}h</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'draft': '#6c757d',
      'under_review': '#ffc107',
      'dv_approved': '#17a2b8',
      'cc_approved': '#28a745',
      'pm_approved': '#007bff',
      'tr_assigned': '#fd7e14',
      'sv_approved': '#6f42c1',
      'final_approved': '#28a745',
      'rejected': '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  const getRankColor = (index: number): string => {
    const colors = ['#ffd700', '#c0c0c0', '#cd7f32', '#667eea', '#764ba2'];
    return colors[index] || '#667eea';
  };

  // Check if user has access to analytics
  const hasAnalyticsAccess = (): boolean => {
    if (!user) return false;
    return [
      UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
      UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
      UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
      UserRole.PROGRAM_SUPERVISOR,
    ].includes(user.role);
  };

  if (!hasAnalyticsAccess()) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ionicons name="lock-closed-outline" size={60} color="#ccc" />
        <Text style={[styles.accessDeniedText, { textAlign: getTextAlign(i18n.language) }]}>
          {t('analytics.accessDenied')}
        </Text>
      </View>
    );
  }

  if (loading && !analyticsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>{t('analytics.loadingAnalytics')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('analytics.dashboard')}
        </Text>
        <Text style={[styles.headerSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('analytics.insights')}
        </Text>
      </LinearGradient>

      {/* Period Selector */}
      {renderPeriodSelector()}

      {/* Overview Cards */}
      {analyticsData && (
        <View style={styles.overviewContainer}>
          {renderOverviewCard(
            t('analytics.totalRequests'),
            analyticsData.overview.totalRequests,
            'document-text-outline',
            '#667eea',
            ['#667eea', '#764ba2']
          )}
          {renderOverviewCard(
            t('analytics.approvedRequests'),
            analyticsData.overview.approvedRequests,
            'checkmark-circle-outline',
            '#28a745',
            ['#28a745', '#20c997']
          )}
          {renderOverviewCard(
            t('analytics.activeTrainers'),
            analyticsData.overview.activeTrainers,
            'people-outline',
            '#17a2b8',
            ['#17a2b8', '#6f42c1']
          )}
          {renderOverviewCard(
            t('analytics.averageRating'),
            `${analyticsData.overview.averageRating}/5`,
            'star-outline',
            '#ffc107',
            ['#ffc107', '#fd7e14']
          )}
        </View>
      )}

      {/* Charts */}
      {renderStatusChart()}
      {renderTopPerformers()}
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 40,
  },
  accessDeniedText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
  },
  header: {
    padding: 30,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#667eea',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  overviewCardContainer: {
    width: (width - 48) / 2,
    marginBottom: 16,
    marginHorizontal: 8,
  },
  overviewCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  overviewCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewCardContentRtl: {
    flexDirection: 'row-reverse',
  },
  overviewCardIcon: {
    marginRight: 12,
  },
  overviewCardText: {
    flex: 1,
  },
  overviewCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  overviewCardTitle: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chartItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chartItemInfoRtl: {
    flexDirection: 'row-reverse',
  },
  chartItemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  chartItemLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  chartItemValue: {
    alignItems: 'flex-end',
  },
  chartItemCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chartItemPercentage: {
    fontSize: 12,
    color: '#666',
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  performerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performerRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  performerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performerStatsRtl: {
    flexDirection: 'row-reverse',
  },
  performerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  performerStatText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default AnalyticsDashboard;
