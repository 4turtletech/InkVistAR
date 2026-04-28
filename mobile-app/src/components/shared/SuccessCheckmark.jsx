import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export const SuccessCheckmark = ({ size = 60, color }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 1.5,
        height: size * 1.5,
        borderRadius: size * 0.75,
        backgroundColor: theme.successBg,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CheckCircle size={size} color={color || theme.success} />
      </View>
    </Animated.View>
  );
};
