import { useRef, type ReactNode } from "react";
import { Animated, Pressable, type StyleProp, type ViewStyle, type GestureResponderEvent } from "react-native";

// A Pressable that gently scales down while pressed — tactile feedback for any
// tappable element. Uses the native driver so it stays at 60fps.
export function PressableScale({
  children,
  style,
  onPress,
  onLongPress,
  disabled,
  hitSlop,
  delayLongPress,
  accessibilityLabel,
  to = 0.96,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  hitSlop?: number;
  delayLongPress?: number;
  accessibilityLabel?: string;
  to?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number, bounciness: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness }).start();

  return (
    <Pressable
      onPressIn={() => spring(to, 0)}
      onPressOut={() => spring(1, 6)}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      delayLongPress={delayLongPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
