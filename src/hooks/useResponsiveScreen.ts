import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  getScreenDimensions,
  getDeviceType,
  getResponsivePadding,
  getResponsiveMargin,
  getResponsiveButtonSize,
  getResponsiveCardSize,
  getResponsiveColumns,
  scaleFontSize,
  scaleWidth,
  scaleHeight,
} from '../utils/screenUtils';

interface ScreenDimensions {
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
}

interface ResponsiveStyles {
  padding: { horizontal: number; vertical: number };
  margin: { horizontal: number; vertical: number };
  button: { height: number; fontSize: number; paddingHorizontal: number };
  card: { width: number; minHeight: number; padding: number };
  columns: number;
  deviceType: 'small' | 'medium' | 'large' | 'tablet';
}

export const useResponsiveScreen = () => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(getScreenDimensions());
  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>(
    ScreenOrientation.Orientation.PORTRAIT_UP
  );

  useEffect(() => {
    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
        isPortrait: window.height > window.width,
      });
    });

    // Listen for orientation changes
    const orientationSubscription = ScreenOrientation.addOrientationChangeListener((event) => {
      setOrientation(event.orientationInfo.orientation);
    });

    // Get initial orientation
    ScreenOrientation.getOrientationAsync().then((currentOrientation) => {
      setOrientation(currentOrientation);
    });

    return () => {
      subscription?.remove();
      ScreenOrientation.removeOrientationChangeListener(orientationSubscription);
    };
  }, []);

  // Calculate responsive styles based on current dimensions
  const responsiveStyles: ResponsiveStyles = {
    padding: getResponsivePadding(),
    margin: getResponsiveMargin(),
    button: getResponsiveButtonSize(),
    card: getResponsiveCardSize(),
    columns: getResponsiveColumns(),
    deviceType: getDeviceType(),
  };

  // Helper functions
  const scale = {
    width: scaleWidth,
    height: scaleHeight,
    font: scaleFontSize,
  };

  const isLandscape = dimensions.isLandscape;
  const isPortrait = dimensions.isPortrait;
  const isTablet = responsiveStyles.deviceType === 'tablet';
  const isSmallScreen = responsiveStyles.deviceType === 'small';
  const isLargeScreen = responsiveStyles.deviceType === 'large';

  return {
    dimensions,
    orientation,
    responsiveStyles,
    scale,
    isLandscape,
    isPortrait,
    isTablet,
    isSmallScreen,
    isLargeScreen,
  };
};

export default useResponsiveScreen;
