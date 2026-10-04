import React, { createContext, useContext, useEffect, useState } from "react";

export type StyleTheme = "modern" | "sketch";
export type ColorGrading = "indigo" | "emerald" | "amber" | "rose" | "ocean";

export interface ColorGradingOption {
  id: ColorGrading;
  name: string;
  dotColor: string;
  description: string;
}

export const COLOR_GRADING_OPTIONS: ColorGradingOption[] = [
  { id: "indigo", name: "Apple Blue", dotColor: "#007aff", description: "Native macOS system blue & balanced" },
  { id: "emerald", name: "Forest Mint", dotColor: "#10b981", description: "Fresh, money & dividend focused" },
  { id: "amber", name: "Warm Amber", dotColor: "#f59e0b", description: "Warm brass & sunset tones" },
  { id: "rose", name: "Ruby Rose", dotColor: "#f43f5e", description: "Vibrant & expressive" },
  { id: "ocean", name: "Ocean Teal", dotColor: "#06b6d4", description: "Cool cyan & deep sea tones" },
];

interface ThemeContextType {
  styleTheme: StyleTheme;
  colorGrading: ColorGrading;
  setStyleTheme: (theme: StyleTheme) => void;
  toggleStyleTheme: () => void;
  setColorGrading: (color: ColorGrading) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [styleTheme, setStyleThemeState] = useState<StyleTheme>(() => {
    try {
      const saved = localStorage.getItem("divyield_style_theme");
      return saved === "sketch" ? "sketch" : "modern";
    } catch {
      return "modern";
    }
  });

  const [colorGrading, setColorGradingState] = useState<ColorGrading>(() => {
    try {
      const saved = localStorage.getItem("divyield_color_grading") as ColorGrading;
      if (saved && ["indigo", "emerald", "amber", "rose", "ocean"].includes(saved)) {
        return saved;
      }
      return "indigo";
    } catch {
      return "indigo";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("divyield_style_theme", styleTheme);
      document.documentElement.setAttribute("data-style", styleTheme);
    } catch (e) {
      console.warn("Could not save style theme to localStorage", e);
    }
  }, [styleTheme]);

  useEffect(() => {
    try {
      localStorage.setItem("divyield_color_grading", colorGrading);
      document.documentElement.setAttribute("data-color", colorGrading);
    } catch (e) {
      console.warn("Could not save color grading to localStorage", e);
    }
  }, [colorGrading]);

  const setStyleTheme = (theme: StyleTheme) => {
    setStyleThemeState(theme);
  };

  const toggleStyleTheme = () => {
    setStyleThemeState((prev) => (prev === "modern" ? "sketch" : "modern"));
  };

  const setColorGrading = (color: ColorGrading) => {
    setColorGradingState(color);
  };

  return (
    <ThemeContext.Provider
      value={{
        styleTheme,
        colorGrading,
        setStyleTheme,
        toggleStyleTheme,
        setColorGrading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
