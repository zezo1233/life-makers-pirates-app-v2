import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface StatusItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  contentType: 'text' | 'image' | 'video';
  contentUrl?: string;
  thumbnailUrl?: string;
  textContent?: string;
  backgroundColor?: string;
  timestamp: string;
  isViewed: boolean;
  viewCount: number;
  isMyStatus: boolean;
}

interface StatusGroup {
  type: 'my_status' | 'recent' | 'viewed';
  title: string;
  data: StatusItem[];
}

interface WhatsAppStatusListProps {
  onStatusPress: (statusList: StatusItem[], index: number) => void;
  onCreateStatus: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const WhatsAppStatusList: React.FC<WhatsAppStatusListProps> = ({
  onStatusPress,
  onCreateStatus,
  onRefresh,
  refreshing = false,
}) => {
  const { t, i18n } = useTranslation();
  const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const isRtl = isRTL(i18n.language);

  // Mock data - في التطبيق الحقيقي، ستأتي من API
  const mockStatusData: StatusItem[] = [
    {
      id: '1',
      userId: 'user1',
      userName: 'أحمد محمد',
      userAvatar: 'https://via.placeholder.com/50',
      contentType: 'text',
      textContent: 'مرحباً بكم في نظام التدريب الجديد! 🎉',
      backgroundColor: '#25D366',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      isViewed: false,
      viewCount: 15,
      isMyStatus: true,
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'فاطمة علي',
      userAvatar: 'https://via.placeholder.com/50',
      contentType: 'image',
      contentUrl: 'https://via.placeholder.com/300x400',
      thumbnailUrl: 'https://via.placeholder.com/50',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      isViewed: false,
      viewCount: 8,
      isMyStatus: false,
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'محمد حسن',
      userAvatar: 'https://via.placeholder.com/50',
      contentType: 'text',
      textContent: 'التدريب اليوم كان رائعاً! شكراً للجميع 💪',
      backgroundColor: '#9C27B0',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      isViewed: true,
      viewCount: 12,
      isMyStatus: false,
    },
    {
      id: '4',
      userId: 'user4',
      userName: 'سارة أحمد',
      userAvatar: 'https://via.placeholder.com/50',
      contentType: 'video',
      contentUrl: 'https://via.placeholder.com/300x400',
      thumbnailUrl: 'https://via.placeholder.com/50',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      isViewed: true,
      viewCount: 20,
      isMyStatus: false,
    },
  ];

  useEffect(() => {
    loadStatusData();
  }, []);

  const loadStatusData = () => {
    // تجميع الحالات حسب النوع
    const myStatus = mockStatusData.filter(status => status.isMyStatus);
    const recentStatuses = mockStatusData.filter(status => !status.isMyStatus && !status.isViewed);
    const viewedStatuses = mockStatusData.filter(status => !status.isMyStatus && status.isViewed);

    const groups: StatusGroup[] = [];

    if (myStatus.length > 0) {
      groups.push({
        type: 'my_status',
        title: t('status.myStatus'),
        data: myStatus,
      });
    }

    if (recentStatuses.length > 0) {
      groups.push({
        type: 'recent',
        title: t('status.recentUpdates'),
        data: recentStatuses,
      });
    }

    if (viewedStatuses.length > 0) {
      groups.push({
        type: 'viewed',
        title: t('status.viewedUpdates'),
        data: viewedStatuses,
      });
    }

    setStatusGroups(groups);
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return t('status.justNow');
    } else if (diffInHours < 24) {
      return t('status.hoursAgo', { hours: diffInHours });
    } else {
      return t('status.yesterday');
    }
  };

  const renderStatusItem = ({ item }: { item: StatusItem }) => {
    const handlePress = () => {
      if (item.isMyStatus) {
        // عرض إحصائيات حالتي
        // TODO: إضافة شاشة إحصائيات الحالة
        return;
      }
      
      // العثور على جميع الحالات للمستخدم
      const userStatuses = mockStatusData.filter(status => status.userId === item.userId);
      const currentIndex = userStatuses.findIndex(status => status.id === item.id);
      onStatusPress(userStatuses, currentIndex);
    };

    return (
      <TouchableOpacity style={styles.statusItem} onPress={handlePress}>
        <View style={styles.statusAvatarContainer}>
          {/* حلقة الحالة */}
          <View style={[
            styles.statusRing,
            item.isViewed ? styles.viewedStatusRing : styles.unviewedStatusRing
          ]}>
            {item.userAvatar ? (
              <Image source={{ uri: item.userAvatar }} style={styles.statusAvatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={24} color="#25D366" />
              </View>
            )}
          </View>
          
          {/* مؤشر نوع المحتوى */}
          <View style={styles.contentTypeIndicator}>
            <Ionicons 
              name={
                item.contentType === 'text' ? 'text' :
                item.contentType === 'image' ? 'image' : 'videocam'
              } 
              size={12} 
              color="#ffffff" 
            />
          </View>
        </View>

        <View style={styles.statusInfo}>
          <Text style={[
            styles.statusUserName,
            { textAlign: getTextAlign(i18n.language) }
          ]}>
            {item.userName}
          </Text>
          
          <Text style={[
            styles.statusTime,
            { textAlign: getTextAlign(i18n.language) }
          ]}>
            {formatTime(item.timestamp)}
          </Text>
          
          {item.isMyStatus && (
            <Text style={[
              styles.statusViews,
              { textAlign: getTextAlign(i18n.language) }
            ]}>
              {t('status.viewsCount', { count: item.viewCount })}
            </Text>
          )}
        </View>

        {/* معاينة المحتوى */}
        <View style={styles.statusPreview}>
          {item.contentType === 'text' ? (
            <View style={[
              styles.textPreview,
              { backgroundColor: item.backgroundColor || '#25D366' }
            ]}>
              <Text style={styles.textPreviewContent} numberOfLines={2}>
                {item.textContent}
              </Text>
            </View>
          ) : (
            <Image 
              source={{ uri: item.thumbnailUrl || item.contentUrl }} 
              style={styles.mediaPreview}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyStatusButton = () => (
    <TouchableOpacity style={styles.myStatusButton} onPress={onCreateStatus}>
      <View style={styles.addStatusContainer}>
        <View style={styles.addStatusRing}>
          <View style={styles.addStatusAvatar}>
            <Ionicons name="person" size={24} color="#25D366" />
          </View>
        </View>
        <View style={styles.addStatusIcon}>
          <Ionicons name="add" size={16} color="#ffffff" />
        </View>
      </View>

      <View style={styles.statusInfo}>
        <Text style={[
          styles.statusUserName,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {t('status.myStatus')}
        </Text>
        <Text style={[
          styles.statusTime,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {t('status.tapToAddStatus')}
        </Text>
      </View>

      <View style={styles.statusPreview}>
        <View style={styles.addStatusPreview}>
          <Ionicons name="add" size={20} color="#25D366" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: StatusGroup }) => (
    <View style={styles.sectionHeader}>
      <Text style={[
        styles.sectionTitle,
        { textAlign: getTextAlign(i18n.language) }
      ]}>
        {section.title}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="radio" size={64} color="#E5E5EA" />
      <Text style={styles.emptyTitle}>{t('status.noStatusUpdates')}</Text>
      <Text style={styles.emptySubtitle}>{t('status.noStatusDesc')}</Text>
      <TouchableOpacity style={styles.createFirstStatusButton} onPress={onCreateStatus}>
        <Text style={styles.createFirstStatusText}>{t('status.createFirstStatus')}</Text>
      </TouchableOpacity>
    </View>
  );

  // تحويل البيانات لـ SectionList format
  const sectionData = statusGroups.map(group => ({
    title: group.title,
    data: group.data,
    type: group.type,
  }));

  // إضافة زر "حالتي" في البداية إذا لم تكن موجودة
  const hasMyStatus = statusGroups.some(group => group.type === 'my_status');
  if (!hasMyStatus) {
    sectionData.unshift({
      title: t('status.myStatus'),
      data: [{ isAddButton: true } as any],
      type: 'my_status',
    });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={mockStatusData}
        renderItem={({ item, index }) => {
          // عرض زر "حالتي" في البداية
          if (index === 0 && !hasMyStatus) {
            return (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('status.myStatus')}</Text>
                </View>
                {renderMyStatusButton()}
                {statusGroups.length > 0 && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{statusGroups[0].title}</Text>
                  </View>
                )}
                {renderStatusItem({ item })}
              </View>
            );
          }
          
          return renderStatusItem({ item });
        }}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#25D366']}
            tintColor="#25D366"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={mockStatusData.length === 0 ? styles.emptyListContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8696A0',
    textTransform: 'uppercase',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  myStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  statusAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  addStatusContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statusRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unviewedStatusRing: {
    backgroundColor: '#25D366',
  },
  viewedStatusRing: {
    backgroundColor: '#E5E5EA',
  },
  addStatusRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  addStatusAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTypeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  addStatusIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statusInfo: {
    flex: 1,
    marginRight: 12,
  },
  statusUserName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 12,
    color: '#8696A0',
    marginBottom: 2,
  },
  statusViews: {
    fontSize: 12,
    color: '#25D366',
  },
  statusPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  textPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  textPreviewContent: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  addStatusPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8696A0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createFirstStatusButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default WhatsAppStatusList;
