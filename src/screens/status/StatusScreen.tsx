import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import WhatsAppStatusList from '../../components/chat/WhatsAppStatusList';
import WhatsAppStatusViewer from '../../components/chat/WhatsAppStatusViewer';
import WhatsAppStatusCreator from '../../components/chat/WhatsAppStatusCreator';
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

const StatusScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [selectedStatusList, setSelectedStatusList] = useState<StatusItem[]>([]);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    // تحديث الحالات عند فتح الشاشة
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      // TODO: تحميل الحالات من API
      console.log('Loading statuses...');
    } catch (error) {
      console.error('Error loading statuses:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('status.errorLoadingStatuses'),
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatuses();
    setRefreshing(false);
  };

  const handleStatusPress = (statusList: StatusItem[], index: number) => {
    setSelectedStatusList(statusList);
    setSelectedStatusIndex(index);
    setShowStatusViewer(true);
  };

  const handleCreateStatus = () => {
    setShowStatusCreator(true);
  };

  const handleStatusCreated = async (statusData: any) => {
    try {
      // TODO: إرسال الحالة إلى API
      console.log('Creating status:', statusData);
      
      Toast.show({
        type: 'success',
        text1: t('status.statusCreated'),
        text2: t('status.statusCreatedDesc'),
      });

      // تحديث قائمة الحالات
      await loadStatuses();
    } catch (error) {
      console.error('Error creating status:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('status.errorCreatingStatus'),
      });
    }
  };

  const handleStatusChange = (index: number) => {
    setSelectedStatusIndex(index);
  };

  const handleStatusLike = (statusId: string) => {
    // TODO: إضافة إعجاب للحالة
    console.log('Liking status:', statusId);
  };

  const handleStatusReply = (statusId: string, reply: string) => {
    // TODO: إضافة رد على الحالة
    console.log('Replying to status:', statusId, reply);
    Toast.show({
      type: 'success',
      text1: t('status.replyAdded'),
    });
  };

  const handleStatusShare = (statusId: string) => {
    // TODO: مشاركة الحالة
    Alert.alert(
      t('status.shareStatus'),
      t('status.shareStatusDesc'),
      [
        {
          text: t('status.shareToChat'),
          onPress: () => {
            Toast.show({
              type: 'info',
              text1: t('status.shareFeatureComingSoon'),
            });
          },
        },
        {
          text: t('status.copyLink'),
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: t('status.linkCopied'),
            });
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const handleCameraPress = () => {
    Alert.alert(
      t('status.quickStatus'),
      t('status.selectQuickOption'),
      [
        {
          text: t('status.takePhoto'),
          onPress: () => {
            // TODO: فتح الكاميرا
            Toast.show({
              type: 'info',
              text1: t('status.cameraFeatureComingSoon'),
            });
          },
        },
        {
          text: t('status.recordVideo'),
          onPress: () => {
            // TODO: تسجيل فيديو
            Toast.show({
              type: 'info',
              text1: t('status.videoFeatureComingSoon'),
            });
          },
        },
        {
          text: t('status.textStatus'),
          onPress: handleCreateStatus,
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#25D366" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{t('status.status')}</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCameraPress}>
            <Ionicons name="camera" size={22} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status List */}
      <WhatsAppStatusList
        onStatusPress={handleStatusPress}
        onCreateStatus={handleCreateStatus}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateStatus}>
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Status Viewer */}
      <WhatsAppStatusViewer
        visible={showStatusViewer}
        statusList={selectedStatusList}
        initialIndex={selectedStatusIndex}
        onClose={() => setShowStatusViewer(false)}
        onStatusChange={handleStatusChange}
        onLike={handleStatusLike}
        onReply={handleStatusReply}
        onShare={handleStatusShare}
      />

      {/* Status Creator */}
      <WhatsAppStatusCreator
        visible={showStatusCreator}
        onClose={() => setShowStatusCreator(false)}
        onCreateStatus={handleStatusCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default StatusScreen;
