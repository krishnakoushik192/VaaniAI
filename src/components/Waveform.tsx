import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { radii, useTheme } from '../theme';

const HEIGHTS = [14, 22, 30, 42, 56, 38, 26, 48, 64, 52, 34, 20, 28, 44, 60, 46, 30, 18, 26, 40, 54, 36, 22, 14];

/** Bars breathe gently while recording; still under reduced motion or when paused. */
export function Waveform({ active, level = 1 }: { active: boolean; level?: number }) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active || reduce) {
      anim.stopAnimation();
      anim.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduce, anim]);

  const live = Math.round(HEIGHTS.length * Math.min(1, Math.max(0, level)));

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {HEIGHTS.map((h, i) => {
        const phase = (i % 6) / 6;
        const scaleY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: i % 2 ? [0.6 + phase * 0.2, 1] : [1, 0.6 + phase * 0.2],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              { height: h, backgroundColor: i < live ? colors.premiumAccent : colors.premiumLine, transform: [{ scaleY }] },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  bar: { width: 5, borderRadius: radii.pill },
});
