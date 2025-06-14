import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ChatMessage, User } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppChatAnalyticsProps {
  visible: boolean;
  chatRoomId: string;
  messages: ChatMessage[];
  members: User[];
  onClose: () => void;
}

interface ChatStats {
  totalMessages: number;
  totalWords: number;
  totalCharacters: number;
  messagesByType: {
    text: number;
    image: number;
    file: number;
    voice: number;
  };
  messagesByDay: { [key: string]: number };
  messagesByHour: { [key: string]: number };
  topSenders: { user: User; count: number }[];
  averageMessageLength: number;
  mostActiveDay: string;
  mostActiveHour: string;
  firstMessage: ChatMessage | null;
  lastMessage: ChatMessage | null;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppChatAnalytics: React.FC<WhatsAppChatAnalyticsProps> = ({
  visible,
  chatRoomId,
  messages,
  members,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'activity' | 'members'>('overview');
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (visible && messages.length > 0) {
      calculateStats();
    }
  }, [visible, messages]);

  const calculateStats = () => {
    const messagesByType = { text: 0, image: 0, file: 0, voice: 0 };
    const messagesByDay: { [key: string]: number } = {};
    const messagesByHour: { [key: string]: number } = {};
    const senderCounts: { [key: string]: number } = {};
    
    let totalWords = 0;
    let totalCharacters = 0;

    messages.forEach((message) => {
      // Count by type
      messagesByType[message.message_type as keyof typeof messagesByType]++;

      // Count by day
      const date = new Date(message.created_at);
      const dayKey = date.toLocaleDateString();
      messagesByDay[dayKey] = (messagesByDay[dayKey] || 0) + 1;

      // Count by hour
      const hourKey = date.getHours().toString();
      messagesByHour[hourKey] = (messagesByHour[hourKey] || 0) + 1;

      // Count by sender
      senderCounts[message.sender_id] = (senderCounts[message.sender_id] || 0) + 1;

      // Count words and characters for text messages
      if (message.message_type === 'text' && message.content) {
        const words = message.content.trim().split(/\s+/).length;
        totalWords += words;
        totalCharacters += message.content.length;
      }
    });

    // Find most active day and hour
    const mostActiveDay = Object.keys(messagesByDay).reduce((a, b) => 
      messagesByDay[a] > messagesByDay[b] ? a : b
    );
    const mostActiveHour = Object.keys(messagesByHour).reduce((a, b) => 
      messagesByHour[a] > messagesByHour[b] ? a : b
    );

    // Top senders
    const topSenders = Object.entries(senderCounts)
      .map(([userId, count]) => ({
        user: members.find(m => m.id === userId) || { id: userId, full_name: 'Unknown' } as User,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const calculatedStats: ChatStats = {
      totalMessages: messages.length,
      totalWords,
      totalCharacters,
      messagesByType,
      messagesByDay,
      messagesByHour,
      topSenders,
      averageMessageLength: totalCharacters / messages.filter(m => m.message_type === 'text').length || 0,
      mostActiveDay,
      mostActiveHour,
      firstMessage: messages[messages.length - 1] || null,
      lastMessage: messages[0] || null,
    };

    setStats(calculatedStats);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatHour = (hour: string): string => {
    const hourNum = parseInt(hour);
    return `${hourNum.toString().padStart(2, '0')}:00`;
  };

  const renderOverviewTab = () => {
    if (!stats) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Total Messages */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="chatbubbles" size={24} color="#25D366" />
            <Text style={styles.statTitle}>{t('analytics.totalMessages')}</Text>
          </View>
          <Text style={styles.statValue}>{stats.totalMessages.toLocaleString()}</Text>
        </View>

        {/* Message Types */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>{t('analytics.messageTypes')}</Text>
          <View style={styles.typeStats}>
            <View style={styles.typeItem}>
              <Ionicons name="chatbubble" size={20} color="#2196F3" />
              <Text style={styles.typeLabel}>{t('chat.text')}</Text>
              <Text style={styles.typeValue}>{stats.messagesByType.text}</Text>
            </View>
            <View style={styles.typeItem}>
              <Ionicons name="image" size={20} color="#9C27B0" />
              <Text style={styles.typeLabel}>{t('chat.image')}</Text>
              <Text style={styles.typeValue}>{stats.messagesByType.image}</Text>
            </View>
            <View style={styles.typeItem}>
              <Ionicons name="document" size={20} color="#FF9800" />
              <Text style={styles.typeLabel}>{t('chat.file')}</Text>
              <Text style={styles.typeValue}>{stats.messagesByType.file}</Text>
            </View>
            <View style={styles.typeItem}>
              <Ionicons name="mic" size={20} color="#4CAF50" />
              <Text style={styles.typeLabel}>{t('chat.voice')}</Text>
              <Text style={styles.typeValue}>{stats.messagesByType.voice}</Text>
            </View>
          </View>
        </View>

        {/* Text Statistics */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>{t('analytics.textStats')}</Text>
          <View style={styles.textStats}>
            <View style={styles.textStatItem}>
              <Text style={styles.textStatLabel}>{t('analytics.totalWords')}</Text>
              <Text style={styles.textStatValue}>{stats.totalWords.toLocaleString()}</Text>
            </View>
            <View style={styles.textStatItem}>
              <Text style={styles.textStatLabel}>{t('analytics.totalCharacters')}</Text>
              <Text style={styles.textStatValue}>{stats.totalCharacters.toLocaleString()}</Text>
            </View>
            <View style={styles.textStatItem}>
              <Text style={styles.textStatLabel}>{t('analytics.avgMessageLength')}</Text>
              <Text style={styles.textStatValue}>{Math.round(stats.averageMessageLength)}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>{t('analytics.timeline')}</Text>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>{t('analytics.firstMessage')}</Text>
            <Text style={styles.timelineValue}>
              {stats.firstMessage ? formatDate(stats.firstMessage.created_at) : '-'}
            </Text>
          </View>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>{t('analytics.lastMessage')}</Text>
            <Text style={styles.timelineValue}>
              {stats.lastMessage ? formatDate(stats.lastMessage.created_at) : '-'}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderActivityTab = () => {
    if (!stats) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Most Active Times */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>{t('analytics.mostActiveTimes')}</Text>
          <View style={styles.activeTimeItem}>
            <Ionicons name="calendar" size={20} color="#25D366" />
            <Text style={styles.activeTimeLabel}>{t('analytics.mostActiveDay')}</Text>
            <Text style={styles.activeTimeValue}>{stats.mostActiveDay}</Text>
          </View>
          <View style={styles.activeTimeItem}>
            <Ionicons name="time" size={20} color="#25D366" />
            <Text style={styles.activeTimeLabel}>{t('analytics.mostActiveHour')}</Text>
            <Text style={styles.activeTimeValue}>{formatHour(stats.mostActiveHour)}</Text>
          </View>
        </View>

        {/* Daily Activity */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>{t('analytics.dailyActivity')}</Text>
          <View style={styles.activityChart}>
            {Object.entries(stats.messagesByDay)
              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
              .slice(-7)
              .map(([date, count]) => (
                <View key={date} style={styles.chartBar}>
                  <View 
                    style={[
                      styles.bar, 
                      { height: Math.max(4, (count / Math.max(...Object.values(stats.messagesByDay))) * 60) }
                    ]} 
                  />
                  <Text style={styles.chartLabel}>
                    {new Date(date).toLocaleDateString('en', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.chartValue}>{count}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Hourly Activity */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>{t('analytics.hourlyActivity')}</Text>
          <View style={styles.activityChart}>
            {Array.from({ length: 24 }, (_, i) => i.toString()).map((hour) => {
              const count = stats.messagesByHour[hour] || 0;
              return (
                <View key={hour} style={styles.chartBar}>
                  <View 
                    style={[
                      styles.bar, 
                      { height: Math.max(2, (count / Math.max(...Object.values(stats.messagesByHour), 1)) * 40) }
                    ]} 
                  />
                  <Text style={styles.chartLabel}>{hour}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderMembersTab = () => {
    if (!stats) return null;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Top Senders */}
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>{t('analytics.topSenders')}</Text>
          {stats.topSenders.map((sender, index) => (
            <View key={sender.user.id} style={styles.senderItem}>
              <View style={styles.senderRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.senderAvatar}>
                <Ionicons name="person" size={20} color="#25D366" />
              </View>
              <View style={styles.senderInfo}>
                <Text style={styles.senderName}>{sender.user.full_name}</Text>
                <Text style={styles.senderCount}>
                  {sender.count} {t('analytics.messages')}
                </Text>
              </View>
              <View style={styles.senderPercentage}>
                <Text style={styles.percentageText}>
                  {Math.round((sender.count / stats.totalMessages) * 100)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'activity':
        return renderActivityTab();
      case 'members':
        return renderMembersTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {t('analytics.chatAnalytics')}
          </Text>
          
          <View style={styles.headerButton} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
              {t('analytics.overview')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'activity' && styles.activeTab]}
            onPress={() => setSelectedTab('activity')}
          >
            <Text style={[styles.tabText, selectedTab === 'activity' && styles.activeTabText]}>
              {t('analytics.activity')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'members' && styles.activeTab]}
            onPress={() => setSelectedTab('members')}
          >
            <Text style={[styles.tabText, selectedTab === 'members' && styles.activeTabText]}>
              {t('analytics.members')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {renderTabContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#25D366',
  },
  tabText: {
    fontSize: 14,
    color: '#8696A0',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#25D366',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#25D366',
  },
  typeStats: {
    marginTop: 12,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  typeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
  },
  textStats: {
    marginTop: 12,
  },
  textStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  textStatLabel: {
    fontSize: 14,
    color: '#8696A0',
  },
  textStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#8696A0',
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  activeTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTimeLabel: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  activeTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
  },
  activityChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    height: 80,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    backgroundColor: '#25D366',
    width: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: '#8696A0',
    marginTop: 4,
  },
  chartValue: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '500',
  },
  senderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  senderRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  senderCount: {
    fontSize: 12,
    color: '#8696A0',
  },
  senderPercentage: {
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
  },
});

export default WhatsAppChatAnalytics;
