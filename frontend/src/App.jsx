import { useState, useEffect } from 'react';
import './App.css';
import { useSensorData, getAQICategory, getMistingState } from './hooks/useSensorData';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import {
  Wind, Droplets, Thermometer, Activity, AlertTriangle,
  Wifi, Settings, BarChart2, Home, Info, ChevronRight,
  CheckCircle, XCircle, Zap, Eye, Clock, Menu, X
} from 'lucide-react';

/* ── Topbar Clock ────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="topbar-time">
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

/* ── AQI Radial Gauge ────────────────────────────── */
function AQIGauge({ aqi, aqiInfo }) {
  const maxAqi = 500;
  const pct    = Math.min(aqi / maxAqi, 1);
  const R      = 90;
  const cx     = 120, cy = 120;
  const strokeW = 16;
  const fullArc = 240; // degrees of arc
  const startAngle = 210; // bottom-left
  const arcLen = fullArc * pct;

  // Convert degrees → SVG arc path
  function polarToXY(angleDeg, r) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(startDeg, sweepDeg, r) {
    if (sweepDeg <= 0) return '';
    const cap = Math.min(sweepDeg, 359.9);
    const s   = polarToXY(startDeg, r);
    const e   = polarToXY(startDeg + cap, r);
    const la  = cap > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${la} 1 ${e.x} ${e.y}`;
  }

  // Track gradient stops
  const stops = [
    { offset: '0%',   stopColor: '#4ade80' },
    { offset: '25%',  stopColor: '#facc15' },
    { offset: '55%',  stopColor: '#fb923c' },
    { offset: '75%',  stopColor: '#f87171' },
    { offset: '100%', stopColor: '#a855f7' },
  ];

  return (
    <div className="gauge-svg-wrapper">
      <svg width={240} height={190} viewBox="0 0 240 190" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="aqiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.stopColor} />
            ))}
          </linearGradient>
        </defs>
        {/* Background track */}
        <path
          d={describeArc(startAngle, fullArc, R)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0.01 && (
          <path
            d={describeArc(startAngle, arcLen, R)}
            fill="none"
            stroke="url(#aqiGrad)"
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${aqiInfo.color})` }}
          />
        )}
        {/* Scale ticks */}
        {[0, 50, 100, 150, 200, 300, 400, 500].map((v) => {
          const a = startAngle + (v / maxAqi) * fullArc;
          const inner = polarToXY(a, R - strokeW / 2 - 4);
          const outer = polarToXY(a, R + strokeW / 2 + 4);
          return (
            <line
              key={v}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <div className="gauge-center-text" style={{ top: '40%', transform: 'translateY(-50%)' }}>
        <div className="gauge-value" style={{ color: aqiInfo.color }}>{Math.round(aqi)}</div>
        <div className="gauge-label-text">AQI INDEX</div>
      </div>
    </div>
  );
}

/* ── Sensor Card ─────────────────────────────────── */
function SensorCard({ label, value, unit, icon: Icon, color, status, statusColor }) {
  return (
    <div className={`sensor-card ${color}`}>
      <div className={`sensor-icon-wrapper ${color}`}>
        <Icon size={20} />
      </div>
      <div className="sensor-label">{label}</div>
      <div className="sensor-value" style={{ color: `var(--${color})` }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
      </div>
      <div className="sensor-unit">{unit}</div>
      <div
        className="sensor-status-tag"
        style={{ background: `rgba(${statusColor},0.15)`, color: `rgb(${statusColor})` }}
      >
        {status}
      </div>
    </div>
  );
}

/* ── Custom Tooltip ──────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value?.toFixed(1)} {p.unit || ''}
        </div>
      ))}
    </div>
  );
}

/* ── Alert Item ──────────────────────────────────── */
function AlertItem({ type, title, time }) {
  const dot = { critical: '#f87171', warning: '#facc15', info: '#38bdf8', success: '#4ade80' }[type];
  return (
    <div className={`alert-item ${type}`}>
      <div className="alert-dot" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
      <div className="alert-content">
        <div className="alert-title">{title}</div>
        <div className="alert-time">{time}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PAGE: DASHBOARD
   ══════════════════════════════════════════════════ */
function DashboardPage({ readings, history, misting, aqiInfo }) {
  const { pm25, mq135, mq7, mq8, temp, rh, aqi } = readings;

  const alerts = [
    misting
      ? { type: 'info',    title: '💧 Misting system ACTIVATED (AQI > 200 & RH < 60%)', time: 'Just now' }
      : { type: 'success', title: '✅ Misting system IDLE – conditions within safe range', time: 'Just now' },
    aqi > 200
      ? { type: 'critical', title: `🚨 AQI ${Math.round(aqi)} – Very Poor air quality detected`, time: '< 1 min ago' }
      : { type: 'success',  title: `✅ AQI ${Math.round(aqi)} – Air quality acceptable`, time: '< 1 min ago' },
    rh < 40
      ? { type: 'warning', title: `⚠️ Low humidity (${rh.toFixed(0)}%) – Dust dispersal risk`, time: '2 min ago' }
      : { type: 'info',    title: `💧 Humidity at ${rh.toFixed(0)}% – Misting not required for RH`, time: '2 min ago' },
    { type: 'success', title: '📡 ESP32 connected via MQTT / ThingSpeak', time: '5 min ago' },
  ];

  return (
    <>
      {/* Hero */}
      <div className="hero-banner">
        <div className="hero-title">ESP32 Smart Air Quality Monitor</div>
        <div className="hero-subtitle">
          Real-time PM2.5, CO, H₂ &amp; humidity sensing with automatic ultrasonic misting control
        </div>
        <div className="hero-chips">
          {['ESP32 Controller','PM2.5 (PMS)','MQ-135','MQ-7 (CO)','MQ-8 (H₂)','DHT22'].map(c => (
            <span key={c} className="hero-chip"
              style={{ borderColor: 'rgba(56,189,248,0.4)', color: 'var(--cyan)', background: 'rgba(56,189,248,0.08)' }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Current AQI</div>
          <div className="stat-value" style={{ color: aqiInfo.color }}>{Math.round(aqi)}</div>
          <div className="stat-change">{aqiInfo.label}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">PM2.5</div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{pm25.toFixed(1)}</div>
          <div className="stat-change">µg/m³</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Humidity (RH)</div>
          <div className="stat-value" style={{ color: rh < 60 ? 'var(--orange)' : 'var(--teal)' }}>{rh.toFixed(0)}%</div>
          <div className="stat-change">{rh < 60 ? 'Below misting threshold' : 'Above misting threshold'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mist Relay</div>
          <div className="stat-value" style={{ color: misting ? 'var(--cyan)' : 'var(--text-secondary)' }}>
            {misting ? 'ON' : 'OFF'}
          </div>
          <div className="stat-change">24V Ultrasonic Atomizer</div>
        </div>
      </div>

      {/* AQI Gauge + Misting Status */}
      <div className="aqi-section">
        {/* AQI Gauge */}
        <div className="aqi-gauge-card">
          <div className="card-title" style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
            <Activity size={16} /> AQI Index
          </div>
          <AQIGauge aqi={aqi} aqiInfo={aqiInfo} />
          <div
            className="aqi-category-badge"
            style={{ background: aqiInfo.bg, color: aqiInfo.color, border: `1px solid ${aqiInfo.color}40` }}
          >
            {aqiInfo.label}
          </div>
          <div className="aqi-scale" style={{ marginTop: 24 }}>
            {[
              { label: 'Good',   color: '#4ade80' },
              { label: 'Sat.',   color: '#a3e635' },
              { label: 'Mod.',   color: '#facc15' },
              { label: 'Poor',   color: '#fb923c' },
              { label: 'V.Poor', color: '#f87171' },
              { label: 'Severe', color: '#a855f7' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ height: 6, width: '100%', background: s.color, borderRadius: 3 }} />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Misting Panel */}
        <div className="misting-card">
          <div className="card-title" style={{ marginBottom: 20 }}>
            <Droplets size={16} /> Misting Control System
          </div>
          <div className="misting-status-indicator">
            <div className={`misting-orb ${misting ? 'active' : 'inactive'}`}>
              {misting ? '💧' : '⛔'}
            </div>
            <div className="misting-status-text">
              <h3 style={{ color: misting ? 'var(--cyan)' : 'var(--text-secondary)' }}>
                {misting ? 'Misting ACTIVE' : 'Misting IDLE'}
              </h3>
              <p>
                {misting
                  ? '24V Ultrasonic atomizer ON — generating fine water mist'
                  : 'Relay OFF — conditions do not require misting'}
              </p>
            </div>
          </div>

          <div className="condition-grid">
            <div className={`condition-item ${aqi > 200 ? 'met' : 'unmet'}`}>
              <div className="condition-label">AQI Threshold</div>
              <div className="condition-value" style={{ color: aqi > 200 ? 'var(--red)' : 'var(--green)' }}>
                {Math.round(aqi)}
              </div>
              <div className="condition-threshold">
                {aqi > 200
                  ? <><CheckCircle size={12} style={{ display: 'inline', color: 'var(--green)' }} /> AQI &gt; 200 ✓</>
                  : <><XCircle size={12} style={{ display: 'inline', color: 'var(--red)' }} /> Need AQI &gt; 200</>}
              </div>
            </div>

            <div className={`condition-item ${rh < 60 ? 'met' : 'unmet'}`}>
              <div className="condition-label">Humidity (RH)</div>
              <div className="condition-value" style={{ color: rh < 60 ? 'var(--orange)' : 'var(--green)' }}>
                {rh.toFixed(0)}%
              </div>
              <div className="condition-threshold">
                {rh < 60
                  ? <><CheckCircle size={12} style={{ display: 'inline', color: 'var(--green)' }} /> RH &lt; 60% ✓</>
                  : <><XCircle size={12} style={{ display: 'inline', color: 'var(--red)' }} /> RH ≥ 60% — stop condition</>}
              </div>
            </div>

            <div className="condition-item" style={{ gridColumn: '1 / -1' }}>
              <div className="condition-label">Logic Gate</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginTop: 4, color: 'var(--cyan)' }}>
                RELAY = (AQI &gt; 200) AND (RH &lt; 60%) → {misting ? '✅ ON' : '❌ OFF'}
              </div>
              <div className="condition-threshold" style={{ marginTop: 6 }}>
                STOP: RH ≥ 60% OR AQI ≤ 200 (closed-loop feedback)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Cards */}
      <div className="section-header">
        <div className="section-title">Live Sensor Readings</div>
        <div className="section-subtitle">Updated every 3 seconds · ESP32 ADC / UART</div>
      </div>

      <div className="sensors-grid" style={{ marginBottom: 24 }}>
        <SensorCard label="PM2.5 Particles"  value={pm25}  unit="µg/m³"  icon={Wind}        color="cyan"   status={pm25  > 55 ? '⚠ High'     : '✓ OK'} statusColor={pm25  > 55 ? '248,113,113' : '74,222,128'} />
        <SensorCard label="MQ-135 Air Quality" value={mq135} unit="ppm" icon={Activity}    color="teal"   status={mq135 > 200 ? '⚠ Elevated' : '✓ OK'} statusColor={mq135 > 200 ? '248,113,113' : '74,222,128'} />
        <SensorCard label="MQ-7 CO"           value={mq7}   unit="ppm"  icon={AlertTriangle} color="yellow" status={mq7   > 30 ? '⚠ Warning'  : '✓ Safe'} statusColor={mq7   > 30 ? '248,113,113' : '74,222,128'} />
        <SensorCard label="MQ-8 H₂"           value={mq8}   unit="ppm"  icon={Zap}          color="orange" status={mq8   > 25 ? '⚠ Warning'  : '✓ Safe'} statusColor={mq8   > 25 ? '248,113,113' : '74,222,128'} />
        <SensorCard label="Temperature"        value={temp}  unit="°C"   icon={Thermometer}  color="teal"   status={temp  > 38 ? '⚠ Hot'      : '✓ Normal'} statusColor={temp  > 38 ? '248,113,113' : '74,222,128'} />
        <SensorCard label="Humidity (RH)"      value={rh}    unit="%"    icon={Droplets}     color="purple" status={rh    < 40 ? '⚠ Dry'      : '✓ OK'} statusColor={rh    < 40 ? '248,113,113' : '74,222,128'} />
      </div>

      {/* Charts Row */}
      <div className="grid-60-40" style={{ marginBottom: 24 }}>
        {/* AQI Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><BarChart2 size={16} /> AQI &amp; PM2.5 Trend</div>
              <div className="card-subtitle">Last 90 seconds · 3s intervals</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aqiArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="pmArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4b5563' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
              <Area type="monotone" dataKey="aqi"  stroke="#f87171" fill="url(#aqiArea)"  strokeWidth={2} name="AQI"   dot={false} />
              <Area type="monotone" dataKey="pm25" stroke="#38bdf8" fill="url(#pmArea)"   strokeWidth={2} name="PM2.5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Humidity + Temp */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Thermometer size={16} /> Temp &amp; Humidity</div>
              <div className="card-subtitle">DHT22 sensor readings</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4b5563' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="temp" stroke="#2dd4bf" strokeWidth={2} name="Temp °C" dot={false} />
              <Line type="monotone" dataKey="rh"   stroke="#a78bfa" strokeWidth={2} name="RH %"    dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MQ Gas Sensors Chart + Alerts */}
      <div className="grid-60-40" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><Wind size={16} /> Gas Sensor Array (MQ Series)</div>
              <div className="card-subtitle">MQ-135 / MQ-7 (CO) / MQ-8 (H₂)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4b5563' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="mq135" stroke="#2dd4bf" strokeWidth={2} name="MQ-135"    dot={false} />
              <Line type="monotone" dataKey="mq7"   stroke="#facc15" strokeWidth={2} name="MQ-7 (CO)" dot={false} />
              <Line type="monotone" dataKey="mq8"   stroke="#fb923c" strokeWidth={2} name="MQ-8 (H₂)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title"><AlertTriangle size={16} /> System Alerts</div>
              <div className="card-subtitle">Real-time notifications</div>
            </div>
          </div>
          <div className="alerts-list">
            {alerts.map((a, i) => <AlertItem key={i} {...a} />)}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════
   PAGE: TECHNICAL APPROACH
   ══════════════════════════════════════════════════ */
function TechPage() {
  const hardware = [
    { module: 'Controller',   part: 'ESP32 Dev Module',                     pins: 'GPIO/ADC/UART' },
    { module: 'Air Quality',  part: 'MQ-135 (Air), MQ-7 (CO), MQ-8 (H₂)', pins: 'GPIO 34, 32, 35' },
    { module: 'Particles',    part: 'PM2.5 – PMS5003 UART sensor',          pins: 'GPIO 16/17 (UART2)' },
    { module: 'Environment',  part: 'DHT22 Temp & Humidity',                 pins: 'GPIO 4' },
    { module: 'Actuation',    part: '5 V Relay → 24 V Ultrasonic Atomizer', pins: 'GPIO 18' },
    { module: 'Power',        part: '5 V Controller / 24 V Atomizer supply', pins: 'VIN + External PSU' },
    { module: 'Connectivity', part: 'WiFi (ESP32 built-in) + MQTT broker',  pins: 'Built-in' },
  ];

  const flows = [
    { step: '1', color: 'cyan',   title: 'START / READ',  desc: 'ESP32 reads PM2.5 (UART), MQ-135, MQ-7, MQ-8 (ADC) and DHT22 every 3 s' },
    { step: '2', color: 'teal',   title: 'FILTER / PROCESS', desc: 'Apply moving-average filter; compute AQI from PM2.5 & MQ-135 concentration' },
    { step: '3', color: 'yellow', title: 'DECISION',      desc: 'IF (AQI > 200) AND (RH < 60%) → trigger relay; ELSE hold / deactivate' },
    { step: '4', color: 'green',  title: 'ACTUATE',       desc: 'GPIO 18 HIGH → 5 V relay closes → 24 V ultrasonic atomizer generates mist' },
    { step: '5', color: 'purple', title: 'FEEDBACK LOOP', desc: 'Re-read sensors; when RH ≥ 60% OR AQI ≤ 200 → relay OFF → repeat cycle' },
  ];

  const software = [
    { name: 'Arduino IDE',       role: 'ESP32 firmware – sensor reading & control logic', color: 'var(--cyan)' },
    { name: 'Blynk IoT',         role: 'Live mobile dashboard · AQI/RH alerts · relay status', color: 'var(--green)' },
    { name: 'ThingSpeak / Cloud', role: 'Data logging · Historical graphs · Analysis', color: 'var(--orange)' },
    { name: 'MQTT Broker',       role: 'Lightweight IoT protocol · Future multi-zone coordination', color: 'var(--purple)' },
  ];

  return (
    <>
      <div className="section-header">
        <div className="section-title">Technical Approach</div>
        <div className="section-subtitle">Hardware stack, control methodology & software IoT layer</div>
      </div>

      <div className="grid-40-60" style={{ marginBottom: 24 }}>
        {/* Hardware Table */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}><Settings size={16} /> Hardware Modules</div>
          <table className="tech-table">
            <thead>
              <tr><th>Module</th><th>Component / Role</th></tr>
            </thead>
            <tbody>
              {hardware.map(h => (
                <tr key={h.module}>
                  <td>{h.module}</td>
                  <td>
                    <div>{h.part}</div>
                    <div style={{ marginTop: 4 }}><code>{h.pins}</code></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Control Flow */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}><Zap size={16} /> Control Logic Flow</div>
          <div className="control-flow">
            {flows.map(f => (
              <div className="flow-step" key={f.step}>
                <div className={`flow-node ${f.color}`}>{f.step}</div>
                <div className="flow-content">
                  <div className="flow-step-title">{f.title}</div>
                  <div className="flow-step-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ESP32 Pin Map */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 14 }}><Wifi size={16} /> Key ESP32 Connections</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.88rem',
          background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 18px',
          color: 'var(--cyan)', overflowX: 'auto', letterSpacing: '0.5px'
        }}>
          MQ-135 → GPIO34 &nbsp;|&nbsp; MQ-8 → GPIO35 &nbsp;|&nbsp; MQ-7 → GPIO32 &nbsp;|&nbsp; PM2.5 → UART2 (16/17) &nbsp;|&nbsp; DHT22 → GPIO4 &nbsp;|&nbsp; Relay → GPIO18
        </div>
      </div>

      {/* Software IoT Layer */}
      <div className="section-header">
        <div className="section-title">Software &amp; IoT Layer</div>
        <div className="section-subtitle">Cloud connectivity and data pipeline</div>
      </div>
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {software.map(s => (
          <div className="card" key={s.name} style={{ borderTop: `3px solid ${s.color}` }}>
            <div style={{ color: s.color, fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>{s.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{s.role}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════
   PAGE: IMPACT & BENEFITS
   ══════════════════════════════════════════════════ */
function ImpactPage() {
  const impactCards = [
    {
      icon: '🎯', title: 'Target Applications', color: 'var(--cyan)',
      items: [
        'Traffic corridors & roadside hotspots',
        'Construction & dust-prone demolition zones',
        'Industrial & institutional campuses',
        'Urban public spaces & smart city nodes',
        'Localized high-pollution micro-zones',
      ],
    },
    {
      icon: '🌍', title: 'Social & Economic Benefits', color: 'var(--green)',
      items: [
        'Automatic operation — no continuous manual supervision',
        'Condition-based misting reduces unnecessary water use',
        'Modular design supports replication at multiple sites',
        'Cloud data logging enables maintenance optimisation',
        'Potentially lower OpEx vs. continuous spray systems',
      ],
    },
    {
      icon: '🌱', title: 'Environmental Impact', color: 'var(--teal)',
      items: [
        'Fine mist promotes particulate settling in treated zone',
        'Humidity feedback avoids over-misting beyond RH limit',
        'Sensor-based operation enables targeted intervention',
        'Contributes to cleaner urban micro-environments',
        'Future multi-zone networking for coordinated control',
      ],
    },
  ];

  const appZones = [
    { zone: 'Roadside / Traffic Corridors',    desc: 'Localised PM hotspot monitoring + auto misting' },
    { zone: 'Construction & Demolition Zones', desc: 'Dust-prone area monitoring with condition-based suppression' },
    { zone: 'Industrial / Campus Areas',       desc: 'Continuous sensing with automated intervention' },
    { zone: 'Smart City Hotspots',             desc: 'Multiple ESP32 nodes share data for zone-wise control' },
    { zone: 'Indoor / Semi-Open Spaces',       desc: 'Air quality monitoring with humidity-aware mist control' },
    { zone: 'Remote Monitoring',               desc: 'Cloud dashboard shows sensor values, mist status & alerts' },
  ];

  return (
    <>
      <div className="section-header">
        <div className="section-title">Impact &amp; Benefits</div>
        <div className="section-subtitle">Potential impact across social, economic & environmental dimensions</div>
      </div>

      <div className="impact-grid" style={{ marginBottom: 24 }}>
        {impactCards.map(c => (
          <div className="impact-card" key={c.title} style={{ borderTop: `3px solid ${c.color}` }}>
            <div className="impact-card-icon" style={{ background: `${c.color}18` }}>{c.icon}</div>
            <h3 style={{ color: c.color }}>{c.title}</h3>
            <ul>{c.items.map(i => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>

      <div className="section-header">
        <div className="section-title">Application Zones</div>
        <div className="section-subtitle">Detect → Decide → Mist → Re-measure: adaptive feedback loop</div>
      </div>

      <div className="grid-2">
        {appZones.map(z => (
          <div className="card" key={z.zone} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <ChevronRight size={16} style={{ color: 'var(--cyan)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4 }}>{z.zone}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{z.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════
   PAGE: FEASIBILITY
   ══════════════════════════════════════════════════ */
function FeasibilityPage() {
  const cols = [
    {
      title: 'Feasibility', color: 'var(--green)', icon: '✅',
      items: [
        'ESP32, sensors, relay and atomizer are commercially available',
        '5 V controller section operates independently from 24 V atomizer supply',
        'Automatic feedback minimises dependence on manual switching',
        'Modular architecture scales to additional sensing or communication',
      ],
    },
    {
      title: 'Challenges / Risks', color: 'var(--orange)', icon: '⚠️',
      items: [
        'MQ sensors need calibration and may drift or cross-react',
        'Humidity affects both mist behaviour and particulate measurements',
        'Water quality can cause atomizer deposits/scaling over time',
        'Outdoor use requires electrical and weather protection enclosure',
        'Threshold operation can cause rapid ON/OFF switching near limits',
      ],
    },
    {
      title: 'Mitigation Strategies', color: 'var(--cyan)', icon: '🛡️',
      items: [
        'Calibrate with a reference PM/air-quality instrument on deployment',
        'Use filtering, hysteresis or a time delay to stabilise decisions',
        'Use clean/treated water and plan periodic atomizer maintenance',
        'Use fuse/protection, insulated enclosure and safe 24 V wiring',
        'Test across temperature/RH conditions before field deployment',
      ],
    },
  ];

  return (
    <>
      <div className="section-header">
        <div className="section-title">Feasibility &amp; Viability</div>
        <div className="section-subtitle">Analysis of feasibility · Potential challenges · Strategies for overcoming them</div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        {cols.map(c => (
          <div className="card" key={c.title} style={{ borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>{c.icon}</div>
            <h3 style={{ color: c.color, fontWeight: 800, fontSize: '1rem', marginBottom: 14 }}>{c.title}</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.items.map(i => (
                <li key={i} style={{ display: 'flex', gap: 8, fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <span style={{ color: c.color, flexShrink: 0, marginTop: 1 }}>›</span> {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card" style={{ background: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.25)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Eye size={20} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--cyan)', marginBottom: 6 }}>Validation Plan</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Compare PM2.5 response and misting effectiveness with a calibrated/reference monitor before making
              quantified AQI-reduction claims. Log 24-hour data to ThingSpeak and evaluate misting cycle counts,
              humidity recovery time, and PM2.5 delta to validate system efficacy.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════
   ROOT APP
   ══════════════════════════════════════════════════ */
const NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: Home,       badge: null },
  { id: 'technical',   label: 'Technical',   icon: Settings,   badge: null },
  { id: 'impact',      label: 'Impact',      icon: Info,       badge: null },
  { id: 'feasibility', label: 'Feasibility', icon: CheckCircle, badge: null },
];

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { readings, history, misting, aqiInfo } = useSensorData();

  const pageTitle = {
    dashboard:   'Live Dashboard',
    technical:   'Technical Approach',
    impact:      'Impact & Benefits',
    feasibility: 'Feasibility & Viability',
  }[activePage];

  return (
    <div className="app-wrapper">
      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">🌬️</div>
            <div>
              <div className="logo-text">Aqiconic</div>
              <div className="logo-sub">SIH 2026 · Team Dashboard</div>
            </div>
            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item ${activePage === n.id ? 'active' : ''}`}
              onClick={() => {
                setActivePage(n.id);
                setSidebarOpen(false);
              }}
            >
              <n.icon className="nav-icon" size={18} />
              {n.label}
              {n.badge && <span className="nav-badge">{n.badge}</span>}
            </button>
          ))}

          <div className="nav-section-label">System Info</div>
          <div style={{ padding: '8px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>DEVICE</span><br />
              ESP32 DevKit V1
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>FIRMWARE</span><br />
              Arduino IDE v2.x
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>PROTOCOL</span><br />
              MQTT / ThingSpeak
            </div>
          </div>

          <div className="nav-section-label">Relay Status</div>
          <div style={{ padding: '8px 14px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: misting ? 'rgba(56,189,248,0.1)' : 'var(--bg-elevated)',
              border: `1px solid ${misting ? 'rgba(56,189,248,0.3)' : 'var(--border-dim)'}`,
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: misting ? 'var(--cyan)' : 'var(--text-muted)',
                boxShadow: misting ? '0 0 8px var(--cyan)' : 'none',
                animation: misting ? 'pulse-dot 1.5s infinite' : 'none',
              }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: misting ? 'var(--cyan)' : 'var(--text-secondary)' }}>
                {misting ? 'Atomizer ON' : 'Atomizer OFF'}
              </div>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-pill">
            <div className="status-dot" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>ESP32 Online</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Live sensor feed · 3s interval</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-logo">
              <div className="topbar-logo-icon">🌬️</div>
              <div className="topbar-logo-text">Aqionic</div>
            </div>
            <div className="topbar-title">{pageTitle}</div>
          </div>
          <div className="topbar-right">
            <div className="live-badge">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 1.5s infinite' }} />
              LIVE
            </div>
            <LiveClock />
          </div>
        </div>

        <div className="page-content">
          {activePage === 'dashboard'   && <DashboardPage readings={readings} history={history} misting={misting} aqiInfo={aqiInfo} />}
          {activePage === 'technical'   && <TechPage />}
          {activePage === 'impact'      && <ImpactPage />}
          {activePage === 'feasibility' && <FeasibilityPage />}
        </div>
      </main>
    </div>
  );
}
