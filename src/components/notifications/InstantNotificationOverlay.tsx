import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';
import { Notification } from '../../store/notificationsStore';

interface InstantNotificationProps {
  notification: Notification | null;
  onPress?: () => void;
  onDismiss?: () => void;
  duration?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const InstantNotificationOverlay: React.FC<InstantNotificationProps> = ({
  notification,
  onPress,
  onDismiss,
  duration = 4000,
}) => {
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const soundRef = useRef<Audio.Sound>();

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (notification) {
      showNotification();
    } else {
      hideNotification();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [notification]);

  const showNotification = async () => {
    setVisible(true);
    
    // Play notification sound
    await playNotificationSound();
    
    // Vibrate device
    if (Platform.OS === 'ios') {
      Vibration.vibrate([0, 250, 250, 250]);
    } else {
      Vibration.vibrate(250);
    }

    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    // Auto dismiss after duration
    timeoutRef.current = setTimeout(() => {
      hideNotification();
    }, duration);
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onDismiss?.();
    });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const playNotificationSound = async () => {
    try {
      // For now, we'll skip the sound and rely on vibration
      // TODO: Add a proper notification sound file later
      console.log('Notification sound would play here');
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const handlePress = () => {
    hideNotification();
    onPress?.();
  };

  const handleDismiss = () => {
    hideNotification();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'training_request':
        return 'school-outline';
      case 'approval':
        return 'checkmark-circle-outline';
      case 'chat':
        return 'chatbubble-outline';
      case 'system':
        return 'notifications-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'training_request':
        return '#4CAF50';
      case 'approval':
        return '#2196F3';
      case 'chat':
        return '#FF9800';
      case 'system':
        return '#9C27B0';
      default:
        return '#607D8B';
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'training_request':
        return '#E8F5E8';
      case 'approval':
        return '#E3F2FD';
      case 'chat':
        return '#FFF3E0';
      case 'system':
        return '#F3E5F5';
      default:
        return '#F5F5F5';
    }
  };

  if (!visible || !notification) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.notification,
          {
            backgroundColor: getBackgroundColor(notification.type),
            borderLeftColor: getNotificationColor(notification.type),
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
          },
          isRtl && styles.notificationRtl,
        ]}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, isRtl && styles.iconContainerRtl]}>
            <Ionicons
              name={getNotificationIcon(notification.type)}
              size={24}
              color={getNotificationColor(notification.type)}
            />
          </View>

          <View style={[styles.textContainer, isRtl && styles.textContainerRtl]}>
            <Text
              style={[
                styles.title,
                { textAlign: getTextAlign(i18n.language) },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text
              style={[
                styles.message,
                { textAlign: getTextAlign(i18n.language) },
              ]}
              numberOfLines={2}
            >
              {notification.body || ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.dismissButton, isRtl && styles.dismissButtonRtl]}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Progress bar */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: getNotificationColor(notification.type),
              transform: [
                {
                  scaleX: slideAnim.interpolate({
                    inputRange: [-100, 0],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  notification: {
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  notificationRtl: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconContainerRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  textContainerRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
  },
  dismissButtonRtl: {
    // RTL specific styles if needed
  },
  progressBar: {
    height: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    transformOrigin: 'left',
  },
});

export default InstantNotificationOverlay;
