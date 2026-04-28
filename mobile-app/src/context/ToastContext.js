import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { typography } from '../theme';
import { useTheme } from './ThemeContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const { theme } = useTheme();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
    
    // Animate In
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? 50 : 30, // Drop down nicely below status bar
        damping: 15,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      hideToast();
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setToast(prev => ({ ...prev, visible: false }));
    });
  }, []);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle2 size={20} color={theme.success} />;
      case 'error': return <AlertCircle size={20} color={theme.error} />;
      default: return <Info size={20} color={theme.gold} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: theme.surfaceLight,
              borderColor: theme.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.content}>
            {getIcon()}
            <Text style={[styles.text, { color: theme.textPrimary }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0, // Controlled by translateY
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    ...typography.body,
    marginLeft: 12,
    flex: 1,
  }
});
