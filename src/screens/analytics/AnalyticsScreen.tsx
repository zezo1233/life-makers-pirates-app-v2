import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
// Charts removed temporarily due to native linking issues
// import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

// Import stores and services
import { useTrainingRequestsStore } from '../../store/trainingRequestsStore';
import { useAuthStore } from '../../store/authStore';
import { supabase, TABLES } from '../../config/supabase';
import { TrainingRequest, TrainingStatus, UserRole } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsData {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  requestsByMonth: { month: string; count: number }[];
  requestsBySpecialization: { name: string; count: number; color: string }[];
  requestsByProvince: { name: string; count: number }[];
  trainerPerformance: { name: string; rating: number; completedTrainings: number }[];
  statusDistribution: { name: string; count: number; color: string }[];
}

const AnalyticsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { requests, fetchRequests } = useTrainingRequestsStore();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch requests first
      await fetchRequests();
      
      // Calculate analytics
      const analytics = calculateAnalytics(requests);
      setAnalyticsData(analytics);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const calculateAnalytics = (requests: TrainingRequest[]): AnalyticsData => {
    const now = new Date();
    const periodStart = getPeriodStart(now, selectedPeriod);
    
    // Filter requests by selected period
    const filteredRequests = requests.filter(request => 
      new Date(request.created_at) >= periodStart
    );

    // Basic counts
    const totalRequests = filteredRequests.length;
    const completedRequests = filteredRequests.filter(r => r.status === TrainingStatus.COMPLETED).length;
    const pendingRequests = filteredRequests.filter(r => 
      [TrainingStatus.UNDER_REVIEW, TrainingStatus.CC_APPROVED, TrainingStatus.PM_APPROVED].includes(r.status)
    ).length;
    const rejectedRequests = filteredRequests.filter(r => r.status === TrainingStatus.REJECTED).length;

    // Requests by month
    const requestsByMonth = getRequestsByMonth(filteredRequests);

    // Requests by specialization
    const requestsBySpecialization = getRequestsBySpecialization(filteredRequests);

    // Requests by province
    const requestsByProvince = getRequestsByProvince(filteredRequests);

    // Status distribution
    const statusDistribution = getStatusDistribution(filteredRequests);

    // Trainer performance (placeholder for now)
    const trainerPerformance: { name: string; rating: number; completedTrainings: number }[] = [];

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      rejectedRequests,
      requestsByMonth,
      requestsBySpecialization,
      requestsByProvince,
      trainerPerformance,
      statusDistribution,
    };
  };

  const getPeriodStart = (date: Date, period: 'month' | 'quarter' | 'year'): Date => {
    const start = new Date(date);
    
    switch (period) {
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return start;
  };

  const getRequestsByMonth = (requests: TrainingRequest[]) => {
    const monthCounts: { [key: string]: number } = {};
    
    requests.forEach(request => {
      const date = new Date(request.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const getRequestsBySpecialization = (requests: TrainingRequest[]) => {
    const specializationCounts: { [key: string]: number } = {};
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
    
    requests.forEach(request => {
      const spec = request.specialization;
      specializationCounts[spec] = (specializationCounts[spec] || 0) + 1;
    });

    return Object.entries(specializationCounts)
      .map(([name, count], index) => ({
        name: t(`specializations.${name}`),
        count,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getRequestsByProvince = (requests: TrainingRequest[]) => {
    const provinceCounts: { [key: string]: number } = {};
    
    requests.forEach(request => {
      const province = request.province;
      provinceCounts[province] = (provinceCounts[province] || 0) + 1;
    });

    return Object.entries(provinceCounts)
      .map(([name, count]) => ({
        name: t(`provinces.${name}`),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getStatusDistribution = (requests: TrainingRequest[]) => {
    const statusCounts: { [key: string]: number } = {};
    const statusColors: { [key: string]: string } = {
      [TrainingStatus.UNDER_REVIEW]: '#FFA726',
      [TrainingStatus.CC_APPROVED]: '#42A5F5',
      [TrainingStatus.PM_APPROVED]: '#66BB6A',
      [TrainingStatus.TR_ASSIGNED]: '#AB47BC',
      [TrainingStatus.SV_APPROVED]: '#26C6DA',
      [TrainingStatus.FINAL_APPROVED]: '#9CCC65',
      [TrainingStatus.SCHEDULED]: '#5C6BC0',
      [TrainingStatus.COMPLETED]: '#4CAF50',
      [TrainingStatus.CANCELLED]: '#F44336',
      [TrainingStatus.REJECTED]: '#E57373',
    };
    
    requests.forEach(request => {
      const status = request.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .map(([name, count]) => ({
        name: t(`training.status.${name}`),
        count,
        color: statusColors[name] || '#9E9E9E',
      }))
      .sort((a, b) => b.count - a.count);
  };

  const renderStatCard = (title: string, value: number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardContent}>
        <View style={styles.statCardText}>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
        </View>
        <View style={[styles.statCardIcon, { backgroundColor: color }]}>
          <Ionicons name={icon as any} size={24} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['month', 'quarter', 'year'] as const).map((period) => (
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
            {t(`analytics.period.${period}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading || !analyticsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
          📊 {t('analytics.title')}
        </Text>
        <Text style={[styles.headerSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('analytics.subtitle')}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderPeriodSelector()}

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          {renderStatCard(
            t('analytics.totalRequests'),
            analyticsData.totalRequests,
            'document-text-outline',
            '#667eea'
          )}
          {renderStatCard(
            t('analytics.completedRequests'),
            analyticsData.completedRequests,
            'checkmark-circle-outline',
            '#4CAF50'
          )}
          {renderStatCard(
            t('analytics.pendingRequests'),
            analyticsData.pendingRequests,
            'time-outline',
            '#FFA726'
          )}
          {renderStatCard(
            t('analytics.rejectedRequests'),
            analyticsData.rejectedRequests,
            'close-circle-outline',
            '#F44336'
          )}
        </View>

        {/* Requests by Month - Visual Cards */}
        {analyticsData.requestsByMonth.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>{t('analytics.requestsByMonth')}</Text>
            <View style={styles.monthlyGrid}>
              {analyticsData.requestsByMonth.slice(-6).map((item, index) => (
                <View key={index} style={styles.monthCard}>
                  <Text style={styles.monthLabel}>
                    {new Date(item.month + '-01').toLocaleDateString('ar', { month: 'short' })}
                  </Text>
                  <Text style={styles.monthValue}>{item.count}</Text>
                  <View style={[styles.monthBar, {
                    height: Math.max(4, (item.count / Math.max(...analyticsData.requestsByMonth.map(m => m.count))) * 40)
                  }]} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Specialization Distribution */}
        {analyticsData.requestsBySpecialization.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>{t('analytics.requestsBySpecialization')}</Text>
            <View style={styles.specializationGrid}>
              {analyticsData.requestsBySpecialization.map((item, index) => (
                <View key={index} style={[styles.specializationCard, { borderLeftColor: item.color }]}>
                  <View style={styles.specializationHeader}>
                    <Text style={styles.specializationName}>{item.name}</Text>
                    <Text style={styles.specializationCount}>{item.count}</Text>
                  </View>
                  <View style={styles.specializationBarContainer}>
                    <View
                      style={[
                        styles.specializationBar,
                        {
                          width: `${(item.count / analyticsData.requestsBySpecialization[0].count) * 100}%`,
                          backgroundColor: item.color
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.specializationPercentage}>
                    {Math.round((item.count / analyticsData.totalRequests) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Status Distribution */}
        {analyticsData.statusDistribution.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>{t('analytics.statusDistribution')}</Text>
            <View style={styles.statusGrid}>
              {analyticsData.statusDistribution.map((item, index) => (
                <View key={index} style={styles.statusCard}>
                  <View style={[styles.statusIndicator, { backgroundColor: item.color }]} />
                  <View style={styles.statusContent}>
                    <Text style={styles.statusName}>{item.name}</Text>
                    <Text style={styles.statusCount}>{item.count}</Text>
                  </View>
                  <View style={styles.statusBarContainer}>
                    <View
                      style={[
                        styles.statusBar,
                        {
                          width: `${(item.count / analyticsData.statusDistribution[0].count) * 100}%`,
                          backgroundColor: item.color
                        }
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Province Distribution */}
        {analyticsData.requestsByProvince.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>{t('analytics.requestsByProvince')}</Text>
            <View style={styles.provinceList}>
              {analyticsData.requestsByProvince.slice(0, 10).map((item, index) => (
                <View key={index} style={styles.provinceItem}>
                  <Text style={styles.provinceName}>{item.name}</Text>
                  <View style={styles.provinceBar}>
                    <View
                      style={[
                        styles.provinceBarFill,
                        {
                          width: `${(item.count / analyticsData.requestsByProvince[0].count) * 100}%`,
                          backgroundColor: `hsl(${(index * 30) % 360}, 70%, 60%)`
                        }
                      ]}
                    />
                    <Text style={styles.provinceCount}>{item.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Summary Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>{t('analytics.insights')}</Text>

          <View style={styles.insightItem}>
            <Ionicons name="trending-up-outline" size={20} color="#4CAF50" />
            <Text style={styles.insightText}>
              {t('analytics.completionRate', {
                rate: analyticsData.totalRequests > 0
                  ? Math.round((analyticsData.completedRequests / analyticsData.totalRequests) * 100)
                  : 0
              })}
            </Text>
          </View>

          <View style={styles.insightItem}>
            <Ionicons name="time-outline" size={20} color="#FFA726" />
            <Text style={styles.insightText}>
              {t('analytics.pendingRate', {
                rate: analyticsData.totalRequests > 0
                  ? Math.round((analyticsData.pendingRequests / analyticsData.totalRequests) * 100)
                  : 0
              })}
            </Text>
          </View>

          {analyticsData.requestsBySpecialization.length > 0 && (
            <View style={styles.insightItem}>
              <Ionicons name="star-outline" size={20} color="#667eea" />
              <Text style={styles.insightText}>
                {t('analytics.topSpecialization', {
                  specialization: analyticsData.requestsBySpecialization[0].name
                })}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#667eea',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardText: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  monthlyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  monthCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    width: '15%',
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 10,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  monthValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  monthBar: {
    width: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  specializationGrid: {
    marginTop: 8,
  },
  specializationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  specializationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  specializationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  specializationCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  specializationBarContainer: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    marginBottom: 4,
  },
  specializationBar: {
    height: '100%',
    borderRadius: 3,
  },
  specializationPercentage: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'right',
  },
  statusGrid: {
    marginTop: 8,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 2,
  },
  statusCount: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  statusBarContainer: {
    width: 60,
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginLeft: 12,
  },
  statusBar: {
    height: '100%',
    borderRadius: 2,
  },
  provinceList: {
    marginTop: 8,
  },
  provinceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  provinceName: {
    fontSize: 14,
    color: '#2C3E50',
    width: 120,
    fontWeight: '500',
  },
  provinceBar: {
    flex: 1,
    height: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginLeft: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  provinceBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 12,
    minWidth: 20,
  },
  provinceCount: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 1,
  },
  insightsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
    flex: 1,
  },
});

export default AnalyticsScreen;
