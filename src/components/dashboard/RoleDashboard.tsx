import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDashboardStore, QuickAction } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';
import { UserRole, MainTabParamList, RequestsStackParamList } from '../../types';
import WorkflowStats from '../workflow/WorkflowStats';
import { isRTL, getTextAlign } from '../../i18n';
import Toast from 'react-native-toast-message';

type NavigationProp = StackNavigationProp<MainTabParamList & RequestsStackParamList>;

interface RoleDashboardProps {
  className?: string;
}

const RoleDashboard: React.FC<RoleDashboardProps> = ({ className }) => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const {
    dashboard,
    isLoading,
    error,
    fetchDashboard,
    refreshStats,
    clearError
  } = useDashboardStore();

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (user?.id && user?.role) {
      fetchDashboard(user.id, user.role as UserRole);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.dashboardLoadFailed'),
        text2: error,
      });
      clearError();
    }
  }, [error]);

  const handleQuickAction = (action: QuickAction) => {
    console.log('🎯 Quick Action clicked:', action.action);

    try {
      switch (action.action) {
        case 'review_requests':
          console.log('📋 Navigating to review requests...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { status: 'under_review' } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToReview'),
          });
          break;

        case 'create_request':
          console.log('➕ Navigating to create request...');
          navigation.navigate('Requests', {
            screen: 'CreateRequest'
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToCreate'),
          });
          break;

        case 'batch_approve':
          Alert.alert(
            t('workflowDashboard.batchApprove'),
            t('workflowDashboard.batchApproveMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.proceed'), onPress: () => handleBatchApprove() }
            ]
          );
          break;

        case 'ai_trainer_match':
          Toast.show({
            type: 'info',
            text1: t('workflowDashboard.aiMatchStarted'),
            text2: t('workflowDashboard.aiMatchDescription'),
          });
          break;

        case 'browse_opportunities':
          console.log('🎓 Navigating to browse opportunities...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { status: 'pm_approved' } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToOpportunities'),
          });
          break;

        case 'view_analytics':
          console.log('📊 Navigating to analytics...');
          navigation.navigate('Analytics');
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToAnalytics'),
          });
          break;

        case 'my_requests':
          console.log('📋 Navigating to my requests...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { my_requests: true } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToMyRequests'),
          });
          break;

        case 'pending_approvals':
          console.log('⏳ Navigating to pending approvals...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { pending_approvals: true } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToPending'),
          });
          break;

        // CC Actions
        case 'quick_approve':
          console.log('✅ Quick approve action...');
          Alert.alert(
            t('workflowDashboard.quickApprove'),
            t('workflowDashboard.quickApproveMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.approve'), onPress: () => handleQuickApprove() }
            ]
          );
          break;

        case 'request_info':
          console.log('❓ Request info action...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { needs_info: true } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToRequestInfo'),
          });
          break;

        // PM Actions
        case 'resource_planning':
          console.log('📊 Resource planning...');
          navigation.navigate('Analytics');
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToResourcePlanning'),
          });
          break;

        case 'optimize_schedule':
          console.log('📅 Schedule optimization...');
          navigation.navigate('Calendar');
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToScheduleOptimization'),
          });
          break;

        // SV Actions
        case 'trainer_performance':
          console.log('⭐ Trainer performance...');
          navigation.navigate('Analytics');
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToTrainerPerformance'),
          });
          break;

        case 'quick_assign':
          console.log('⚡ Quick assign...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { needs_assignment: true } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToQuickAssign'),
          });
          break;

        // DV Actions
        case 'schedule_training':
          console.log('📅 Schedule training...');
          navigation.navigate('Calendar');
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToScheduleTraining'),
          });
          break;

        case 'track_progress':
          console.log('📈 Track progress...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { my_requests: true } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToTrackProgress'),
          });
          break;

        // TR Actions
        case 'update_availability':
          console.log('⏰ Update availability...');
          navigation.navigate('Profile');
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToUpdateAvailability'),
          });
          break;

        case 'view_feedback':
          console.log('💬 View feedback...');
          navigation.navigate('Requests', {
            screen: 'RequestsList',
            params: { filter: { completed_trainings: true } }
          });
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToViewFeedback'),
          });
          break;

        // MB Actions
        case 'strategic_overview':
          console.log('🎯 Strategic overview...');
          navigation.navigate('Analytics');
          Toast.show({
            type: 'success',
            text1: t('workflowDashboard.navigatingToStrategicOverview'),
          });
          break;

        default:
          console.log('❓ Unknown action:', action.action);
          Toast.show({
            type: 'info',
            text1: t('workflowDashboard.featureComingSoon'),
            text2: action.title,
          });
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('workflowDashboard.navigationError'),
      });
    }
  };

  const handleBatchApprove = () => {
    // Implementation for batch approval
    Toast.show({
      type: 'success',
      text1: t('workflowDashboard.batchApproveSuccess'),
    });
  };

  const handleQuickApprove = () => {
    // Implementation for quick approval
    Toast.show({
      type: 'success',
      text1: t('workflowDashboard.quickApproveSuccess'),
    });
  };

  const getStatColor = (value: number, type: 'pending' | 'completed' | 'rate'): string => {
    if (type === 'pending') {
      return value > 5 ? '#dc3545' : value > 2 ? '#ffc107' : '#28a745';
    } else if (type === 'completed') {
      return value > 0 ? '#28a745' : '#6c757d';
    } else { // rate
      return value > 90 ? '#28a745' : value > 70 ? '#ffc107' : '#dc3545';
    }
  };

  const renderStatsCard = () => {
    if (!dashboard?.stats) return null;

    const { stats } = dashboard;

    return (
      <View style={styles.statsCard}>
        <Text style={[styles.cardTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('workflowDashboard.overview')}
        </Text>
        
        <View style={[styles.statsGrid, isRtl && styles.statsGridRtl]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalRequests}</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('workflowDashboard.totalRequests')}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              { color: getStatColor(stats.pendingActions, 'pending') }
            ]}>
              {stats.pendingActions}
            </Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('workflowDashboard.pendingActions')}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              { color: getStatColor(stats.completedToday, 'completed') }
            ]}>
              {stats.completedToday}
            </Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('workflowDashboard.completedToday')}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              { color: getStatColor(stats.successRate, 'rate') }
            ]}>
              {stats.successRate.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('workflowDashboard.successRate')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => {
    if (!dashboard?.quickActions?.length) return null;

    return (
      <View style={styles.quickActionsCard}>
        <Text style={[styles.cardTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('workflowDashboard.quickActions')}
        </Text>
        
        <View style={[styles.actionsGrid, isRtl && styles.actionsGridRtl]}>
          {dashboard.quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionButton,
                action.priority === 'high' && styles.highPriorityAction
              ]}
              onPress={() => handleQuickAction(action)}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name={action.icon}
                  size={24}
                  color={action.priority === 'high' ? '#ffffff' : '#007bff'}
                />
                {action.count !== undefined && action.count > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>
                      {action.count > 99 ? '99+' : action.count.toString()}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={[
                styles.actionTitle,
                { textAlign: getTextAlign(i18n.language) },
                action.priority === 'high' && styles.highPriorityText
              ]}>
                {action.title}
              </Text>
              
              <Text style={[
                styles.actionDescription,
                { textAlign: getTextAlign(i18n.language) },
                action.priority === 'high' && styles.highPriorityDescription
              ]}>
                {action.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAlerts = () => {
    if (!dashboard?.alerts?.length) return null;

    return (
      <View style={styles.alertsCard}>
        <Text style={[styles.cardTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('workflowDashboard.alerts')}
        </Text>
        
        {dashboard.alerts.map((alert) => (
          <View key={alert.id} style={[styles.alertItem, isRtl && styles.alertItemRtl]}>
            <Ionicons
              name={alert.type === 'warning' ? 'warning' : alert.type === 'error' ? 'close-circle' : 'information-circle'}
              size={20}
              color={alert.type === 'warning' ? '#ffc107' : alert.type === 'error' ? '#dc3545' : '#17a2b8'}
            />
            <View style={[styles.alertContent, isRtl && styles.alertContentRtl]}>
              <Text style={[styles.alertTitle, { textAlign: getTextAlign(i18n.language) }]}>
                {alert.title}
              </Text>
              <Text style={[styles.alertMessage, { textAlign: getTextAlign(i18n.language) }]}>
                {alert.message}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { textAlign: getTextAlign(i18n.language) }]}>
          {t('common.loading')}...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={[styles.welcomeText, { textAlign: getTextAlign(i18n.language) }]}>
          {t('workflowDashboard.welcome')}, {user?.full_name}
        </Text>
        <Text style={[styles.roleText, { textAlign: getTextAlign(i18n.language) }]}>
          {t(`roles.${user?.role}`)}
        </Text>
      </View>

      {/* Stats Overview */}
      {renderStatsCard()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Alerts */}
      {renderAlerts()}

      {/* Workflow Statistics */}
      <WorkflowStats />

      {/* Refresh Button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => user?.id && user?.role && refreshStats(user.id, user.role as UserRole)}
      >
        <Ionicons name="refresh-outline" size={20} color="#007bff" />
        <Text style={styles.refreshText}>{t('workflowDashboard.refresh')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
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
  welcomeHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: '#666',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsGridRtl: {
    flexDirection: 'row-reverse',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  actionsGridRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  highPriorityAction: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  actionIconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  actionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  highPriorityText: {
    color: '#ffffff',
  },
  highPriorityDescription: {
    color: '#e9ecef',
  },
  alertsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertItemRtl: {
    flexDirection: 'row-reverse',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertContentRtl: {
    marginLeft: 0,
    marginRight: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshText: {
    fontSize: 16,
    color: '#007bff',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default RoleDashboard;
