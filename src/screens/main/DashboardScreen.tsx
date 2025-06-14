import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Import stores and types
import { useAuthStore, getRoleDisplayName } from '../../store/authStore';
import { useCalendarStore } from '../../store/calendarStore';
import { UserRole, MainTabParamList } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';
import useResponsiveScreen from '../../hooks/useResponsiveScreen';

type DashboardNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Dashboard'>;

interface StatCard {
  title: string;
  value: string;
  icon: string;
  color: string;
  gradient: string[];
}

const DashboardScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<DashboardNavigationProp>();
  const { user } = useAuthStore();
  const { events, fetchEvents } = useCalendarStore();
  const { responsiveStyles, scale, isTablet, dimensions } = useResponsiveScreen();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Fetch recent events
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await fetchEvents(startDate, endDate);
      
      // Generate stats based on user role
      generateStats();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const generateStats = () => {
    const upcomingEvents = events.filter(event => 
      new Date(event.start_date) > new Date()
    ).length;

    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start_date).toDateString();
      const today = new Date().toDateString();
      return eventDate === today;
    }).length;

    const thisMonthEvents = events.filter(event => {
      const eventDate = new Date(event.start_date);
      const now = new Date();
      return eventDate.getMonth() === now.getMonth() && 
             eventDate.getFullYear() === now.getFullYear();
    }).length;

    const newStats: StatCard[] = [
      {
        title: t('dashboard.upcomingTrainings'),
        value: upcomingEvents.toString(),
        icon: 'calendar-outline',
        color: '#667eea',
        gradient: ['#667eea', '#764ba2'],
      },
      {
        title: t('dashboard.thisMonth'),
        value: thisMonthEvents.toString(),
        icon: 'trending-up-outline',
        color: '#28a745',
        gradient: ['#28a745', '#20c997'],
      },
      {
        title: t('calendar.today'),
        value: todayEvents.toString(),
        icon: 'today-outline',
        color: '#ffc107',
        gradient: ['#ffc107', '#fd7e14'],
      },
    ];

    // Add role-specific stats
    if (user?.role === UserRole.TRAINER) {
      newStats.push({
        title: t('profile.totalHours'),
        value: user.total_training_hours?.toString() || '0',
        icon: 'time-outline',
        color: '#17a2b8',
        gradient: ['#17a2b8', '#6f42c1'],
      });
    }

    setStats(newStats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderStatCard = (stat: StatCard, index: number) => {
    const cardWidth = isTablet
      ? (dimensions.width - responsiveStyles.padding.horizontal * 3) / 2
      : dimensions.width - responsiveStyles.padding.horizontal * 2;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.statCardContainer,
          {
            width: cardWidth,
            marginBottom: scale.height(16),
          }
        ]}
      >
        <LinearGradient
          colors={stat.gradient}
          style={[
            styles.statCard,
            {
              borderRadius: scale.width(16),
              padding: responsiveStyles.padding.horizontal,
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.statCardContent, isRtl && styles.statCardContentRtl]}>
            <View style={styles.statCardIcon}>
              <Ionicons name={stat.icon as any} size={scale.width(24)} color="#ffffff" />
            </View>
            <View style={styles.statCardText}>
              <Text style={[
                styles.statCardValue,
                {
                  textAlign: getTextAlign(i18n.language),
                  fontSize: scale.font(24),
                }
              ]}>
                {stat.value}
              </Text>
              <Text style={[
                styles.statCardTitle,
                {
                  textAlign: getTextAlign(i18n.language),
                  fontSize: scale.font(14),
                }
              ]}>
                {stat.title}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderRecentActivity = () => {
    const recentEvents = events
      .filter(event => new Date(event.start_date) > new Date())
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('dashboard.recentActivity')}
        </Text>
        
        {recentEvents.length > 0 ? (
          recentEvents.map((event, index) => (
            <View key={event.id} style={[styles.activityItem, isRtl && styles.activityItemRtl]}>
              <View style={[styles.activityIcon, { backgroundColor: event.color }]}>
                <Ionicons 
                  name={event.type === 'training' ? 'school-outline' : 'calendar-outline'} 
                  size={16} 
                  color="#ffffff" 
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityTitle, { textAlign: getTextAlign(i18n.language) }]}>
                  {event.title}
                </Text>
                <Text style={[styles.activityDate, { textAlign: getTextAlign(i18n.language) }]}>
                  {new Date(event.start_date).toLocaleDateString(
                    isRtl ? 'ar-SA' : 'en-US',
                    { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }
                  )}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={[styles.emptyStateText, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.noEvents')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderQuickActions = () => {
    const actions = [];

    // Role-based quick actions
    switch (user?.role) {
      case UserRole.TRAINER:
        actions.push(
          {
            title: t('calendar.setAvailability'),
            icon: 'time-outline',
            color: '#28a745',
            onPress: () => {
              navigation.navigate('Calendar');
              // Note: Direct navigation to nested screen would require CompositeNavigationProp
              // For now, navigate to Calendar tab and let user navigate to TrainerAvailability
            }
          },
          {
            title: t('calendar.events'),
            icon: 'calendar-outline',
            color: '#667eea',
            onPress: () => navigation.navigate('Calendar')
          },
          {
            title: t('chat.messages'),
            icon: 'chatbubbles-outline',
            color: '#17a2b8',
            onPress: () => navigation.navigate('Chat')
          }
        );
        break;

      case UserRole.PROVINCIAL_DEVELOPMENT_OFFICER:
        // DV يمكنه إنشاء طلبات التدريب
        actions.push(
          {
            title: t('training.newRequest'),
            icon: 'add-circle-outline',
            color: '#667eea',
            onPress: () => {
              navigation.navigate('Requests');
              // Note: Direct navigation to CreateRequest would require CompositeNavigationProp
              // For now, navigate to Requests tab and let user navigate to CreateRequest
            }
          },
          {
            title: t('training.requests'),
            icon: 'document-text-outline',
            color: '#ffc107',
            onPress: () => navigation.navigate('Requests')
          },
          {
            title: t('calendar.events'),
            icon: 'calendar-outline',
            color: '#28a745',
            onPress: () => navigation.navigate('Calendar')
          },
          {
            title: t('chat.messages'),
            icon: 'chatbubbles-outline',
            color: '#17a2b8',
            onPress: () => navigation.navigate('Chat')
          }
        );
        break;

      case UserRole.TRAINER_PREPARATION_PROJECT_MANAGER:
        // PM يمكنه إنشاء طلبات التدريب وإدارة المستخدمين
        actions.push(
          {
            title: t('training.newRequest'),
            icon: 'add-circle-outline',
            color: '#667eea',
            onPress: () => {
              navigation.navigate('Requests');
              // Note: Direct navigation to CreateRequest would require CompositeNavigationProp
              // For now, navigate to Requests tab and let user navigate to CreateRequest
            }
          },
          {
            title: t('profile.userManagement'),
            icon: 'people-outline',
            color: '#6f42c1',
            onPress: () => navigation.navigate('Profile')
          },
          {
            title: t('training.requests'),
            icon: 'document-text-outline',
            color: '#ffc107',
            onPress: () => navigation.navigate('Requests')
          },
          {
            title: t('calendar.events'),
            icon: 'calendar-outline',
            color: '#28a745',
            onPress: () => navigation.navigate('Calendar')
          },
          {
            title: t('chat.messages'),
            icon: 'chatbubbles-outline',
            color: '#17a2b8',
            onPress: () => navigation.navigate('Chat')
          }
        );
        break;

      case UserRole.DEVELOPMENT_MANAGEMENT_OFFICER:
        // CC يمكنه فقط مراجعة الطلبات وليس إنشاؤها
        actions.push(
          {
            title: t('training.requests'),
            icon: 'document-text-outline',
            color: '#ffc107',
            onPress: () => navigation.navigate('Requests')
          },
          {
            title: t('calendar.events'),
            icon: 'calendar-outline',
            color: '#28a745',
            onPress: () => navigation.navigate('Calendar')
          },
          {
            title: t('chat.messages'),
            icon: 'chatbubbles-outline',
            color: '#17a2b8',
            onPress: () => navigation.navigate('Chat')
          }
        );
        break;

      case UserRole.PROGRAM_SUPERVISOR:
        actions.push(
          {
            title: t('training.requests'),
            icon: 'document-text-outline',
            color: '#ffc107',
            onPress: () => navigation.navigate('Requests')
          },
          {
            title: t('calendar.events'),
            icon: 'calendar-outline',
            color: '#667eea',
            onPress: () => navigation.navigate('Calendar')
          },
          {
            title: t('chat.messages'),
            icon: 'chatbubbles-outline',
            color: '#17a2b8',
            onPress: () => navigation.navigate('Chat')
          }
        );
        break;

      case UserRole.BOARD_MEMBER:
        actions.push(
          {
            title: t('training.requests'),
            icon: 'document-text-outline',
            color: '#ffc107',
            onPress: () => navigation.navigate('Requests')
          },
          {
            title: t('calendar.events'),
            icon: 'calendar-outline',
            color: '#667eea',
            onPress: () => navigation.navigate('Calendar')
          },
          {
            title: t('profile.myProfile'),
            icon: 'person-outline',
            color: '#6f42c1',
            onPress: () => navigation.navigate('Profile')
          }
        );
        break;

      default:
        actions.push(
          {
            title: t('calendar.events'),
            icon: 'calendar-outline',
            color: '#667eea',
            onPress: () => navigation.navigate('Calendar')
          },
          {
            title: t('chat.messages'),
            icon: 'chatbubbles-outline',
            color: '#17a2b8',
            onPress: () => navigation.navigate('Chat')
          }
        );
    }

    if (actions.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader, isRtl && styles.sectionHeaderRtl]}>
          <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
            {t('dashboard.quickActions')}
          </Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowQuickActions(!showQuickActions)}
          >
            <Ionicons
              name={showQuickActions ? "chevron-up-outline" : "chevron-down-outline"}
              size={20}
              color="#667eea"
            />
          </TouchableOpacity>
        </View>
        {showQuickActions && (
          <View style={[styles.quickActionsGrid, isRtl && styles.quickActionsGridRtl]}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={24} color="#ffffff" />
                </View>
                <Text style={[styles.quickActionText, { textAlign: getTextAlign(i18n.language) }]} numberOfLines={2}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={[
        styles.header,
        {
          padding: responsiveStyles.padding.horizontal,
        }
      ]}>
        <Text style={[
          styles.welcomeText,
          {
            textAlign: getTextAlign(i18n.language),
            fontSize: scale.font(isTablet ? 28 : 24),
            marginBottom: scale.height(4),
          }
        ]}>
          {t('dashboard.welcome')}, {user?.full_name}
        </Text>
        <Text style={[
          styles.roleText,
          {
            textAlign: getTextAlign(i18n.language),
            fontSize: scale.font(16),
          }
        ]}>
          {user?.role && getRoleDisplayName(user.role, i18n.language as 'ar' | 'en')}
        </Text>
      </View>

      {/* Statistics Cards */}
      <View style={[
        styles.statsContainer,
        {
          padding: responsiveStyles.padding.horizontal,
          flexDirection: isTablet ? 'row' : 'column',
          flexWrap: isTablet ? 'wrap' : 'nowrap',
          justifyContent: isTablet ? 'space-between' : 'flex-start',
        }
      ]}>
        {stats.map(renderStatCard)}
      </View>

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Recent Activity */}
      {renderRecentActivity()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#333',
  },
  roleText: {
    color: '#667eea',
    fontWeight: '500',
  },
  statsContainer: {
    // Dynamic styling handled in component
  },
  statCardContainer: {
    // Dynamic sizing handled in component
  },
  statCard: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCardContentRtl: {
    flexDirection: 'row-reverse',
  },
  statCardIcon: {
    marginRight: 12,
  },
  statCardText: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statCardTitle: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionsContainerRtl: {
    flexDirection: 'row-reverse',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionsGridRtl: {
    flexDirection: 'row-reverse',
  },
  quickActionButton: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  activityItemRtl: {
    flexDirection: 'row-reverse',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default DashboardScreen;
