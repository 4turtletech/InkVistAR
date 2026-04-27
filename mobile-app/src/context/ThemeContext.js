import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Default to system preference if no saved preference exists
  const systemPrefersDark = Appearance.getColorScheme() === 'dark';
  const [isDark, setIsDark] = useState(true); // Defaulting to true for Gilded Noir identity
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          // If no saved theme, maybe use system pref, but we default to Dark for the brand
          setIsDark(systemPrefersDark);
        }
        
        const savedHaptics = await AsyncStorage.getItem('appHaptics');
        if (savedHaptics !== null) {
          setHapticsEnabled(savedHaptics === 'true');
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    };
    loadTheme();
  }, [systemPrefersDark]);

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
  };

  const toggleHaptics = async () => {
    try {
      const newHaptics = !hapticsEnabled;
      setHapticsEnabled(newHaptics);
      await AsyncStorage.setItem('appHaptics', newHaptics.toString());
    } catch (e) {
      console.error('Failed to save haptics preference:', e);
    }
  };

  const theme = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, theme, toggleTheme, hapticsEnabled, toggleHaptics }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
