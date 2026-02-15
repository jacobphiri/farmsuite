import { createContext, useContext, useMemo } from 'react';

/**
 * ThemeContext - Placeholder provider for compatibility
 * Actual theming is handled by ShellLayout through body data attributes
 * and the farmsuite.css CSS variables system
 */
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const value = useMemo(() => ({
    // Placeholder values for compatibility
    themeKey: 'light',
    borderRadius: 14,
    borderWidth: 1
  }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
