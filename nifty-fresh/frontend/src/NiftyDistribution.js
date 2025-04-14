// src/NiftyDistribution.js
import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import { Range } from "react-range";
import DatePicker from "react-datepicker";
import { useTheme } from "./ThemeContext";
import "./NiftyDistribution.css";

export default function NiftyDistribution() {
  const [dates, setDates] = useState([]);
  const [rangeValues, setRangeValues] = useState([0, 0]);
  const [daysExpiry, setDaysExpiry] = useState(1);
  const [dailyData, setDailyData] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [usedVol, setUsedVol] = useState(null);
  const [error, setError] = useState("");

  const { theme, themeName, setThemeName, darkMode, setDarkMode } = useTheme();

  useEffect(() => {
    document.documentElement.style.setProperty("--slider-gradient", theme.gradient);
    document.documentElement.style.setProperty("--thumb-color", theme.thumb);
  }, [theme]);

  useEffect(() => {
    fetch("/api/dates")
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.dates.sort();
        setDates(sorted);
        setRangeValues([0, sorted.length - 1]);
      })
      .catch(() => setError("Error fetching dates."));
  }, []);

  const getDateDiffInDays = (date1, date2) =>
    Math.max(Math.ceil((new Date(date2) - new Date(date1)) / (1000 * 60 * 60 * 24)), 1);

  const startDate = dates[rangeValues[0]];
  const endDate = dates[rangeValues[1]];
  const maxExpiry = startDate && endDate ? getDateDiffInDays(startDate, endDate) : 1;

  useEffect(() => {
    if (startDate && endDate) {
      const maxDays = getDateDiffInDays(startDate, endDate);
      if (daysExpiry > maxDays) setDaysExpiry(maxDays);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (endDate) {
      fetch(`/api/data?date=${endDate}`)
        .then((res) => res.json())
        .then((data) => setDailyData(data.data || null))
        .catch(() => setError("Error fetching daily data."));
    }
  }, [endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetch(
        `/api/bellcurve?start_date=${startDate}&end_date=${endDate}&days_to_expiry=${daysExpiry}`
      )
        .then((res) => res.json())
        .then((fig) => {
          setPlotData(fig);
          const match = fig.layout.title.text.match(/Annual Vol=([0-9.]+)/);
          if (match) setUsedVol(parseFloat(match[1]));
        })
        .catch(() => setError("Error fetching bell curve data."));
    }
  }, [startDate, endDate, daysExpiry]);

  const handleStartDateChange = (date) => {
    const index = dates.findIndex((d) => d === date.toISOString().split("T")[0]);
    if (index >= 0 && index < rangeValues[1]) {
      setRangeValues([index, rangeValues[1]]);
    }
  };

  const handleEndDateChange = (date) => {
    const index = dates.findIndex((d) => d === date.toISOString().split("T")[0]);
    if (index >= 0 && index > rangeValues[0]) {
      setRangeValues([rangeValues[0], index]);
    }
  };

  const dateToISO = (dateStr) => new Date(dateStr + "T00:00:00");

  return (
    <div className={`nifty-container ${darkMode ? "dark" : "light"}`}>
      <h1 className="nifty-title">📈 NIFTY Normal Distribution</h1>

      <div className="theme-toggle">
        <div>
          <label><strong>Theme:</strong></label>
          {["blue", "green", "grey"].map((t) => (
            <button
              key={t}
              onClick={() => setThemeName(t)}
              className={`theme-button ${themeName === t ? "active" : ""}`}
              style={{ backgroundColor: themeName === t ? theme.primary : "#eee" }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />{" "}
            Dark Mode
          </label>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {dates.length === 0 ? (
        <p>Loading dates...</p>
      ) : (
        <>
          <div className="date-picker-row">
            <label className="date-picker-label">From:</label>
            <DatePicker
              selected={startDate ? dateToISO(startDate) : null}
              onChange={handleStartDateChange}
              includeDates={dates.map((d) => dateToISO(d))}
              dateFormat="yyyy-MM-dd"
              className="date-input"
            />
            <label className="date-picker-label">To:</label>
            <DatePicker
              selected={endDate ? dateToISO(endDate) : null}
              onChange={handleEndDateChange}
              includeDates={dates.map((d) => dateToISO(d))}
              dateFormat="yyyy-MM-dd"
              className="date-input"
            />
          </div>

          <div className="sliders-wrapper">
            {/* 🎚️ Date Range Slider */}
            <div className="slider-box">
              <label className="slider-heading">Date Range Selector:</label>
              <Range
                step={1}
                min={0}
                max={dates.length - 1}
                values={rangeValues}
                onChange={setRangeValues}
                allowOverlap={false}
                renderTrack={({ props, children }) => (
                    <div {...props} className="track">
                    {children}
                    </div>
                )}
                renderThumb={({ props, index }) => (
                    <div
                      {...props}
                      className={`thumb ${index === 0 ? 'left' : 'right'}`}
                    />
                  )}
                />

            </div>

            {/* ⏳ Expiry Slider */}
            <div className="slider-box">
              <label className="slider-heading">Days to Expiry: {daysExpiry}</label>
              <input
                type="range"
                min="1"
                max={maxExpiry}
                value={daysExpiry}
                onChange={(e) => setDaysExpiry(parseInt(e.target.value))}
                className="expiry-slider"
              />
              <span className="expiry-info">Max: {maxExpiry} days</span>
            </div>
          </div>

          {endDate && usedVol && (
            <p className="daily-info">
              <strong>End Date:</strong> {endDate} |{" "}
              <strong>Volatility Applied:</strong> {(usedVol * 100).toFixed(2)}%
            </p>
          )}

          <div className="plot-wrapper">
            {plotData ? (
              <Plot
                data={plotData.data}
                layout={{
                  ...plotData.layout,
                  paper_bgcolor: theme.plotBg,
                  plot_bgcolor: theme.plotBg,
                  font: { color: theme.plotFg },
                  xaxis: {
                    ...plotData.layout.xaxis,
                    gridcolor: darkMode ? "#444" : "#ccc",
                  },
                  yaxis: {
                    ...plotData.layout.yaxis,
                    gridcolor: darkMode ? "#444" : "#ccc",
                  },
                }}
                style={{ width: "100%", height: "500px" }}
                useResizeHandler
              />
            ) : (
              <p>Loading bell curve...</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
