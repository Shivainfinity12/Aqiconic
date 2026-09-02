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

const PORT = 3000;

const ESP32_URL = "http://10.68.20.75/api/sensors";

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
// SENSOR API
// ============================================================

app.get("/api/sensors", (req, res) => {
  res.json(latestSensorData);
});


// ============================================================
// FETCH DATA FROM ESP32
// ============================================================

async function fetchESP32Data() {

  try {

    const response = await fetch(ESP32_URL);

    if (!response.ok) {
      throw new Error(
        `ESP32 responded with ${response.status}`
      );
    }

    const data = await response.json();


    latestSensorData = {
      pm25: Number(data.pm25 ?? 0),
      aqi: Number(data.aqi ?? 0),
      mq135: Number(data.mq135 ?? 0),
      mq7: Number(data.mq7 ?? 0),
      mq8: Number(data.mq8 ?? 0),
      temp: Number(data.temp ?? 0),
      rh: Number(data.rh ?? 0),
      mist: Number(data.mist ?? 0),
    };


    // console.log(
    //   "ESP32 DATA:",
    //   latestSensorData
    // );


    // Send data to all connected React clients

    io.emit(
      "sensorData",
      latestSensorData
    );

  }

  catch (error) {

    console.error(
      "ESP32 connection failed:",
      error.message
    );

  }
}


// ============================================================
// SOCKET.IO
// ============================================================

io.on("connection", (socket) => {

  console.log(
    "Frontend connected:",
    socket.id
  );


  // Send latest data immediately

  socket.emit(
    "sensorData",
    latestSensorData
  );


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

    console.log(
      `Backend: http://localhost:${PORT}`
    );

    console.log(
      `ESP32: ${ESP32_URL}`
    );

    console.log("====================================");
    console.log("");

    // Fetch immediately

    fetchESP32Data();

  }
);


// ============================================================
// POLL ESP32 EVERY 2 SECONDS
// ============================================================

setInterval(
  fetchESP32Data,
  2000
);