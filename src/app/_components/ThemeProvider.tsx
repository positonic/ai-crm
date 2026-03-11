"use client";

import { MantineProvider, type MantineColorScheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useTheme, type UseThemeReturn } from "~/hooks/useTheme";

const ThemeContext = createContext<UseThemeReturn | null>(null);

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeState = useTheme();

  // Convert our theme to Mantine's color scheme
  const mantineColorScheme: MantineColorScheme = themeState.resolvedTheme;

  // Update document data-theme attribute for CSS custom properties
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-theme",
        themeState.resolvedTheme,
      );
    }
  }, [themeState.resolvedTheme]);

  return (
    <ThemeContext.Provider value={themeState}>
      <MantineProvider forceColorScheme={mantineColorScheme}>
        <DatesProvider settings={{ locale: "en", firstDayOfWeek: 0 }}>
          {children}
        </DatesProvider>
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
