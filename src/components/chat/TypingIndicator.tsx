import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
  isGroup?: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  userName,
  isGroup = false,
}) => {
  const { t, i18n } = useTranslation();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (isVisible) {
      // إظهار المؤشر
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // تحريك النقاط
      const animateDots = () => {
        const createDotAnimation = (dot: Animated.Value, delay: number) => {
          return Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(dot, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          );
        };

        Animated.parallel([
          createDotAnimation(dot1, 0),
          createDotAnimation(dot2, 200),
          createDotAnimation(dot3, 400),
        ]).start();
      };

      animateDots();
    } else {
      // إخفاء المؤشر
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // إيقاف تحريك النقاط
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const getTypingText = () => {
    if (isGroup && userName) {
      return t('chat.userTyping', { name: userName });
    }
    return t('chat.typing');
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: containerOpacity }
      ]}
    >
      <View style={styles.bubble}>
        <View style={styles.textContainer}>
          <Text style={[
            styles.typingText,
            { textAlign: getTextAlign(i18n.language) }
          ]}>
            {getTypingText()}
          </Text>
        </View>
        
        <View style={styles.dotsContainer}>
          <Animated.View 
            style={[
              styles.dot,
              {
                opacity: dot1,
                transform: [{
                  scale: dot1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  })
                }]
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot,
              {
                opacity: dot2,
                transform: [{
                  scale: dot2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  })
                }]
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot,
              {
                opacity: dot3,
                transform: [{
                  scale: dot3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  })
                }]
              }
            ]} 
          />
        </View>
      </View>

      {/* مثلث الفقاعة */}
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginVertical: 4,
    maxWidth: '70%',
  },
  bubble: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  textContainer: {
    marginRight: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#8696A0',
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8696A0',
    marginHorizontal: 1,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: 0,
    left: -6,
    width: 0,
    height: 0,
    borderRightWidth: 6,
    borderRightColor: '#ffffff',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
  },
});

export default TypingIndicator;
