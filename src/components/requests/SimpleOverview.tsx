import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useTrainingRequestsStore, canCreateRequest } from '../../store/trainingRequestsStore';
import { TrainingStatus } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface SimpleOverviewProps {
  onCreateRequest?: () => void;
  onFilterChange?: (status: TrainingStatus | 'all') => void;
}

const SimpleOverview: React.FC<SimpleOverviewProps> = ({ 
  onCreateRequest, 
  onFilterChange 
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { requests } = useTrainingRequestsStore();
  
  const isRtl = isRTL(i18n.language);

  // Calculate stats
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => 
    [TrainingStatus.UNDER_REVIEW, TrainingStatus.CC_APPROVED, TrainingStatus.PM_APPROVED].includes(r.status)
  ).length;
  const completedRequests = requests.filter(r => r.status === TrainingStatus.COMPLETED).length;
  const rejectedRequests = requests.filter(r => r.status === TrainingStatus.REJECTED).length;

  // Get quick actions based on user role
  const getQuickActions = () => {
    if (!user) return [];

    const actions = [];

    // Create new request (for DV and PM)
    if (canCreateRequest(user.role)) {
      actions.push({
        id: 'create',
        title: t('training.newRequest'),
        icon: 'add-circle-outline' as const,
        color: '#667eea',
        onPress: onCreateRequest,
      });
    }

    // Pending approvals (for CC, PM, SV)
    if (['CC', 'PM', 'SV'].includes(user.role)) {
      actions.push({
        id: 'pending',
        title: t('training.pendingApprovals'),
        icon: 'time-outline' as const,
        color: '#ffc107',
        onPress: () => onFilterChange?.(TrainingStatus.UNDER_REVIEW),
      });
    }

    // Available trainings (for TR)
    if (user.role === 'TR') {
      actions.push({
        id: 'available',
        title: t('training.availableTrainings'),
        icon: 'school-outline' as const,
        color: '#17a2b8',
        onPress: () => onFilterChange?.(TrainingStatus.PM_APPROVED),
      });
    }

    // Completed trainings
    actions.push({
      id: 'completed',
      title: t('training.completedTrainings'),
      icon: 'checkmark-circle-outline' as const,
      color: '#28a745',
      onPress: () => onFilterChange?.(TrainingStatus.COMPLETED),
    });

    return actions;
  };

  const quickActions = getQuickActions();

  return (
    <View style={styles.container}>
      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={[styles.welcomeText, { textAlign: getTextAlign(i18n.language) }]}>
          مرحباً، {user?.full_name}
        </Text>
        <Text style={[styles.roleText, { textAlign: getTextAlign(i18n.language) }]}>
          {t(`roles.${user?.role}`)}
        </Text>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsCard}>
        <Text style={[styles.cardTitle, { textAlign: getTextAlign(i18n.language) }]}>
          📊 {t('training.overview')}
        </Text>
        
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[styles.statCard, { borderLeftColor: '#667eea' }]}
            onPress={() => onFilterChange?.('all')}
          >
            <Text style={styles.statNumber}>{totalRequests}</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('training.totalRequests')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { borderLeftColor: '#ffc107' }]}
            onPress={() => onFilterChange?.(TrainingStatus.UNDER_REVIEW)}
          >
            <Text style={styles.statNumber}>{pendingRequests}</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('training.pendingRequests')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { borderLeftColor: '#28a745' }]}
            onPress={() => onFilterChange?.(TrainingStatus.COMPLETED)}
          >
            <Text style={styles.statNumber}>{completedRequests}</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('training.completedRequests')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { borderLeftColor: '#dc3545' }]}
            onPress={() => onFilterChange?.(TrainingStatus.REJECTED)}
          >
            <Text style={styles.statNumber}>{rejectedRequests}</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('training.rejectedRequests')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <View style={styles.quickActionsCard}>
          <Text style={[styles.cardTitle, { textAlign: getTextAlign(i18n.language) }]}>
            ⚡ {t('training.quickActions')}
          </Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { borderColor: action.color }]}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={24} color="#ffffff" />
                </View>
                <Text style={[styles.actionTitle, { textAlign: getTextAlign(i18n.language) }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  welcomeHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#666',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  quickActionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SimpleOverview;
