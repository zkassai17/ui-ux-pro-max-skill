import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

// Gently fades + lifts content into place on mount. Used for feed cards so the
// list feels alive as it loads instead of snapping in.
export function FadeInView({
  children,
  style,
  duration = 220,
  offset = 6,
  delay = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  offset?: number;
  delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, duration, delay]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
