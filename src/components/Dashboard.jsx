import React from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  Flame, 
  Heart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  Clock,
  Compass,
  Cpu,
  ShieldAlert,
  HeartPulse
} from "lucide-react";

// Helper component for radial progress rings
const RadialGauge = ({ value, label, color, icon: Icon, unit = "%" }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-xl border border-white/5 backdrop-blur-sm shadow-inner transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(255,255,255,0.02)]">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Track Ring */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="stroke-slate-900"
            strokeWidth="5.5"
            fill="transparent"
          />
          {/* Animated Glowing Value Ring */}
          <motion.circle
            cx="40"
            cy="40"
            r={radius}
            stroke={color}
            strokeWidth="5.5"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        {/* Icon & Value Centered */}
        <div className="absolute flex flex-col items-center justify-center">
          <Icon className="w-4.5 h-4.5 mb-0.5 opacity-65" style={{ color }} />
          <span className="text-sm font-display font-bold text-white">{value}{unit}</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-400 mt-2.5 font-display uppercase tracking-widest text-center">{label}</span>
    </div>
  );
};

// Interactive SVG Stress Radar mapping 5 vital points
const StressRadar = ({ painIntensity, stressScore, energyLevel, themeHex }) => {
  // Map parameters to 5 points (Tension, Pulse, Fatigue, Acidity, Focus)
  const tension = Math.min(20 + (painIntensity * 8), 100);
  const pulse = Math.min(60 + (painIntensity * 4), 100);
  const fatigue = Math.min(15 + (painIntensity * 7), 100);
  const acidity = Math.min(10 + (painIntensity * 6), 100);
  const focus = Math.max(90 - (painIntensity * 8), 15);

  // Center coordinate: (60, 60), Max Radius: 50
  // Convert polar coordinates to Cartesian for 5 axes (72 degrees spacing)
  const getPoint = (val, idx) => {
    const angle = (idx * 72 - 90) * (Math.PI / 180);
    const r = (val / 100) * 50;
    const x = 60 + r * Math.cos(angle);
    const y = 60 + r * Math.sin(angle);
    return `${x},${y}`;
  };

  const points = [
    getPoint(tension, 0), // Axis 0: Tension (Top)
    getPoint(pulse, 1),   // Axis 1: Pulse (Right-ish)
    getPoint(fatigue, 2), // Axis 2: Fatigue (Bottom-Right)
    getPoint(acidity, 3), // Axis 3: Acidity (Bottom-Left)
    getPoint(focus, 4)    // Axis 4: Focus (Left-ish)
  ].join(" ");

  const radarColor = themeHex;
  const radarFill = painIntensity >= 9 
    ? "rgba(239, 68, 68, 0.25)" 
    : painIntensity >= 7 
    ? "rgba(249, 115, 22, 0.25)" 
    : painIntensity >= 4 
    ? "rgba(168, 85, 247, 0.25)" 
    : "rgba(14, 165, 233, 0.2)";

  return (
    <div className="flex flex-col items-center p-4 bg-slate-950/40 rounded-xl border border-white/5 h-full transition-all duration-300 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      <h4 className="text-[10px] font-display uppercase tracking-widest text-slate-400 mb-3 text-center flex items-center gap-1.5">
        <Compass className="w-3.5 h-3.5 text-[var(--theme-color)] transition-colors duration-1000 animate-spin-slow" />
        Somatic Stress Radar
      </h4>
      <div className="relative w-[130px] h-[130px] flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          {/* Grid Hexagons/Circles */}
          <circle cx="60" cy="60" r="50" className="stroke-slate-800/60" strokeWidth="0.8" fill="none" />
          <circle cx="60" cy="60" r="35" className="stroke-slate-800/40" strokeWidth="0.8" fill="none" strokeDasharray="1,4" />
          <circle cx="60" cy="60" r="20" className="stroke-slate-800/30" strokeWidth="0.8" fill="none" />
          
          {/* Axis Spoke Lines */}
          {[0, 1, 2, 3, 4].map(idx => {
            const angle = (idx * 72 - 90) * (Math.PI / 180);
            const x = 60 + 50 * Math.cos(angle);
            const y = 60 + 50 * Math.sin(angle);
            return <line key={idx} x1="60" y1="60" x2={x} y2={y} className="stroke-slate-800/50" strokeWidth="0.8" />;
          })}

          {/* Dynamic Radar Fill Area */}
          <motion.polygon
            points={points}
            stroke={radarColor}
            strokeWidth="1.5"
            fill={radarFill}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8 }}
            className="transition-all duration-700"
          />

          {/* Core Diagnostic center dot */}
          <circle cx="60" cy="60" r="2" fill="#fff" />
        </svg>
      </div>
      
      {/* Legend layout */}
      <div className="flex justify-between w-full mt-2.5 text-[8px] font-mono text-slate-500">
        <span>TENSION</span>
        <span>FATIGUE</span>
        <span>FOCUS</span>
      </div>
    </div>
  );
};

// Horizontal gradient mapping Calms vs Panics
const EmotionalSpectrum = ({ activeEmotion, themeHex }) => {
  const spectrums = {
    calm: { label: "CALM", offset: "10%" },
    energetic: { label: "VITALITY", offset: "32%" },
    sad: { label: "MUTED", offset: "54%" },
    stress: { label: "STRESSED", offset: "76%" },
    panic: { label: "CRITICAL", offset: "94%" }
  };

  const current = spectrums[activeEmotion] || spectrums.calm;

  return (
    <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 text-xs w-full transition-all duration-300 hover:border-white/10">
      <h4 className="text-[10px] font-display uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-emerald-400" />
        Neural Emotional Spectrum
      </h4>
      
      <div className="relative w-full h-3 rounded-full mt-4 bg-gradient-to-r from-sky-500 via-emerald-500 via-gray-500 via-purple-500 to-red-500 border border-white/5 shadow-inner">
        {/* Pointer indicator */}
        <motion.div
          animate={{ left: current.offset }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="absolute -top-2 w-4 h-4 rounded-full bg-white border-2 border-slate-950 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10 -ml-2"
        />
      </div>

      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mt-2.5 uppercase">
        <span>Calm</span>
        <span>Active</span>
        <span>Muted</span>
        <span>Stress</span>
        <span>Alert</span>
      </div>
      
      <div className="mt-3 border-t border-white/5 pt-2 flex justify-between text-[9px] text-slate-500">
        <span>Spectrum State:</span>
        <span className="font-bold uppercase tracking-wider transition-colors duration-1000" style={{ color: themeHex }}>
          {current.label}
        </span>
      </div>
    </div>
  );
};

// Scrolling ECG Vital Pulsewave Graph Card
const ECGPulseMonitor = ({ painIntensity, themeHex }) => {
  // Speed of scrolling ECG wave based on intensity
  const speed = painIntensity >= 9 ? 0.8 : painIntensity >= 7 ? 1.4 : painIntensity >= 4 ? 2.2 : 3.4;

  return (
    <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 text-xs w-full overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      <h4 className="text-[10px] font-display uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <HeartPulse className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          ECG Real-Time Vital Monitor
        </span>
        <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
          LIVE FEED
        </span>
      </h4>

      <div className="relative w-full h-10 bg-slate-950/70 border border-white/5 rounded-lg overflow-hidden flex items-center">
        {/* Animated Scrolling Wave Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

        {/* Double-width SVG to allow infinite continuous scrolling */}
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", repeat: Infinity, duration: speed }}
          className="flex w-[200%] h-full items-center select-none"
        >
          {/* SVG Wave Pattern */}
          <svg className="w-1/2 h-full" viewBox="0 0 300 50" preserveAspectRatio="none">
            <path
              d="M 0,25 L 30,25 L 45,25 L 50,20 L 55,30 L 60,25 L 75,25 L 80,25 L 85,15 L 90,45 L 95,20 L 100,25 L 115,25 L 125,25 L 130,25 L 160,25 L 175,25 L 180,20 L 185,30 L 190,25 L 205,25 L 210,25 L 215,15 L 220,45 L 225,20 L 230,25 L 245,25 L 255,25 L 260,25 L 290,25 M 300,25"
              fill="none"
              stroke={themeHex}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {/* Repeating identical wave to make scroll seamless */}
          <svg className="w-1/2 h-full" viewBox="0 0 300 50" preserveAspectRatio="none">
            <path
              d="M 0,25 L 30,25 L 45,25 L 50,20 L 55,30 L 60,25 L 75,25 L 80,25 L 85,15 L 90,45 L 95,20 L 100,25 L 115,25 L 125,25 L 130,25 L 160,25 L 175,25 L 180,20 L 185,30 L 190,25 L 205,25 L 210,25 L 215,15 L 220,45 L 225,20 L 230,25 L 245,25 L 255,25 L 260,25 L 290,25 M 300,25"
              fill="none"
              stroke={themeHex}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>

      <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 mt-1.5 uppercase">
        <span>Sweep Rate: {painIntensity >= 9 ? "MAX" : painIntensity >= 7 ? "FAST" : "NORMAL"}</span>
        <span>Resolution: 60Hz</span>
      </div>
    </div>
  );
};

export default function Dashboard({ analysis, history, painIntensity = 3, activeTheme = {}, cameraBiometrics = {} }) {
  // Destructure custom next-gen responses or fallback
  const data = analysis || {
    detected_emotion: "calm",
    pain_level: activeTheme.key || "Mild",
    stress_score: cameraBiometrics.stressLevel || 20,
    wellness_score: Math.max(95 - (painIntensity * 6), 5),
    energy_level: cameraBiometrics.focusLevel || 80,
    burnout_risk: Math.min(15 + (painIntensity * 7.5), 100),
    wellness_indicators: ["Optical Scanner Initialized"],
    urgency_level: painIntensity >= 7 ? "High" : painIntensity >= 4 ? "Medium" : "Low",
    urgency_reason: "Operational baseline stable.",
    memory_recall: "Somatic database loaded. Session log syncing...",
    emergency_mode: painIntensity >= 9
  };

  const themeHex = activeTheme.hex || "#0ea5e9";

  // Compile timeline from previous turns
  const emotionHistory = history
    .filter(h => h.analysis)
    .map(h => ({
      time: h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
      emotion: h.analysis.detected_emotion,
      pain: h.analysis.pain_level || "Mild",
      text: h.text
    }));

  return (
    <div className="space-y-6 w-full">
      
      {/* Emergency Red Alert Recommendation Card */}
      {data.emergency_mode && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-4 bg-red-950/20 border-2 border-red-500 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.2)] critical-flash-border select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-full border border-red-500/30 text-red-500 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-display font-extrabold text-red-500 tracking-wider uppercase m-0 leading-none">
                🚨 CRITICAL EMERGENCY MODE ACTIVE 🚨
              </h3>
              <p className="text-[10px] text-red-300 font-mono mt-1.5 leading-relaxed max-w-md">
                Cardiorespiratory distress or high-VAS pain indicators have triggered emergency protocols. Remain fully static, engage in slow controlled breathing, and notify nearby caregivers. Call emergency services if symptoms worsen.
              </p>
            </div>
          </div>
          <button
            onClick={() => alert("Emergency Services simulated alert broadcasted! Please call emergency services in real life if in distress.")}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-display text-xs font-bold rounded-xl border border-red-500/20 tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-bounce transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <HeartPulse className="w-4 h-4 animate-pulse" />
            TRIGGER ALERTS
          </button>
        </motion.div>
      )}

      {/* 1. Primary Metrics Radial Rings */}
      <div className="grid grid-cols-3 gap-3">
        <RadialGauge 
          value={data.stress_score} 
          label="Stress Score" 
          color={themeHex} 
          icon={Flame} 
        />
        <RadialGauge 
          value={data.wellness_score} 
          label="Wellness Rate" 
          color="#10b981" 
          icon={Heart} 
        />
        <RadialGauge 
          value={data.energy_level} 
          label="Vital Energy" 
          color="#3b82f6" 
          icon={Activity} 
        />
      </div>

      {/* 2. ECG Vital Monitor Card */}
      <ECGPulseMonitor painIntensity={painIntensity} themeHex={themeHex} />

      {/* 3. Interactive Stress Radar & Spectrum Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Radar Map (Span 5) */}
        <div className="md:col-span-5">
          <StressRadar 
            painIntensity={painIntensity} 
            stressScore={data.stress_score} 
            energyLevel={data.energy_level} 
            themeHex={themeHex}
          />
        </div>
        {/* Spectrum Tracker (Span 7) */}
        <div className="md:col-span-7 flex flex-col justify-between gap-3">
          <EmotionalSpectrum activeEmotion={data.detected_emotion} themeHex={themeHex} />
          
          {/* Extra Vital Burnout Card */}
          <div className="p-4 bg-slate-950/40 rounded-xl border border-white/5 flex justify-between items-center relative overflow-hidden transition-all duration-300 hover:border-white/10">
            <div>
              <span className="text-[10px] text-slate-500 font-display uppercase tracking-widest">Cognitive Burnout risk</span>
              <div 
                className="text-2xl font-display font-extrabold text-glow tracking-tight mt-0.5 transition-colors duration-1000" 
                style={{ color: data.burnout_risk > 70 ? "#ef4444" : data.burnout_risk > 45 ? "#f97316" : "#10b981" }}
              >
                {data.burnout_risk}%
              </div>
            </div>
            {data.burnout_risk > 50 && (
              <div 
                className="flex-shrink-0 p-1.5 rounded-full bg-red-950/40 border transition-all duration-1000"
                style={{ 
                  borderColor: data.burnout_risk > 75 ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.3)",
                  color: data.burnout_risk > 75 ? "#ef4444" : "#f97316"
                }}
              >
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Somatotopic Symptoms & Medical Memory Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clicked Pain regions log */}
        <div className="glass-panel border-white/5 rounded-xl p-4.5 transition-all duration-300 hover:border-white/10">
          <h3 className="text-[10px] font-display uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-sky-400" />
            Registered Symptoms
          </h3>
          <div className="flex flex-wrap gap-2 mt-1">
            {data.wellness_indicators && data.wellness_indicators.map((ind, i) => (
              <span 
                key={i} 
                className="text-[10px] px-2.5 py-1 rounded bg-slate-950/70 border border-white/10 text-slate-300 font-semibold tracking-wide uppercase font-mono"
              >
                🩺 {ind}
              </span>
            ))}
          </div>

          <div className="mt-4 p-3 rounded bg-slate-950/50 border border-white/5">
            <div className="flex justify-between items-center text-[10px] font-display">
              <span className="text-slate-500 tracking-wider">DIAGNOSTICS INDEX</span>
              <span className="font-bold tracking-widest transition-colors duration-1000" style={{ color: themeHex }}>
                {data.pain_level.toUpperCase()}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full transition-all duration-1000"
                style={{ 
                  width: `${painIntensity * 10}%`,
                  backgroundColor: themeHex
                }}
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-2 font-mono leading-relaxed">
              {data.urgency_reason}
            </p>
          </div>
        </div>

        {/* Dynamic Memory Agent Log */}
        <div className="glass-panel border-white/5 rounded-xl p-4.5 transition-all duration-300 hover:border-white/10">
          <h3 className="text-[10px] font-display uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-400" />
            Biometric Memory Logs
          </h3>
          <div className="bg-purple-950/10 border border-purple-500/10 rounded-lg p-3 text-[11px] text-purple-200 leading-relaxed font-mono">
            <strong>MEMORY AGENT VERBAL RECALL:</strong>
            <p className="text-purple-300/90 mt-1.5 italic font-sans">"{data.memory_recall}"</p>
          </div>
        </div>
      </div>

      {/* 5. Timeline Tracker */}
      <div className="glass-panel border-white/5 rounded-xl p-4.5 transition-all duration-300 hover:border-white/10">
        <h3 className="text-[10px] font-display uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          Biometric Alignment Timeline
        </h3>
        <div className="space-y-3 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
          {emotionHistory.slice(-3).reverse().map((item, idx) => (
            <div key={idx} className="flex gap-4 items-start text-xs relative">
              <span className="w-9 text-slate-500 font-mono text-[9px] text-right mt-1.5">{item.time}</span>
              <div 
                className="w-2.5 h-2.5 rounded-full z-10 border-2 mt-2 flex-shrink-0"
                style={{ 
                  backgroundColor: item.pain === "Critical" ? "#ef4444" : item.pain === "Severe" ? "#f97316" : item.pain === "Moderate" ? "#a855f7" : "#0ea5e9",
                  borderColor: "#030712"
                }}
              />
              <div className="flex-1 bg-slate-950/40 border border-white/5 p-2.5 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-display uppercase tracking-widest text-[9px] font-bold" style={{ color: item.pain === "Critical" ? "#ef4444" : item.pain === "Severe" ? "#f97316" : item.pain === "Moderate" ? "#a855f7" : "#0ea5e9" }}>
                    {item.pain} LEVEL
                  </span>
                  <span className="text-[8px] font-mono text-slate-500">SYSTEM STATUS: ARCHIVED</span>
                </div>
                <p className="text-slate-400 italic text-[11px] truncate">"{item.text}"</p>
              </div>
            </div>
          ))}
          {emotionHistory.length === 0 && (
            <p className="text-xs text-slate-500 text-center italic py-2">No diagnostics logged yet. Open console feeds.</p>
          )}
        </div>
      </div>

    </div>
  );
}

