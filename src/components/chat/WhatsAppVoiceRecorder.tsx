import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanGestureHandler,
  State,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppVoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSendRecording: () => void;
  recordingDuration: number;
}

const { width: screenWidth } = Dimensions.get('window');

const WhatsAppVoiceRecorder: React.FC<WhatsAppVoiceRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSendRecording,
  recordingDuration,
}) => {
  const { t, i18n } = useTranslation();
  const [slideValue, setSlideValue] = useState(0);
  const [showCancelHint, setShowCancelHint] = useState(false);
  const isRtl = isRTL(i18n.language);

  // Animations
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      startAnimations();
    } else {
      stopAnimations();
    }
  }, [isRecording]);

  const startAnimations = () => {
    // Pulse animation for recording button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave animation for recording indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopAnimations = () => {
    pulseAnimation.stopAnimation();
    waveAnimation.stopAnimation();
    slideAnimation.setValue(0);
    setSlideValue(0);
    setShowCancelHint(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    const slideDistance = isRtl ? translationX : -translationX;
    
    if (slideDistance > 0) {
      setSlideValue(slideDistance);
      slideAnimation.setValue(slideDistance);
      
      if (slideDistance > 100) {
        setShowCancelHint(true);
      } else {
        setShowCancelHint(false);
      }
    }
  };

  const handleGestureStateChange = (event: any) => {
    const { state, translationX } = event.nativeEvent;
    const slideDistance = isRtl ? translationX : -translationX;
    
    if (state === State.END) {
      if (slideDistance > 100) {
        // Cancel recording
        onCancelRecording();
      } else {
        // Reset slide
        Animated.spring(slideAnimation, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        setSlideValue(0);
        setShowCancelHint(false);
      }
    }
  };

  const renderWaveform = () => {
    const waves = Array.from({ length: 20 }, (_, index) => (
      <Animated.View
        key={index}
        style={[
          styles.waveBar,
          {
            height: waveAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [4, Math.random() * 20 + 10],
            }),
            opacity: waveAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          },
        ]}
      />
    ));
    return waves;
  };

  if (!isRecording) {
    return (
      <TouchableOpacity
        style={styles.recordButton}
        onPress={onStartRecording}
        activeOpacity={0.7}
      >
        <Ionicons name="mic" size={24} color="#ffffff" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      {/* Cancel hint */}
      {showCancelHint && (
        <View style={styles.cancelHint}>
          <Text style={styles.cancelHintText}>
            {t('chat.releaseToCancel')}
          </Text>
        </View>
      )}

      {/* Recording interface */}
      <View style={styles.recordingInterface}>
        {/* Slide to cancel area */}
        <View style={styles.slideArea}>
          <Animated.View 
            style={[
              styles.slideIndicator,
              {
                transform: [{ translateX: slideAnimation }],
                opacity: slideAnimation.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <Ionicons 
              name={isRtl ? "chevron-forward" : "chevron-back"} 
              size={20} 
              color="#8696A0" 
            />
            <Text style={styles.slideText}>
              {t('chat.slideToCancel')}
            </Text>
          </Animated.View>
        </View>

        {/* Recording info */}
        <View style={styles.recordingInfo}>
          <View style={styles.recordingIndicator}>
            <Animated.View 
              style={[
                styles.recordingDot,
                { transform: [{ scale: pulseAnimation }] }
              ]} 
            />
            <Text style={styles.recordingText}>
              {t('chat.recording')}
            </Text>
          </View>

          <Text style={styles.durationText}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>

        {/* Waveform */}
        <View style={styles.waveformContainer}>
          {renderWaveform()}
        </View>

        {/* Recording controls */}
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureStateChange}
        >
          <Animated.View style={styles.recordingControls}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onCancelRecording}
            >
              <Ionicons name="trash" size={20} color="#FF5722" />
            </TouchableOpacity>

            <Animated.View 
              style={[
                styles.recordButtonRecording,
                { transform: [{ scale: pulseAnimation }] }
              ]}
            >
              <TouchableOpacity
                style={styles.stopButton}
                onPress={onStopRecording}
              >
                <Ionicons name="stop" size={20} color="#ffffff" />
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={onSendRecording}
            >
              <Ionicons name="send" size={20} color="#25D366" />
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recordingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelHint: {
    position: 'absolute',
    top: 100,
    backgroundColor: '#FF5722',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelHintText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingInterface: {
    width: screenWidth - 32,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  slideArea: {
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  slideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideText: {
    fontSize: 14,
    color: '#8696A0',
    marginLeft: 8,
  },
  recordingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5722',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#FF5722',
    fontWeight: '600',
  },
  durationText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: 20,
  },
  waveBar: {
    width: 3,
    backgroundColor: '#25D366',
    marginHorizontal: 1,
    borderRadius: 1.5,
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonRecording: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WhatsAppVoiceRecorder;
