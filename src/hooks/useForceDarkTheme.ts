import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export function useForceDarkTheme() {
  const { setTheme, theme } = useTheme();
  const previousThemeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Save current theme on mount
    previousThemeRef.current = theme;
    setTheme('dark');

    // Restore previous theme on unmount
    return () => {
      if (previousThemeRef.current && previousThemeRef.current !== 'dark') {
        setTheme(previousThemeRef.current);
      }
    };
  }, [setTheme]);
}
