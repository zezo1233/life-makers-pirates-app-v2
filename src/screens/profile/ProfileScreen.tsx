import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useAuthStore } from '../../store/authStore';
import { canManageUsers } from '../../store/userManagementStore';
import { UserRole } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

const ProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user, logout, isLoading } = useAuthStore();
  
  const [refreshing, setRefreshing] = useState(false);
  
  const isRtl = isRTL(i18n.language);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('profile.confirmLogout'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Toast.show({
                type: 'success',
                text1: t('auth.logoutSuccess'),
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('common.error'),
                text2: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          },
        },
      ]
    );
  };

  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile' as never);
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings' as never);
  };

  const navigateToUserManagement = () => {
    navigation.navigate('UserManagement' as never);
  };

  const getRoleDisplayName = (role: UserRole): string => {
    const roleNames = {
      en: {
        DV: 'Provincial Development Officer',
        CC: 'Development Management Officer',
        PM: 'Trainer Preparation Project Manager',
        SV: 'Program Supervisor',
        TR: 'Trainer',
        MB: 'Board Member',
      },
      ar: {
        DV: 'مسؤول تنمية المحافظة',
        CC: 'مسؤول إدارة التنمية',
        PM: 'مسؤول مشروع إعداد المدربين',
        SV: 'المتابع',
        TR: 'المدرب',
        MB: 'عضو مجلس الإدارة',
      },
    };

    return roleNames[i18n.language as keyof typeof roleNames]?.[role] || role;
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-outline" size={64} color="#ccc" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.headerGradient}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#ffffff" />
              </View>
            )}
          </View>

          <View style={[styles.userInfo, isRtl && styles.userInfoRtl]}>
            <Text style={[styles.userName, { textAlign: getTextAlign(i18n.language) }]}>
              {user?.full_name}
            </Text>
            <Text style={[styles.userRole, { textAlign: getTextAlign(i18n.language) }]}>
              {user?.role && getRoleDisplayName(user.role)}
            </Text>
            <Text style={[styles.userEmail, { textAlign: getTextAlign(i18n.language) }]}>
              {user?.email}
            </Text>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={navigateToEditProfile}>
            <Ionicons name="create-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('profile.statistics')}
        </Text>
        
        <View style={[styles.statsContainer, isRtl && styles.statsContainerRtl]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.total_training_hours || 0}</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.totalHours')}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.rating')}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={[styles.statLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.completedTrainings')}
            </Text>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('profile.personalInfo')}
        </Text>
        
        <View style={styles.infoContainer}>
          <View style={[styles.infoItem, isRtl && styles.infoItemRtl]}>
            <Ionicons name="location-outline" size={20} color="#667eea" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('auth.province')}
              </Text>
              <Text style={[styles.infoValue, { textAlign: getTextAlign(i18n.language) }]}>
                {user?.province}
              </Text>
            </View>
          </View>

          {user?.specialization && (
            <View style={[styles.infoItem, isRtl && styles.infoItemRtl]}>
              <Ionicons name="school-outline" size={20} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('auth.specialization')}
                </Text>
                <Text style={[styles.infoValue, { textAlign: getTextAlign(i18n.language) }]}>
                  {user.specialization}
                </Text>
              </View>
            </View>
          )}

          {user?.phone && (
            <View style={[styles.infoItem, isRtl && styles.infoItemRtl]}>
              <Ionicons name="call-outline" size={20} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('auth.phone')}
                </Text>
                <Text style={[styles.infoValue, { textAlign: getTextAlign(i18n.language) }]}>
                  {user.phone}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.infoItem, isRtl && styles.infoItemRtl]}>
            <Ionicons name="calendar-outline" size={20} color="#667eea" />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('profile.memberSince')}
              </Text>
              <Text style={[styles.infoValue, { textAlign: getTextAlign(i18n.language) }]}>
                {user?.created_at && new Date(user.created_at).toLocaleDateString(
                  isRtl ? 'ar-SA' : 'en-US',
                  { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }
                )}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Menu Card */}
      <View style={styles.menuCard}>
        <TouchableOpacity 
          style={[styles.menuItem, isRtl && styles.menuItemRtl]} 
          onPress={navigateToEditProfile}
        >
          <View style={[styles.menuItemLeft, isRtl && styles.menuItemLeftRtl]}>
            <Ionicons name="create-outline" size={24} color="#667eea" />
            <Text style={[styles.menuItemText, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.editProfile')}
            </Text>
          </View>
          <Ionicons 
            name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"} 
            size={20} 
            color="#ccc" 
          />
        </TouchableOpacity>

        {/* User Management - Only for Project Managers */}
        {user?.role && canManageUsers(user.role) && (
          <TouchableOpacity
            style={[styles.menuItem, isRtl && styles.menuItemRtl]}
            onPress={navigateToUserManagement}
          >
            <View style={[styles.menuItemLeft, isRtl && styles.menuItemLeftRtl]}>
              <Ionicons name="people-outline" size={24} color="#667eea" />
              <Text style={[styles.menuItemText, { textAlign: getTextAlign(i18n.language) }]}>
                {t('profile.userManagement')}
              </Text>
            </View>
            <Ionicons
              name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"}
              size={20}
              color="#ccc"
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.menuItem, isRtl && styles.menuItemRtl]}
          onPress={navigateToSettings}
        >
          <View style={[styles.menuItemLeft, isRtl && styles.menuItemLeftRtl]}>
            <Ionicons name="settings-outline" size={24} color="#667eea" />
            <Text style={[styles.menuItemText, { textAlign: getTextAlign(i18n.language) }]}>
              {t('settings.title')}
            </Text>
          </View>
          <Ionicons
            name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"}
            size={20}
            color="#ccc"
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutItem, isRtl && styles.menuItemRtl]} 
          onPress={handleLogout}
          disabled={isLoading}
        >
          <View style={[styles.menuItemLeft, isRtl && styles.menuItemLeftRtl]}>
            <Ionicons name="log-out-outline" size={24} color="#dc3545" />
            <Text style={[styles.menuItemText, styles.logoutText, { textAlign: getTextAlign(i18n.language) }]}>
              {isLoading ? t('common.loading') : t('auth.logout')}
            </Text>
          </View>
          <Ionicons 
            name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"} 
            size={20} 
            color="#dc3545" 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer} />
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
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userInfoRtl: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsContainerRtl: {
    flexDirection: 'row-reverse',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
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
    marginBottom: 20,
  },
  infoContainer: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItemRtl: {
    flexDirection: 'row-reverse',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemRtl: {
    flexDirection: 'row-reverse',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemLeftRtl: {
    flexDirection: 'row-reverse',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#dc3545',
  },
  footer: {
    height: 40,
  },
});

export default ProfileScreen;
