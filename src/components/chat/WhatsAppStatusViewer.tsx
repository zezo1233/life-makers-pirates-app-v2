import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  Animated,
  Image,
  TextInput,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
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
  textContent?: string;
  backgroundColor?: string;
  backgroundGradient?: string[];
  musicUrl?: string;
  musicTitle?: string;
  timestamp: string;
  duration: number;
  viewCount: number;
  isViewed: boolean;
}

interface WhatsAppStatusViewerProps {
  visible: boolean;
  statusList: StatusItem[];
  initialIndex: number;
  onClose: () => void;
  onStatusChange: (index: number) => void;
  onLike: (statusId: string) => void;
  onReply: (statusId: string, reply: string) => void;
  onShare: (statusId: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppStatusViewer: React.FC<WhatsAppStatusViewerProps> = ({
  visible,
  statusList,
  initialIndex,
  onClose,
  onStatusChange,
  onLike,
  onReply,
  onShare,
}) => {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const isRtl = isRTL(i18n.language);

  const currentStatus = statusList[currentIndex];
  const statusDuration = 5000; // 5 seconds per status

  useEffect(() => {
    if (visible && currentStatus) {
      startProgressAnimation();
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, currentIndex]);

  const startProgressAnimation = () => {
    progressAnimation.setValue(0);
    if (!isPaused) {
      Animated.timing(progressAnimation, {
        toValue: 1,
        duration: statusDuration,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !isPaused) {
          goToNextStatus();
        }
      });
    }
  };

  const pauseProgress = () => {
    setIsPaused(true);
    progressAnimation.stopAnimation();
  };

  const resumeProgress = () => {
    setIsPaused(false);
    const currentProgress = progress;
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: statusDuration * (1 - currentProgress),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        goToNextStatus();
      }
    });
  };

  const goToNextStatus = () => {
    if (currentIndex < statusList.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      onStatusChange(nextIndex);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPreviousStatus = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      onStatusChange(prevIndex);
      setProgress(0);
    }
  };

  const handleGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    if (Math.abs(translationX) > 50) {
      if (translationX > 0 && !isRtl) {
        // Swipe right - previous status
        goToPreviousStatus();
      } else if (translationX < 0 && !isRtl) {
        // Swipe left - next status
        goToNextStatus();
      } else if (translationX < 0 && isRtl) {
        // RTL: Swipe left - previous status
        goToPreviousStatus();
      } else if (translationX > 0 && isRtl) {
        // RTL: Swipe right - next status
        goToNextStatus();
      }
    }
  };

  const handleTap = (event: any) => {
    const { locationX } = event.nativeEvent;
    const tapZone = screenWidth / 3;
    
    if (locationX < tapZone) {
      // Left tap - previous status
      goToPreviousStatus();
    } else if (locationX > tapZone * 2) {
      // Right tap - next status
      goToNextStatus();
    } else {
      // Center tap - pause/resume
      if (isPaused) {
        resumeProgress();
      } else {
        pauseProgress();
      }
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike(currentStatus.id);
    
    // Heart animation
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(currentStatus.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  const renderProgressBars = () => {
    return (
      <View style={styles.progressContainer}>
        {statusList.map((_, index) => (
          <View key={index} style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground} />
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: index === currentIndex 
                    ? progressAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      })
                    : index < currentIndex ? '100%' : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderStatusContent = () => {
    if (!currentStatus) return null;

    switch (currentStatus.contentType) {
      case 'text':
        return (
          <View style={[
            styles.textStatusContainer,
            { backgroundColor: currentStatus.backgroundColor || '#25D366' }
          ]}>
            <Text style={[
              styles.statusText,
              { textAlign: getTextAlign(i18n.language) }
            ]}>
              {currentStatus.textContent}
            </Text>
          </View>
        );
      
      case 'image':
        return (
          <Image
            source={{ uri: currentStatus.contentUrl }}
            style={styles.statusImage}
            resizeMode="cover"
          />
        );
      
      case 'video':
        return (
          <View style={styles.videoContainer}>
            {/* TODO: Add video player component */}
            <Text style={styles.videoPlaceholder}>
              {t('status.videoPlayer')}
            </Text>
          </View>
        );
      
      default:
        return null;
    }
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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
      
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END) {
            handleGestureEvent({ nativeEvent });
          }
        }}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnimation }]}>
          <TouchableOpacity
            style={styles.touchableArea}
            activeOpacity={1}
            onPress={handleTap}
          >
            {/* Progress Bars */}
            {renderProgressBars()}

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onClose}>
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  {currentStatus.userAvatar ? (
                    <Image source={{ uri: currentStatus.userAvatar }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={20} color="#ffffff" />
                  )}
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{currentStatus.userName}</Text>
                  <Text style={styles.statusTime}>{formatTime(currentStatus.timestamp)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.menuButton}>
                <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Status Content */}
            <View style={styles.contentContainer}>
              {renderStatusContent()}
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setShowReplyInput(true)}>
                <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
              
              <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isLiked ? "#FF6B6B" : "#ffffff"} 
                  />
                </TouchableOpacity>
              </Animated.View>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => onShare(currentStatus.id)}>
                <Ionicons name="share-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Music Info */}
            {currentStatus.musicTitle && (
              <View style={styles.musicInfo}>
                <Ionicons name="musical-notes" size={16} color="#ffffff" />
                <Text style={styles.musicTitle}>{currentStatus.musicTitle}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Reply Input */}
          {showReplyInput && (
            <View style={styles.replyContainer}>
              <TextInput
                style={[styles.replyInput, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('status.replyToStatus')}
                placeholderTextColor="#8696A0"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                autoFocus
              />
              <TouchableOpacity style={styles.sendReplyButton} onPress={handleReply}>
                <Ionicons name="send" size={20} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelReplyButton} 
                onPress={() => setShowReplyInput(false)}
              >
                <Ionicons name="close" size={20} color="#8696A0" />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  touchableArea: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 2,
    marginHorizontal: 1,
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  statusTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStatusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 32,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 32,
  },
  statusImage: {
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  videoPlaceholder: {
    fontSize: 18,
    color: '#ffffff',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingVertical: 20,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  musicTitle: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
  },
  replyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    maxHeight: 100,
    marginRight: 8,
  },
  sendReplyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 211, 102, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelReplyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WhatsAppStatusViewer;
