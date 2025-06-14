import { Dimensions, PixelRatio, Platform } from 'react-native';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design reference)
const BASE_WIDTH = 375; // iPhone X width
const BASE_HEIGHT = 812; // iPhone X height

/**
 * Scale size based on screen width
 */
export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale size based on screen height
 */
export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Scale font size based on screen size and pixel density
 */
export const scaleFontSize = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Get responsive padding based on screen size
 */
export const getResponsivePadding = () => {
  const baseHorizontal = 16;
  const baseVertical = 20;
  
  return {
    horizontal: scaleWidth(baseHorizontal),
    vertical: scaleHeight(baseVertical),
  };
};

/**
 * Get responsive margin based on screen size
 */
export const getResponsiveMargin = () => {
  const baseHorizontal = 16;
  const baseVertical = 12;
  
  return {
    horizontal: scaleWidth(baseHorizontal),
    vertical: scaleHeight(baseVertical),
  };
};

/**
 * Check if device is tablet
 */
export const isTablet = (): boolean => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return (
    (Platform.OS === 'ios' && aspectRatio < 1.6) ||
    (Platform.OS === 'android' && (SCREEN_WIDTH >= 600 || SCREEN_HEIGHT >= 600))
  );
};

/**
 * Check if device is small screen
 */
export const isSmallScreen = (): boolean => {
  return SCREEN_WIDTH < 375 || SCREEN_HEIGHT < 667;
};

/**
 * Check if device is large screen
 */
export const isLargeScreen = (): boolean => {
  return SCREEN_WIDTH > 414 || SCREEN_HEIGHT > 896;
};

/**
 * Get device type
 */
export const getDeviceType = (): 'small' | 'medium' | 'large' | 'tablet' => {
  if (isTablet()) return 'tablet';
  if (isSmallScreen()) return 'small';
  if (isLargeScreen()) return 'large';
  return 'medium';
};

/**
 * Get responsive button size
 */
export const getResponsiveButtonSize = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'small':
      return {
        height: scaleHeight(44),
        fontSize: scaleFontSize(14),
        paddingHorizontal: scaleWidth(16),
      };
    case 'large':
    case 'tablet':
      return {
        height: scaleHeight(56),
        fontSize: scaleFontSize(18),
        paddingHorizontal: scaleWidth(24),
      };
    default:
      return {
        height: scaleHeight(50),
        fontSize: scaleFontSize(16),
        paddingHorizontal: scaleWidth(20),
      };
  }
};

/**
 * Get responsive card dimensions
 */
export const getResponsiveCardSize = () => {
  const deviceType = getDeviceType();
  const padding = getResponsivePadding();
  
  switch (deviceType) {
    case 'tablet':
      return {
        width: SCREEN_WIDTH * 0.45, // Two columns on tablet
        minHeight: scaleHeight(200),
        padding: padding.horizontal * 1.5,
      };
    case 'large':
      return {
        width: SCREEN_WIDTH - (padding.horizontal * 2),
        minHeight: scaleHeight(180),
        padding: padding.horizontal,
      };
    default:
      return {
        width: SCREEN_WIDTH - (padding.horizontal * 2),
        minHeight: scaleHeight(160),
        padding: padding.horizontal * 0.8,
      };
  }
};

/**
 * Get responsive grid columns
 */
export const getResponsiveColumns = (): number => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'tablet':
      return 2;
    case 'small':
      return 1;
    default:
      return 1;
  }
};

/**
 * Get screen dimensions
 */
export const getScreenDimensions = () => {
  return {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    isLandscape: SCREEN_WIDTH > SCREEN_HEIGHT,
    isPortrait: SCREEN_HEIGHT > SCREEN_WIDTH,
  };
};

/**
 * Listen to orientation changes
 */
export const addOrientationListener = (callback: (dimensions: any) => void) => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    callback({
      width: window.width,
      height: window.height,
      isLandscape: window.width > window.height,
      isPortrait: window.height > window.width,
    });
  });
  
  return subscription;
};

// Export screen dimensions for direct use
export { SCREEN_WIDTH, SCREEN_HEIGHT };
