import React from "react";
import { motion } from "framer-motion";

const THEMES = {
  calm: {
    pulseDuration: 3.5,
    floatDuration: 6.0,
    ringSpeed: 25,
    scaleMultiplier: 1.0,
    pulseScale: [1, 1.04, 1],
    description: "Somatic Baseline Stable"
  },
  stress: {
    pulseDuration: 2.2,
    floatDuration: 4.0,
    ringSpeed: 15,
    scaleMultiplier: 1.06,
    pulseScale: [1, 1.08, 1],
    description: "Somatic Tension Alert"
  },
  panic: {
    pulseDuration: 1.2,
    floatDuration: 2.5,
    ringSpeed: 9,
    scaleMultiplier: 1.15,
    pulseScale: [1, 1.15, 1],
    description: "Emergency Mode Active"
  },
  sad: {
    pulseDuration: 5.5,
    floatDuration: 8.0,
    ringSpeed: 30,
    scaleMultiplier: 0.92,
    pulseScale: [1, 1.02, 1],
    description: "Muted Low Energy"
  },
  energetic: {
    pulseDuration: 2.0,
    floatDuration: 3.5,
    ringSpeed: 11,
    scaleMultiplier: 1.1,
    pulseScale: [1, 1.12, 1],
    description: "Active Somatic Vitality"
  },

  // Pain Level Categories
  Mild: {
    pulseDuration: 3.2,
    floatDuration: 5.5,
    ringSpeed: 22,
    scaleMultiplier: 1.0,
    pulseScale: [1, 1.04, 1],
    description: "Mild Somatic Baseline"
  },
  Moderate: {
    pulseDuration: 2.0,
    floatDuration: 3.8,
    ringSpeed: 14,
    scaleMultiplier: 1.08,
    pulseScale: [1, 1.09, 1],
    description: "Moderate Somatic Discomfort"
  },
  Severe: {
    pulseDuration: 1.2,
    floatDuration: 2.4,
    ringSpeed: 8,
    scaleMultiplier: 1.18,
    pulseScale: [1, 1.16, 1],
    description: "Severe Pain Activity"
  },
  Critical: {
    pulseDuration: 0.65, // Fast heart beat rate
    floatDuration: 1.5,
    ringSpeed: 5,
    scaleMultiplier: 1.28,
    pulseScale: [0.96, 1.26, 0.96], // Heartbeat pumping simulation
    description: "CRITICAL SYMPTOM CRISIS"
  }
};

export default function AIOrb({ emotion = "calm", painLevel = "Mild", isSpeaking = false, isListening = false }) {
  // Active pain level dictates the main visual state, falling back to emotional baseline if not defined
  const themeKey = painLevel || emotion || "calm";
  const current = THEMES[themeKey] || THEMES.calm;

  let finalPulseScale = current.pulseScale;
  let finalPulseDuration = current.pulseDuration;
  let finalFloatDuration = current.floatDuration;

  if (isListening) {
    finalPulseScale = [1, 1.16, 0.95, 1.12, 1];
    finalPulseDuration = 0.95;
    finalFloatDuration = 1.8;
  } else if (isSpeaking) {
    finalPulseScale = [1, 1.2, 0.98, 1.14, 1];
    finalPulseDuration = 1.25;
    finalFloatDuration = 2.2;
  }

  // Derive dynamic color schemes based on the root CSS variables for smooth gradient transitions
  const c1 = "hsl(var(--theme-h), var(--theme-s), var(--theme-l))";
  const c2 = "hsl(calc(var(--theme-h) + 32), var(--theme-s), calc(var(--theme-l) - 15%))";
  const glowShadow = "0 0 80px hsl(var(--theme-h), var(--theme-s), var(--theme-l), 0.45)";

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      
      {/* Dynamic Ambient Blur Core */}
      <div 
        className="absolute rounded-full filter blur-[65px] opacity-40 transition-all duration-[1200ms] ease-in-out pointer-events-none"
        style={{
          width: `${230 * current.scaleMultiplier}px`,
          height: `${230 * current.scaleMultiplier}px`,
          backgroundColor: c1,
          boxShadow: glowShadow
        }}
      />

      {/* Floating Orbital Wrapper */}
      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={{
          duration: finalFloatDuration,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative flex items-center justify-center z-10 cursor-pointer"
        style={{
          width: "220px",
          height: "220px"
        }}
      >
        
        {/* Outer Circular HUD Compass 1 */}
        <motion.div 
          className="absolute border border-dashed rounded-full pointer-events-none opacity-20 transition-all duration-1000"
          style={{
            borderColor: c1,
            width: "250px",
            height: "250px"
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: current.ringSpeed * 1.6,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Outer Circular HUD Compass 2 (Counter-Clockwise Dotted Tracker) */}
        <motion.div 
          className="absolute border border-dotted rounded-full pointer-events-none opacity-30 transition-all duration-1000"
          style={{
            borderColor: c2,
            width: "215px",
            height: "215px"
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: current.ringSpeed,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Pulsing Radial Expansion Ring (ECG Wave Ring) */}
        <motion.div 
          className="absolute rounded-full pointer-events-none transition-all duration-1000"
          style={{
            border: `2px solid ${c1}`,
            width: "170px",
            height: "170px",
            boxShadow: `0 0 30px hsl(var(--theme-h), var(--theme-s), var(--theme-l), 0.35)`
          }}
          animate={{
            scale: isListening ? [1, 1.45, 1] : [1, 1.32, 1],
            opacity: [0.7, 0.05, 0.7]
          }}
          transition={{
            duration: finalPulseDuration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Central Holographic Orb Sphere */}
        <motion.div
          animate={{
            scale: finalPulseScale,
            boxShadow: isListening 
              ? [`0 0 40px ${c1}`, `0 0 80px ${c1}`, `0 0 40px ${c1}`] 
              : [`0 0 30px ${c2}`, `0 0 65px ${c1}`, `0 0 30px ${c2}`]
          }}
          transition={{
            duration: finalPulseDuration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative rounded-full w-32 h-32 overflow-hidden flex items-center justify-center transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, ${c1} 0%, ${c2} 72%, #020617 100%)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />
          
          {/* Internal Swirling Plasma Waveform */}
          <motion.div 
            className="absolute rounded-full opacity-40 transition-all duration-1000"
            style={{
              width: "125%",
              height: "125%",
              border: `2px dashed ${c1}`,
              background: `radial-gradient(circle, transparent 25%, ${c2} 100%)`
            }}
            animate={{
              rotate: [0, 180, 360],
              borderRadius: ["42% 58% 70% 30% / 45% 45% 55% 55%", "68% 32% 55% 45% / 55% 45% 65% 35%", "42% 58% 70% 30% / 45% 45% 55% 55%"]
            }}
            transition={{
              duration: finalPulseDuration * 2.2,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Real-time Voice Frequency Visualizer Core */}
          <div className="relative z-10 flex flex-col items-center">
            {isListening ? (
              <div className="flex items-end justify-center space-x-1 h-8">
                <span className="sound-bar text-white animate-wave" style={{ animationDelay: "0.1s" }} />
                <span className="sound-bar text-white animate-wave" style={{ animationDelay: "0.3s" }} />
                <span className="sound-bar text-white animate-wave" style={{ animationDelay: "0.5s" }} />
                <span className="sound-bar text-white animate-wave" style={{ animationDelay: "0.2s" }} />
              </div>
            ) : isSpeaking ? (
              <motion.div
                animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.45, repeat: Infinity }}
                className="w-4.5 h-4.5 rounded-full bg-white shadow-[0_0_15px_#fff]"
              />
            ) : (
              <motion.div 
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3.5 h-3.5 rounded-full bg-white/90 blur-[0.8px] shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Mood/Pain status text under the orb */}
      <span className="mt-4 font-display text-xs tracking-widest text-slate-400 uppercase select-none flex items-center gap-2">
        <span 
          className="inline-block w-1.5 h-1.5 rounded-full animate-ping transition-colors duration-1000"
          style={{ backgroundColor: themeKey === "Critical" ? "#ef4444" : themeKey === "Severe" ? "#f97316" : themeKey === "Moderate" ? "#a855f7" : "#0ea5e9" }}
        />
        Bio-Core Status: <span className="font-bold text-glow transition-colors duration-1000" style={{ color: themeKey === "Critical" ? "#ef4444" : themeKey === "Severe" ? "#f97316" : themeKey === "Moderate" ? "#a855f7" : "#0ea5e9" }}>{current.description}</span>
      </span>
    </div>
  );
}

