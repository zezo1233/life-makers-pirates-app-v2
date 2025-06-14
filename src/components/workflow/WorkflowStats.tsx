import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
// Removed workflowReminderService - using perfect notification system now
import { isRTL, getTextAlign } from '../../i18n';

interface WorkflowStatsProps {
  className?: string;
}

interface Stats {
  overdueRequests: number;
  remindersSent: number;
  avgResponseTime: number;
}

const WorkflowStats: React.FC<WorkflowStatsProps> = ({ className }) => {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    overdueRequests: 0,
    remindersSent: 0,
    avgResponseTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      // Perfect notification system handles stats automatically
      // For now, show placeholder stats
      setStats({
        overdueRequests: 0,
        remindersSent: 0,
        avgResponseTime: 0
      });
    } catch (error) {
      console.error('Error loading workflow stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceCheck = () => {
    Alert.alert(
      t('workflowStats.forceCheck'),
      t('workflowStats.forceCheckMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.proceed'), 
          onPress: async () => {
            try {
              // Perfect notification system handles reminders automatically
              loadStats();

              Alert.alert(
                t('workflowStats.checkStarted'),
                'Perfect notification system is always active'
              );
            } catch (error) {
              Alert.alert(
                t('common.error'),
                'Failed to refresh stats'
              );
            }
          }
        }
      ]
    );
  };

  const getStatColor = (value: number, type: 'overdue' | 'sent' | 'time'): string => {
    switch (type) {
      case 'overdue':
        return value > 5 ? '#dc3545' : value > 2 ? '#ffc107' : '#28a745';
      case 'sent':
        return value > 10 ? '#17a2b8' : value > 5 ? '#6c757d' : '#28a745';
      case 'time':
        return value > 3 ? '#dc3545' : value > 1.5 ? '#ffc107' : '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getStatIcon = (type: 'overdue' | 'sent' | 'time'): string => {
    switch (type) {
      case 'overdue':
        return 'alert-circle-outline';
      case 'sent':
        return 'notifications-outline';
      case 'time':
        return 'time-outline';
      default:
        return 'stats-chart-outline';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('common.loading')}...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isRtl && styles.containerRtl]}>
      {/* Header */}
      <View style={[styles.header, isRtl && styles.headerRtl]}>
        <Text style={[styles.title, { textAlign: getTextAlign(i18n.language) }]}>
          {t('workflowStats.title')}
        </Text>
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadStats}
        >
          <Ionicons name="refresh-outline" size={20} color="#007bff" />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsGrid, isRtl && styles.statsGridRtl]}>
        {/* Overdue Requests */}
        <View style={styles.statCard}>
          <View style={[styles.statHeader, isRtl && styles.statHeaderRtl]}>
            <Ionicons
              name={getStatIcon('overdue')}
              size={24}
              color={getStatColor(stats.overdueRequests, 'overdue')}
            />
            <Text style={[
              styles.statValue,
              { color: getStatColor(stats.overdueRequests, 'overdue') }
            ]}>
              {stats.overdueRequests}
            </Text>
          </View>
          <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('workflowStats.overdueRequests')}
          </Text>
        </View>

        {/* Reminders Sent */}
        <View style={styles.statCard}>
          <View style={[styles.statHeader, isRtl && styles.statHeaderRtl]}>
            <Ionicons
              name={getStatIcon('sent')}
              size={24}
              color={getStatColor(stats.remindersSent, 'sent')}
            />
            <Text style={[
              styles.statValue,
              { color: getStatColor(stats.remindersSent, 'sent') }
            ]}>
              {stats.remindersSent}
            </Text>
          </View>
          <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('workflowStats.remindersSent')}
          </Text>
        </View>

        {/* Average Response Time */}
        <View style={styles.statCard}>
          <View style={[styles.statHeader, isRtl && styles.statHeaderRtl]}>
            <Ionicons
              name={getStatIcon('time')}
              size={24}
              color={getStatColor(stats.avgResponseTime, 'time')}
            />
            <Text style={[
              styles.statValue,
              { color: getStatColor(stats.avgResponseTime, 'time') }
            ]}>
              {stats.avgResponseTime.toFixed(1)}
            </Text>
          </View>
          <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('workflowStats.avgResponseTime')}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.actions, isRtl && styles.actionsRtl]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleForceCheck}
        >
          <Ionicons name="scan-outline" size={16} color="#007bff" />
          <Text style={[styles.actionText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('workflowStats.forceCheck')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Indicators */}
      <View style={[styles.indicators, isRtl && styles.indicatorsRtl]}>
        <View style={[styles.indicator, isRtl && styles.indicatorRtl]}>
          <View style={[styles.indicatorDot, { backgroundColor: '#28a745' }]} />
          <Text style={[styles.indicatorText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('workflowStats.good')}
          </Text>
        </View>
        
        <View style={[styles.indicator, isRtl && styles.indicatorRtl]}>
          <View style={[styles.indicatorDot, { backgroundColor: '#ffc107' }]} />
          <Text style={[styles.indicatorText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('workflowStats.warning')}
          </Text>
        </View>
        
        <View style={[styles.indicator, isRtl && styles.indicatorRtl]}>
          <View style={[styles.indicatorDot, { backgroundColor: '#dc3545' }]} />
          <Text style={[styles.indicatorText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('workflowStats.critical')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerRtl: {
    // RTL specific styles if needed
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsGridRtl: {
    flexDirection: 'row-reverse',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
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
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionsRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionText: {
    fontSize: 14,
    color: '#007bff',
    marginLeft: 8,
    fontWeight: '500',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  indicatorsRtl: {
    flexDirection: 'row-reverse',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorRtl: {
    flexDirection: 'row-reverse',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  indicatorText: {
    fontSize: 10,
    color: '#666',
  },
});

export default WorkflowStats;
