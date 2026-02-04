import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export function useForceLightTheme() {
  const { setTheme, theme } = useTheme();
  const previousThemeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Save current theme on mount
    previousThemeRef.current = theme;
    setTheme('light');

    // Restore previous theme on unmount
    return () => {
      if (previousThemeRef.current && previousThemeRef.current !== 'light') {
        setTheme(previousThemeRef.current);
      }
    };
  }, [setTheme]);
}
