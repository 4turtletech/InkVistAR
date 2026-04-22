/**
 * PremiumLoader -- Animated loading indicator matching web's premium spinner.
 * Uses Animated API (no reanimated required for basic spin).
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const PremiumLoader = ({ message = 'Loading...', size = 'medium', color }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dim = size === 'small' ? 24 : size === 'large' ? 48 : 36;
  const borderW = size === 'small' ? 2 : size === 'large' ? 4 : 3;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: dim,
            height: dim,
            borderWidth: borderW,
            borderColor: 'rgba(190, 144, 85, 0.2)',
            borderTopColor: color || colors.primary,
            transform: [{ rotate }],
          },
        ]}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  spinner: {
    borderRadius: 9999,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
