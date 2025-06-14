import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ChatRoom } from '../../types';
import { ChatStackParamList } from '../../navigation/ChatNavigator';
import { isRTL, getTextAlign } from '../../i18n';
import { supabase } from '../../config/supabase';

// Import new WhatsApp-style components
import WhatsAppChatItem from '../../components/chat/WhatsAppChatItem';
import ChatSearchBar from '../../components/chat/ChatSearchBar';
import ChatPermissionService from '../../services/ChatPermissionService';

type ChatListNavigationProp = StackNavigationProp<ChatStackParamList, 'ChatList'>;

const ChatListScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<ChatListNavigationProp>();

  const {
    chatRooms,
    isLoading,
    error,
    fetchChatRooms,
    createChatRoom,
    getUnreadCount,
    subscribeToRooms,
    clearError
  } = useChatStore();

  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredChats, setFilteredChats] = useState<ChatRoom[]>([]);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadChatRooms();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = subscribeToRooms();
      return unsubscribe;
    }, [])
  );

  const loadChatRooms = async () => {
    try {
      await fetchChatRooms();

      // إذا لم توجد محادثات، أضف محادثات افتراضية
      if (chatRooms.length === 0) {
        createDefaultChats();
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.loadFailed'),
      });
    }
  };

  const createDefaultChats = async () => {
    // إنشاء المحادثات الجماعية الحقيقية
    await createGroupChats();

    // إعداد محادثات المستخدم حسب الصلاحيات
    if (user) {
      await ChatPermissionService.setupUserChats({
        id: user.id,
        full_name: user.full_name || user.email,
        role: user.role,
        specialization: user.specialization
      });
    }
  };

  const createGroupChats = async () => {
    try {
      console.log('🔄 بدء إنشاء المحادثات الجماعية حسب المواصفات الجديدة...');

      // 🔊 1. إنشاء المجموعة العامة للإعلانات (قراءة فقط)
      await createAnnouncementGroup();

      // 🛠 2. إنشاء مجموعة التنسيق الإداري
      await createCoordinationGroup();

      // 🧑‍🏫 3. إنشاء مجموعة فريق التدريب
      await createTrainingTeamGroup();

      console.log('✅ تم إنشاء جميع المحادثات الجماعية بنجاح');

      // إعادة تحميل المحادثات لعرض الجديدة
      await fetchChatRooms();

      Toast.show({
        type: 'success',
        text1: t('chat.groupChatsCreated'),
        text2: t('chat.groupChatsCreatedDesc'),
      });

    } catch (error) {
      console.error('❌ خطأ في إنشاء المحادثات الجماعية:', error);
      Toast.show({
        type: 'error',
        text1: t('errors.createChatFailed'),
        text2: error?.message || 'خطأ غير معروف',
      });
    }
  };

  // فحص صلاحية إنشاء المحادثات
  const canCreateChats = (userRole: string | undefined): boolean => {
    return ['MB', 'PM', 'CC'].includes(userRole || '');
  };

  // 🔊 إنشاء المجموعة العامة للإعلانات (قراءة فقط)
  const createAnnouncementGroup = async () => {
    try {
      // فحص إذا كانت المجموعة موجودة بالفعل
      const existingRoom = chatRooms.find(room =>
        room.name === 'الإعلانات الرسمية' && room.type === 'group'
      );

      if (existingRoom) {
        console.log('📋 مجموعة الإعلانات الرسمية موجودة بالفعل');
        return;
      }

      // جلب جميع المستخدمين
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) throw usersError;

      const allUserIds = allUsers?.map(user => user.id) || [];

      // إنشاء مجموعة الإعلانات الرسمية
      await createChatRoom(
        'الإعلانات الرسمية',
        'group',
        allUserIds,
        'إعلانات رسمية لجميع المستخدمين - قراءة فقط'
      );

      console.log('✅ تم إنشاء مجموعة الإعلانات الرسمية');
    } catch (error) {
      console.error('❌ خطأ في إنشاء مجموعة الإعلانات:', error);
      throw error;
    }
  };

  // 🛠 إنشاء مجموعة التنسيق الإداري (CC + MB + جميع DV)
  const createCoordinationGroup = async () => {
    try {
      // فحص إذا كانت المجموعة موجودة بالفعل
      const existingRoom = chatRooms.find(room =>
        room.name === 'تنسيق التنمية' && room.type === 'group'
      );

      if (existingRoom) {
        console.log('📋 مجموعة تنسيق التنمية موجودة بالفعل');
        return;
      }

      // جلب المستخدمين المطلوبين (CC + MB + DV)
      const { data: coordinationUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .in('role', ['CC', 'MB', 'DV']);

      if (usersError) throw usersError;

      const coordinationUserIds = coordinationUsers?.map(user => user.id) || [];

      // إنشاء مجموعة التنسيق الإداري
      await createChatRoom(
        'تنسيق التنمية',
        'group',
        coordinationUserIds,
        'تنسيق إداري بين مسؤولي التنمية والإدارة المركزية'
      );

      console.log('✅ تم إنشاء مجموعة تنسيق التنمية');
    } catch (error) {
      console.error('❌ خطأ في إنشاء مجموعة التنسيق:', error);
      throw error;
    }
  };

  // 🧑‍🏫 إنشاء مجموعة فريق التدريب (TR + SV + PM + MB)
  const createTrainingTeamGroup = async () => {
    try {
      // فحص إذا كانت المجموعة موجودة بالفعل
      const existingRoom = chatRooms.find(room =>
        room.name === 'فريق التدريب' && room.type === 'group'
      );

      if (existingRoom) {
        console.log('📋 مجموعة فريق التدريب موجودة بالفعل');
        return;
      }

      // جلب المستخدمين المطلوبين (TR + SV + PM + MB)
      const { data: trainingUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .in('role', ['TR', 'SV', 'PM', 'MB']);

      if (usersError) throw usersError;

      const trainingUserIds = trainingUsers?.map(user => user.id) || [];

      // إنشاء مجموعة فريق التدريب
      await createChatRoom(
        'فريق التدريب',
        'group',
        trainingUserIds,
        'مجموعة المدربين والمتابعين لتنسيق التدريب'
      );

      console.log('✅ تم إنشاء مجموعة فريق التدريب');
    } catch (error) {
      console.error('❌ خطأ في إنشاء مجموعة فريق التدريب:', error);
      throw error;
    }
  };

  const getDefaultChatsForRole = (userRole: string | undefined) => {
    if (!userRole) return [];

    const defaultChats = {
      // 👑 عضو مجلس الإدارة (MB) - صلاحيات كاملة
      'MB': [
        { name: 'الإعلانات الرسمية', type: 'group', description: '🔊 إعلانات رسمية لجميع المستخدمين - يمكن الإرسال', canCreate: true, canSend: true },
        { name: 'تنسيق التنمية', type: 'group', description: '🛠 تنسيق إداري - CC + MB + جميع DV', canCreate: true, canSend: true },
        { name: 'فريق التدريب', type: 'group', description: '🧑‍🏫 مجموعة المدربين - TR + SV + PM + MB', canCreate: true, canSend: true }
      ],

      // 🎯 مسؤول المشروع (PM)
      'PM': [
        { name: 'الإعلانات الرسمية', type: 'group', description: '🔊 إعلانات رسمية - يمكن الإرسال', canCreate: false, canSend: true },
        { name: 'فريق التدريب', type: 'group', description: '🧑‍🏫 مجموعة المدربين - يمكن الإنشاء والإرسال', canCreate: true, canSend: true },
        { name: 'تنسيق التنمية', type: 'group', description: '🛠 تنسيق إداري - عضوية فقط', canCreate: false, canSend: true }
      ],

      // 📊 مسؤول إدارة التنمية (CC)
      'CC': [
        { name: 'الإعلانات الرسمية', type: 'group', description: '🔊 إعلانات رسمية - يمكن الإرسال', canCreate: false, canSend: true },
        { name: 'تنسيق التنمية', type: 'group', description: '🛠 تنسيق إداري - يمكن الإنشاء والإرسال', canCreate: true, canSend: true },
        { name: 'محادثة مباشرة مع DV', type: 'direct', description: '🟦 التواصل المباشر مع مسؤولي المحافظات', canCreate: true, specialRule: 'dv_cc_direct' }
      ],

      // 🏛️ مسؤول التنمية بالمحافظة (DV)
      'DV': [
        { name: 'الإعلانات الرسمية', type: 'group', description: '🔊 إعلانات رسمية - قراءة فقط', canCreate: false, canSend: false },
        { name: 'تنسيق التنمية', type: 'group', description: '🛠 تنسيق إداري - عضوية تلقائية', canCreate: false, canSend: true },
        { name: 'محادثة مباشرة مع CC', type: 'direct', description: '🟦 التواصل المباشر مع مسؤول إدارة التنمية', canCreate: false, specialRule: 'dv_cc_direct' }
      ],

      // 👥 المتابع (SV)
      'SV': [
        { name: 'الإعلانات الرسمية', type: 'group', description: '🔊 إعلانات رسمية - قراءة فقط', canCreate: false, canSend: false },
        { name: 'فريق التدريب', type: 'group', description: '🧑‍🏫 مجموعة المدربين - عضوية تلقائية', canCreate: false, canSend: true },
        { name: 'محادثة مباشرة مع TR', type: 'direct', description: '🟩 التواصل مع المدربين في نفس التخصص فقط', canCreate: false, specialRule: 'sv_tr_same_spec' }
      ],

      // 🎓 المدرب (TR)
      'TR': [
        { name: 'الإعلانات الرسمية', type: 'group', description: '🔊 إعلانات رسمية - قراءة فقط', canCreate: false, canSend: false },
        { name: 'فريق التدريب', type: 'group', description: '🧑‍🏫 مجموعة المدربين - عضوية تلقائية', canCreate: false, canSend: true },
        { name: 'محادثة مباشرة مع SV', type: 'direct', description: '🟩 التواصل مع المتابعين في نفس التخصص فقط', canCreate: false, specialRule: 'sv_tr_same_spec' }
      ]
    };

    return defaultChats[userRole as keyof typeof defaultChats] || [];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  // فلترة المحادثات حسب البحث
  const filterChats = (query: string) => {
    if (!query.trim()) {
      setFilteredChats(chatRooms);
      return;
    }

    const filtered = chatRooms.filter(room => {
      // البحث في اسم المحادثة
      const nameMatch = room.name.toLowerCase().includes(query.toLowerCase());

      // البحث في آخر رسالة
      const messageMatch = room.last_message?.content?.toLowerCase().includes(query.toLowerCase()) || false;

      return nameMatch || messageMatch;
    });

    setFilteredChats(filtered);
  };

  // معالجة البحث
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterChats(query);
  };

  // تحديث المحادثات المفلترة عند تغيير المحادثات
  React.useEffect(() => {
    filterChats(searchQuery);
  }, [chatRooms, searchQuery]);

  const handleChatPress = (room: ChatRoom) => {
    navigation.navigate('ChatRoom', {
      roomId: room.id,
      roomName: room.name,
    });
  };

  const handleCreateChat = () => {
    navigation.navigate('CreateChat');
  };

  const handleAIChat = () => {
    navigation.navigate('AIChat');
  };

  const handleRestrictedChat = () => {
    // عرض قواعد المحادثات
    Alert.alert(
      t('chat.chatRules'),
      getChatRulesText(),
      [{ text: t('common.understood'), style: 'default' }]
    );
  };

  const getChatRulesText = (): string => {
    const userRole = user?.role;

    let rulesText = t('chat.generalRules') + '\n\n';

    // قواعد عامة
    rulesText += '📋 ' + t('chat.generalRulesDetails') + '\n\n';

    // قواعد خاصة بالدور
    switch (userRole) {
      case 'MB':
        rulesText += '👑 ' + t('chat.mbRules');
        break;
      case 'PM':
        rulesText += '🎯 ' + t('chat.pmRules');
        break;
      case 'CC':
        rulesText += '📊 ' + t('chat.ccRules');
        break;
      case 'DV':
        rulesText += '🏛️ ' + t('chat.dvRules');
        break;
      case 'SV':
        rulesText += '👥 ' + t('chat.svRules');
        break;
      case 'TR':
        rulesText += '🎓 ' + t('chat.trRules');
        break;
      default:
        rulesText += '❓ ' + t('chat.defaultRules');
    }

    return rulesText;
  };

  const handleFeedbackAnalysis = () => {
    navigation.navigate('FeedbackAnalysis');
  };

  const formatLastMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US');
    }
  };

  const renderChatItem = ({ item }: { item: ChatRoom }) => {
    const unreadCount = getUnreadCount(item.id);

    return (
      <WhatsAppChatItem
        room={item}
        unreadCount={unreadCount}
        isOnline={false} // TODO: إضافة حالة الاتصال الحقيقية
        isPinned={false} // TODO: إضافة حالة التثبيت
        isMuted={false} // TODO: إضافة حالة الكتم
        onPress={() => handleChatPress(item)}
        onLongPress={() => handleChatLongPress(item)}
      />
    );
  };

  const handleChatLongPress = (room: ChatRoom) => {
    // TODO: إضافة قائمة الخيارات (تثبيت، كتم، أرشفة، حذف)
    Alert.alert(
      room.name,
      t('chat.chatOptions'),
      [
        { text: t('chat.pin'), onPress: () => console.log('Pin chat') },
        { text: t('chat.mute'), onPress: () => console.log('Mute chat') },
        { text: t('chat.archive'), onPress: () => console.log('Archive chat') },
        { text: t('chat.delete'), onPress: () => console.log('Delete chat'), style: 'destructive' },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  const renderEmptyState = () => {
    const defaultChats = getDefaultChatsForRole(user?.role);

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
        <Text style={[styles.emptyTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('chat.noChats')}
        </Text>
        <Text style={[styles.emptySubtitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('chat.startFirstChat')}
        </Text>

        {/* عرض المحادثات الافتراضية المقترحة */}
        {defaultChats.length > 0 && (
          <View style={styles.suggestedChatsContainer}>
            <Text style={[styles.suggestedTitle, { textAlign: getTextAlign(i18n.language) }]}>
              💬 {t('chat.suggestedChats')}
            </Text>
            {defaultChats.map((chat, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestedChatItem,
                  !chat.canCreate && styles.suggestedChatItemDisabled
                ]}
                onPress={() => chat.canCreate ? handleCreateSuggestedChat(chat) : handleViewOnlyChat(chat)}
              >
                <View style={styles.suggestedChatIcon}>
                  <Ionicons
                    name={chat.type === 'group' ? 'people' : 'person'}
                    size={20}
                    color={chat.canCreate ? "#667eea" : "#999"}
                  />
                </View>
                <View style={styles.suggestedChatContent}>
                  <Text style={[
                    styles.suggestedChatName,
                    { textAlign: getTextAlign(i18n.language) },
                    !chat.canCreate && styles.suggestedChatNameDisabled
                  ]}>
                    {chat.name}
                  </Text>
                  <Text style={[
                    styles.suggestedChatDesc,
                    { textAlign: getTextAlign(i18n.language) },
                    !chat.canCreate && styles.suggestedChatDescDisabled
                  ]}>
                    {chat.description}
                  </Text>
                  {!chat.canCreate && (
                    <Text style={[styles.suggestedChatNote, { textAlign: getTextAlign(i18n.language) }]}>
                      {t('chat.viewOnlyAccess')}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name={chat.canCreate ? "add-circle-outline" : "eye-outline"}
                  size={24}
                  color={chat.canCreate ? "#667eea" : "#999"}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {canCreateChats(user?.role) && (
          <TouchableOpacity style={styles.createGroupsButton} onPress={createGroupChats}>
            <Ionicons name="people" size={20} color="#ffffff" />
            <Text style={styles.createButtonText}>{t('chat.createGroupChats')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.createButton} onPress={handleCreateChat}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>{t('chat.newMessage')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleCreateSuggestedChat = (chat: any) => {
    Alert.alert(
      t('chat.createChat'),
      t('chat.createChatConfirm', { name: chat.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.create'),
          onPress: () => {
            // هنا يمكن إضافة منطق إنشاء المحادثة
            Toast.show({
              type: 'success',
              text1: t('chat.chatCreated'),
              text2: chat.name,
            });
          }
        }
      ]
    );
  };

  const handleViewOnlyChat = (chat: any) => {
    Alert.alert(
      t('chat.viewOnlyChat'),
      t('chat.viewOnlyChatMessage', { name: chat.name }),
      [
        { text: t('common.understood'), style: 'default' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#25D366" barStyle="light-content" />
      {/* WhatsApp-style Header */}
      <View style={styles.whatsappHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('chat.messages')}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search" size={24} color="#ffffff" />
          </TouchableOpacity>

          {canCreateChats(user?.role) && (
            <TouchableOpacity style={styles.headerIconButton} onPress={handleCreateChat}>
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.headerIconButton} onPress={handleRestrictedChat}>
            <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* شريط البحث */}
      {showSearch && (
        <ChatSearchBar
          onSearch={handleSearch}
          placeholder={t('chat.searchChats')}
          autoFocus={true}
        />
      )}

      {/* Quick Actions - مبسط */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={handleAIChat}>
          <Ionicons name="sparkles" size={20} color="#25D366" />
          <Text style={styles.quickActionText}>{t('chat.aiAssistant')}</Text>
        </TouchableOpacity>

        {canCreateChats(user?.role) && (
          <TouchableOpacity style={styles.quickActionButton} onPress={createGroupChats}>
            <Ionicons name="people" size={20} color="#25D366" />
            <Text style={styles.quickActionText}>{t('chat.createGroupChats')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { textAlign: getTextAlign(i18n.language) }]}>
            {error}
          </Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close-outline" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      )}

      {/* Chat List */}
      <FlatList
        data={searchQuery ? filteredChats : chatRooms}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#25D366']}
            tintColor="#25D366"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={(searchQuery ? filteredChats : chatRooms).length === 0 ? styles.emptyListContainer : undefined}
        style={styles.chatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // WhatsApp-style Header
  whatsappHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 56,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: '#25D366',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Chat List
  chatList: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8d7da',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: '#e3f2fd',
  },
  directAvatar: {
    backgroundColor: '#f3e5f5',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    marginRight: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  noMessages: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createGroupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    marginBottom: 12,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Suggested Chats Styles
  suggestedChatsContainer: {
    width: '100%',
    marginVertical: 20,
  },
  suggestedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  suggestedChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestedChatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestedChatContent: {
    flex: 1,
  },
  suggestedChatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  suggestedChatDesc: {
    fontSize: 14,
    color: '#666',
  },
  // Disabled States
  suggestedChatItemDisabled: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
  },
  suggestedChatNameDisabled: {
    color: '#999',
  },
  suggestedChatDescDisabled: {
    color: '#bbb',
  },
  suggestedChatNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default ChatListScreen;
