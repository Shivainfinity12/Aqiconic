import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

const initialReadings = {
  pm25: 0,
  aqi: 0,
  mq135: 0,
  mq7: 0,
  mq8: 0,
  temp: 0,
  rh: 0,
};

// ============================================================
// AQI CATEGORY
// ============================================================

export function getAQICategory(aqi) {
  if (aqi <= 50) {
    return {
      label: "Good",
      color: "#4ade80",
      bg: "rgba(74,222,128,0.15)",
      textClass: "text-green",
    };
  }

  if (aqi <= 100) {
    return {
      label: "Satisfactory",
      color: "#a3e635",
      bg: "rgba(163,230,53,0.15)",
      textClass: "text-green",
    };
  }

  if (aqi <= 150) {
    return {
      label: "Moderate",
      color: "#facc15",
      bg: "rgba(250,204,21,0.15)",
      textClass: "text-yellow",
    };
  }

  if (aqi <= 200) {
    return {
      label: "Poor",
      color: "#fb923c",
      bg: "rgba(251,146,60,0.15)",
      textClass: "text-orange",
    };
  }

  if (aqi <= 300) {
    return {
      label: "Very Poor",
      color: "#f87171",
      bg: "rgba(248,113,113,0.15)",
      textClass: "text-red",
    };
  }

  return {
    label: "Severe",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.15)",
    textClass: "text-purple",
  };
}

// ============================================================
// MISTING STATE
// ============================================================

export function getMistingState(aqi, rh) {
  return aqi > 200 && rh < 60;
}

// ============================================================
// SENSOR DATA HOOK
// ============================================================

export function useSensorData() {
  const [readings, setReadings] = useState(initialReadings);

  const [history, setHistory] = useState([]);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log("Connecting to AQIONIC backend...");

    const socket = io(SOCKET_URL);

    // ========================================================
    // CONNECTED
    // ========================================================

    socket.on("connect", () => {
      console.log("Connected to AQIONIC backend");
      console.log("Socket ID:", socket.id);

      setConnected(true);
    });

    // ========================================================
    // DISCONNECTED
    // ========================================================

    socket.on("disconnect", () => {
      console.log("Disconnected from AQIONIC backend");

      setConnected(false);
    });

    // ========================================================
    // SENSOR DATA
    // ========================================================

    socket.on("sensorData", (data) => {
      console.log("Received sensor data:", data);

      const next = {
        pm25: Number(data.pm25 ?? 0),
        aqi: Number(data.aqi ?? 0),
        mq135: Number(data.mq135 ?? 0),
        mq7: Number(data.mq7 ?? 0),
        mq8: Number(data.mq8 ?? 0),
        temp: Number(data.temp ?? 0),
        rh: Number(data.rh ?? data.humidity ?? 0),
      };

      setReadings(next);

      // Add to chart history
      setHistory((previous) => [
        ...previous.slice(-29),
        {
          time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          ...next,
        },
      ]);
    });

    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {
      socket.disconnect();
    };
  }, []);

  const misting = getMistingState(
    readings.aqi,
    readings.rh
  );

  const aqiInfo = getAQICategory(readings.aqi);

  return {
    readings,
    history,
    misting,
    aqiInfo,
    connected,
  };
}