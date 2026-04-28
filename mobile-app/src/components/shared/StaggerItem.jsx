import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export const StaggerItem = ({ index = 0, children, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const delay = index * 80; // 80ms stagger per item
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      })
    ]).start();
  }, [index, fadeAnim, translateYAnim]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};
