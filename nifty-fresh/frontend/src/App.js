// src/App.js
import React from "react";
import NiftyDistribution from "./NiftyDistribution";
import { ThemeProvider } from "./ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <NiftyDistribution />
    </ThemeProvider>
  );
}

export default App;
