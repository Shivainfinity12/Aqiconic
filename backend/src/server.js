import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();

const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

let latestSensorData = {
  pm25: 0,
  aqi: 0,
  mq135: 0,
  mq7: 0,
  mq8: 0,
  temp: 0,
  rh: 0,
  mist: 0,
};


// ============================================================
// BASIC ROUTE
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "AQIONIC Backend is running 🚀",
  });
});


// ============================================================
// SENSOR API - GET (for frontend / debug)
// ============================================================

app.get("/api/sensors", (req, res) => {
  res.json(latestSensorData);
});


// ============================================================
// SENSOR API - POST (ESP32 pushes data here)
// ============================================================

app.post("/api/sensors", (req, res) => {

  const data = req.body;

  latestSensorData = {
    pm25:  Number(data.pm25  ?? 0),
    aqi:   Number(data.aqi   ?? 0),
    mq135: Number(data.mq135 ?? 0),
    mq7:   Number(data.mq7   ?? 0),
    mq8:   Number(data.mq8   ?? 0),
    temp:  Number(data.temp  ?? 0),
    rh:    Number(data.rh    ?? 0),
    mist:  Number(data.mist  ?? 0),
  };

  // Broadcast updated data to all connected frontend clients
  io.emit("sensorData", latestSensorData);

  console.log("ESP32 pushed data:", latestSensorData);

  res.json({ status: "ok" });

});


// ============================================================
// SOCKET.IO
// ============================================================

io.on("connection", (socket) => {

  console.log(
    "Frontend connected:",
    socket.id
  );

  // Send latest data immediately on connect
  socket.emit("sensorData", latestSensorData);

  socket.on("disconnect", () => {

    console.log(
      "Frontend disconnected:",
      socket.id
    );

  });

});


// ============================================================
// START SERVER
// ============================================================

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log("====================================");
    console.log("       AQIONIC BACKEND");
    console.log("====================================");
    console.log(`Backend running on port ${PORT}`);
    console.log("ESP32 should POST to: /api/sensors");
    console.log("====================================");
    console.log("");

  }
);