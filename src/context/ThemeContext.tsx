"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default theme for SSR
const DEFAULT_THEME: Theme = "system";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    // Try to read saved theme preference from localStorage
    try {
      const savedTheme = localStorage.getItem("gamevault-theme") as Theme | null;
      
      // Validate the saved theme
      if (savedTheme && (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system")) {
        setTheme(savedTheme);
      } else {
        // If no valid saved theme, check system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
    } catch (e) {
      // Handle storage errors (e.g., SecurityError in private browsing)
      console.warn("Failed to read theme preference:", e);
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  // Handle theme changes and persistence
  useEffect(() => {
    // Save theme preference to localStorage
    try {
      localStorage.setItem("gamevault-theme", theme);
    } catch (e) {
      console.warn("Failed to save theme preference:", e);
    }
    
    // Apply theme to document root
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove("light", "dark");
    
    // Add the current theme class
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Subscribe to system theme changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(e.matches ? "dark" : "light");
    };
    
    // Initial application
    handler({ matches: mediaQuery.matches } as MediaQueryListEvent);
    
    // Subscribe to changes
    mediaQuery.addEventListener("change", handler);
    
    // Cleanup
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const value = { theme, setTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
