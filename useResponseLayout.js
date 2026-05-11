import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Device classification

const SMALL_WIDTH  = 360;  
const LARGE_WIDTH  = 428;  

// Returns a stable set of layout values calibrated to the current device
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Device size bucket 
  const isSmallScreen  = width  <= SMALL_WIDTH;
  const isLargeScreen  = width  >= LARGE_WIDTH;
  const isTablet       = width  >= 768;          // iPad / large Android tablet
  const isShortDevice  = height <= 667;          // iPhone SE height

  // - Platform flags 
  const isIOS     = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  // -- Header
  // Replaces the hardcoded paddingTop: Platform.OS === "ios" ? 56 : 40
  const headerPaddingTop = insets.top > 0
    ? insets.top + (isSmallScreen ? 8 : 12)   
    : isIOS ? 44 : 28;                         

  const headerPaddingBottom = isShortDevice ? 8 : 12;

  // -- tab bar 
  // Replaces paddingBottom: Platform.OS === "ios" ? 24 : 8 in styles.Barsize.
  const tabBarPaddingBottom = insets.bottom > 0
    ? insets.bottom                            
    : isIOS ? 16 : 8;

  const tabBarPaddingTop = isShortDevice ? 6 : 10;

  // Tab item horizontal padding scales with screen width
  const tabItemPaddingHorizontal = isSmallScreen ? 8 : isLargeScreen ? 20 : 14;

  // Tab label font size
  const tabFontSize = isSmallScreen ? 10 : 12;

  // -- Modal
  // ScheduleModal's maxHeight and marginTop currently use percentage strings
  const modalMarginTop    = isShortDevice ? '5%'  : '10%';
  const modalMaxHeight    = isShortDevice ? '95%' : '90%';

  // -- General typography 
  const fontScale = isSmallScreen ? 0.9 : isTablet ? 1.15 : 1.0;

  // -- Scroll padding 
  // Ensures content is never hidden behind the tab bar at the bottom
  const scrollPaddingBottom = tabBarPaddingBottom + 48;

  return {
    // Screen info (pass-through for convenience)
    width,
    height,
    isSmallScreen,
    isLargeScreen,
    isTablet,
    isShortDevice,
    isIOS,
    isAndroid,

    // Safe-area insets (pass-through)
    insets,

    // Header
    headerPaddingTop,
    headerPaddingBottom,

    // Tab bar
    tabBarPaddingBottom,
    tabBarPaddingTop,
    tabItemPaddingHorizontal,
    tabFontSize,

    // Modal
    modalMarginTop,
    modalMaxHeight,

    // Typography
    fontScale,

    // Scroll
    scrollPaddingBottom,
  };
}
