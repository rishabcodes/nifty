// src/ThemeContext.js
import React, { createContext, useContext, useState } from "react";

const themes = {
  blue: {
    primary: "#0077b6",
    gradient: "linear-gradient(to right, #a1c4fd, #c2e9fb)",
    thumb: "#0077b6",
    plotBg: "#ffffff",
    plotFg: "#000000",
  },
  green: {
    primary: "#2e8b57",
    gradient: "linear-gradient(to right, #a8edea, #fed6e3)",
    thumb: "#2e8b57",
    plotBg: "#ffffff",
    plotFg: "#000000",
  },
  grey: {
    primary: "#495057",
    gradient: "linear-gradient(to right, #ced4da, #dee2e6)",
    thumb: "#495057",
    plotBg: "#ffffff",
    plotFg: "#000000",
  },
  dark: {
    primary: "#00bcd4",
    gradient: "linear-gradient(to right, #2c3e50, #4ca1af)",
    thumb: "#00bcd4",
    plotBg: "#1e1e1e",
    plotFg: "#ffffff",
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState("blue");
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? themes.dark : themes[themeName];

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName, darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
