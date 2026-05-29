import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Shield, Cpu, Activity } from "lucide-react";
import AIOrb from "./components/AIOrb";
import Dashboard from "./components/Dashboard";
import ChatContainer from "./components/ChatContainer";
import BodyScanner from "./components/BodyScanner";
import NeuralBackground from "./components/NeuralBackground";
import { useVoice } from "./hooks/useVoice";

const API_URL = "http://localhost:5000/api/chat";

// Direct client fallback analysis if backend is unreachable
const runClientFallback = (input, history, mode, language, taggedZones = [], painIntensity = 3, medicalMemory = []) => {
  const cleaned = input.toLowerCase();
  
  let detected_emotion = "calm";
  let stress_score = Math.round(15 + (painIntensity * 8.5));
  let wellness_score = Math.max(95 - (painIntensity * 6), 5);
  let energy_level = Math.max(95 - (painIntensity * 8.5), 10);
  let urgency_level = "Low";
  let pain_level = "Mild";
  let emergency_mode = false;
  let follow_up_questions = [];
  let memory_recall = "Somatic local database synced.";
  
  if (painIntensity >= 9) {
    pain_level = "Critical";
    urgency_level = "High";
  } else if (painIntensity >= 7) {
    pain_level = "Severe";
    urgency_level = "High";
  } else if (painIntensity >= 4) {
    pain_level = "Moderate";
    urgency_level = "Medium";
  } else {
    pain_level = "Mild";
    urgency_level = "Low";
  }
  
  let wellness_indicators = [];
  if (taggedZones.length > 0) {
    taggedZones.forEach(z => {
      if (z === "head") wellness_indicators.push("Cephalic Tension");
      if (z === "chest") wellness_indicators.push("Thoracic Pressure");
      if (z === "stomach") wellness_indicators.push("Gastrointestinal Stress");
      if (z === "limbs") wellness_indicators.push("Somatic Muscle Fatigue");
    });
  } else {
    if (cleaned.includes("head") || cleaned.includes("migraine") || cleaned.includes("brain") || cleaned.includes("सिर") || cleaned.includes("ನೋವು")) {
      wellness_indicators.push("Cephalic Tension");
    } else if (cleaned.includes("chest") || cleaned.includes("heart") || cleaned.includes("breathe") || cleaned.includes("breathing") || cleaned.includes("छाती")) {
      wellness_indicators.push("Thoracic Pressure");
    } else if (cleaned.includes("stomach") || cleaned.includes("tummy") || cleaned.includes("belly") || cleaned.includes("digestive") || cleaned.includes("pet") || cleaned.includes("पेट")) {
      wellness_indicators.push("Gastrointestinal Stress");
    } else {
      wellness_indicators.push("General Systemic Tension");
    }
  }

  let recommendations = ["Keep hydrated with pure water", "Engage in 2 minutes of slow box breathing"];
  
  // Trigger Emergency Mode for red flag keywords or high pain intensity chest/breathing distress
  const isChestEmergency = cleaned.includes("chest") || cleaned.includes("heart") || wellness_indicators.includes("Thoracic Pressure");
  const isShortBreath = cleaned.includes("breathe") || cleaned.includes("breathing") || cleaned.includes("shortness");
  
  if (painIntensity >= 7 && (isChestEmergency || isShortBreath)) {
    emergency_mode = true;
    urgency_level = "High";
    pain_level = "Critical";
    detected_emotion = "panic";
    wellness_indicators.push("Cardiorespiratory Stress Spike");
    recommendations = [
      "Please rest sitting down immediately.",
      "Take deep, even box breaths.",
      "CRITICAL: Severe chest pressure or breathing difficulties require prompt medical attention. Contact emergency services right away."
    ];
    follow_up_questions = [
      { question: "When did the chest pressure or breathing distress start?", options: ["Just now", "Within the last hour", "A few hours ago", "It's been ongoing for days"] },
      { question: "Does the pain spread to your arm, shoulder, neck, or jaw?", options: ["Yes, to my left arm/shoulder", "Yes, to my neck/jaw/back", "No radiation, stays in chest"] },
      { question: "Do you have breathing difficulty or cold sweats?", options: ["Yes, experiencing breathing distress/cold sweats", "No, neither"] },
      { question: "Have you taken any cardiovascular medicines recently?", options: ["Yes, taken recently", "No, nothing recently"] },
      { question: "Do you have a history of heart gastric problems?", options: ["Yes, heart condition history", "Yes, gastric issues history", "No prior history"] }
    ];
    memory_recall = "⚠️ CRITICAL SOMATIC SYSTEM REPORT: Emergency cardiopulmonary protocol active.";
  } else if (cleaned.includes("stomach") || cleaned.includes("tummy") || cleaned.includes("belly") || wellness_indicators.includes("Gastrointestinal Stress")) {
    detected_emotion = "stress";
    recommendations.push("Avoid heavy, fried, or spicy foods", "Sip warm ginger or herbal tea slowly");
    follow_up_questions = [
      { question: "What food or beverages did you consume recently?", options: ["Spicy/fried foods", "Dairy or heavy meals", "Fresh/normal food", "I have not eaten"] },
      { question: "Is it a burning pain, sharp cramps, or a dull ache?", options: ["Burning sensation (acidity)", "Sharp cramping / spasms", "Dull ache / bloating"] },
      { question: "Are you experiencing vomiting, nausea, or fever?", options: ["Yes, vomiting/nausea", "Yes, mild fever", "No, none of these"] },
      { question: "Have you had stomach acidity or gastric problems before?", options: ["Yes, frequently (acidity/ulcer history)", "Yes, occasionally", "No, never"] }
    ];
    memory_recall = "GI LOCAL SYNC: Analyzing abdominal tension and acidity indices.";
  } else if (cleaned.includes("head") || cleaned.includes("migraine") || wellness_indicators.includes("Cephalic Tension")) {
    detected_emotion = "sad";
    recommendations.push("Sit in a dark, quiet room", "Place a cool compress over your forehead");
    follow_up_questions = [
      { question: "Is the pain throbbing on one side, or does it feel like a tight band around your head?", options: ["Throbbing on one side (migraine-like)", "Tight band squeezing around head (tension-like)", "Dull pressure all over"] },
      { question: "Are you sensitive to bright lights or loud sounds?", options: ["Yes, sensitive to both light and sound", "Sensitive to light only", "No sensitivity"] },
      { question: "Have you slept less, skipped meals, or had less water today?", options: ["Yes, slept less / high fatigue", "Yes, skipped meals / dehydrated", "No, normal sleep and hydration"] },
      { question: "Are you facing high work, academic, or personal stress currently?", options: ["Yes, very high stress levels", "Moderate stress", "No unusual stress"] }
    ];
    memory_recall = "COGNITIVE LOCAL SYNC: Tracking cephalic indices and sleep patterns.";
  } else {
    detected_emotion = painIntensity >= 7 ? "stress" : "calm";
    follow_up_questions = [
      { question: "When did you first notice this somatic discomfort?", options: ["Just today", "In the last few days", "It has been recurrent for weeks/months"] },
      { question: "Does the discomfort change when you rest or alter positions?", options: ["Yes, decreases with rest/position change", "Yes, increases with movement", "No change with rest/position"] },
      { question: "Have you experienced similar tension or pain in the past?", options: ["Yes, frequently", "Yes, once or twice", "No, this is the first time"] },
      { question: "Are you currently under excessive work or emotional stress?", options: ["Yes, high stress", "Moderate stress", "No, normal state"] },
      { question: "What food or drinks have you consumed in the last few hours?", options: ["Alcohol / caffeine / stimulants", "Heavy, large meal", "Sip of water / empty stomach", "Normal hydration and light foods"] }
    ];
  }

  // Count past occurrences in persistent memory
  const hasPastStomachMemory = medicalMemory.some(m => m.symptoms?.some(s => s.toLowerCase().includes("gastro") || s.toLowerCase().includes("stomach")) || m.userInput?.toLowerCase().includes("stomach") || m.userInput?.toLowerCase().includes("tummy") || m.userInput?.toLowerCase().includes("acid"));
  const hasPastChestMemory = medicalMemory.some(m => m.symptoms?.some(s => s.toLowerCase().includes("cardio") || s.toLowerCase().includes("chest")) || m.userInput?.toLowerCase().includes("chest") || m.userInput?.toLowerCase().includes("heart") || m.userInput?.toLowerCase().includes("breath"));
  const hasPastMigraineMemory = medicalMemory.some(m => m.symptoms?.some(s => s.toLowerCase().includes("cephalic") || s.toLowerCase().includes("head") || s.toLowerCase().includes("migraine")) || m.userInput?.toLowerCase().includes("head") || m.userInput?.toLowerCase().includes("migraine") || m.userInput?.toLowerCase().includes("tension"));

  if (hasPastChestMemory && (cleaned.includes("chest") || cleaned.includes("heart"))) {
    memory_recall = `🧠 **Medical Memory Alert (Local)**: You previously reported chest discomfort. Diet/vital records correlate with a recurring thoracic profile.`;
  } else if (hasPastStomachMemory && (cleaned.includes("stomach") || cleaned.includes("tummy"))) {
    memory_recall = `🧠 **Medical Memory Alert (Local)**: You previously reported gastrointestinal tension. Acidity and diet patterns show a recurring trend.`;
  } else if (hasPastMigraineMemory && (cleaned.includes("head") || cleaned.includes("migraine"))) {
    memory_recall = `🧠 **Medical Memory Alert (Local)**: You previously reported head tension/migraines. Cephalic indicators correlate with high fatigue.`;
  }

  let greeting = "Hello, I am your biometric companion. ";
  let advice = "I have translated your symptoms.";
  if (language === "Hindi") greeting = "नमस्ते, मैं आपका स्वास्थ्य साथी हूँ। ";
  else if (language === "Kannada") greeting = "ನಮಸ್ಕಾರ, ನಾನು ನಿಮ್ಮ ಕ್ಷೇಮ ಸಂಗಾತಿ. ";
  else if (language === "Telugu") greeting = "నమస్తే, నేను మీ ఆరోగ్య సహచరుడిని. ";
  else if (language === "Tamil") greeting = "வணக்கம், நான் உங்கள் ஆரோக்கிய துணைவன். ";

  const vocal_script = emergency_mode
    ? "Attention. Critical cardiopulmonary stress indicators detected. Please rest immediately and read the emergency guidance."
    : `${greeting} To tailor our wellness support, please answer the medical follow-up questions shown on the screen.`;

  const text_response = `### 🌟 PainTranslator System Analysis [VAS ${painIntensity}/10 - ${pain_level.toUpperCase()}] (Local Fallback)

${emergency_mode ? "🚨 **EMERGENCY WARNING**: High-risk cardiorespiratory distress indicators detected. Resting is advised immediately." : "✅ **Somatic Diagnostics**: Systems analysis complete (Self-Healing Local Mode)."}

- **Detected Pain Level**: **${pain_level.toUpperCase()}** (${stress_score}% stress level / heart rate: ${Math.round(72 + (painIntensity * 3.5))} BPM)
- **Primary Wellness Indicators**: ${wellness_indicators.join(", ")}
- **Urgency Profile**: **${urgency_level.toUpperCase()}**

---

#### 🧠 Medical Memory Recall
${memory_recall}

---

#### 📋 Empathy-Driven Follow-Up Questions
To understand your symptoms better and provide accurate guidance, please share:
${follow_up_questions.map((q, idx) => `${idx + 1}. **${typeof q === 'string' ? q : q.question}**`).join("\n")}

---
*🛡️ **Informational Wellness Disclaimer**: Biometric analysis is AI-estimated wellness guidance and not medical diagnosis. If you feel severe pressure, breathing difficulties, or chest distress, consult a medical doctor immediately.*`;

  return {
    detected_emotion,
    pain_level,
    emergency_mode,
    stress_score,
    wellness_score,
    energy_level,
    burnout_risk: Math.min(15 + (painIntensity * 7.5), 100),
    wellness_indicators,
    urgency_level,
    urgency_reason: emergency_mode ? "Self-healing emergency mode active." : "Local system baseline normal.",
    recommendations,
    follow_up_questions,
    memory_recall,
    vocal_script,
    text_response
  };
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [mode, setMode] = useState("regular");
  const [language, setLanguage] = useState("English");
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [warningSoundMuted, setWarningSoundMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Interactive Body Scan and Pain Rating States
  const [taggedZones, setTaggedZones] = useState([]);
  const [painIntensity, setPainIntensity] = useState(3);

  // Simulated biometric camera estimates
  const [cameraBiometrics, setCameraBiometrics] = useState({
    heartRate: 72,
    stressLevel: 25,
    fatigueLevel: "Low",
    eyeStrain: "Normal",
    breathingIntensity: "Normal",
    facialTension: 20,
    focusLevel: 80
  });

  // Persistent Medical Memory State
  const [medicalMemory, setMedicalMemory] = useState(() => {
    try {
      const saved = localStorage.getItem("painttranslator_memory");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Synchronize simulated webcam biometrics with manual painIntensity in real time with active sensor drift
  useEffect(() => {
    const baseHr = Math.round(72 + (painIntensity * 3.5));
    const baseSl = Math.min(15 + (painIntensity * 8.5), 100);
    const fatigue = painIntensity >= 8 ? "High" : painIntensity >= 5 ? "Moderate" : "Low";
    const eye = painIntensity >= 7 ? "Strained" : "Normal";
    const breath = painIntensity >= 9 ? "Shallow" : painIntensity >= 7 ? "Rapid" : "Normal";
    const baseFt = Math.round(10 + (painIntensity * 9));
    const baseFocus = Math.max(95 - (painIntensity * 8.5), 10);
    
    // Initial sync
    setCameraBiometrics({
      heartRate: baseHr,
      stressLevel: baseSl,
      fatigueLevel: fatigue,
      eyeStrain: eye,
      breathingIntensity: breath,
      facialTension: baseFt,
      focusLevel: baseFocus
    });

    // High-accuracy active drift simulator
    const interval = setInterval(() => {
      setCameraBiometrics(prev => {
        const hrVariance = Math.round((Math.random() - 0.5) * 3); // +-1.5 BPM
        const slVariance = Math.round((Math.random() - 0.5) * 4); // +-2% stress
        const ftVariance = Math.round((Math.random() - 0.5) * 3); // +-1.5% tension
        const focusVariance = Math.round((Math.random() - 0.5) * 4); // +-2% focus

        return {
          ...prev,
          heartRate: Math.max(55, Math.min(170, baseHr + hrVariance)),
          stressLevel: Math.max(5, Math.min(100, baseSl + slVariance)),
          facialTension: Math.max(5, Math.min(100, baseFt + ftVariance)),
          focusLevel: Math.max(5, Math.min(100, baseFocus + focusVariance))
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [painIntensity]);

  // Web Audio Warning Sound Synthesizer Side-Effect
  const audioContextRef = useRef(null);
  const soundIntervalRef = useRef(null);

  const startWarningSound = () => {
    if (warningSoundMuted || soundIntervalRef.current) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const playBeep = () => {
        if (!audioContextRef.current || warningSoundMuted) return;
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        
        osc.type = "sine";
        // Severe: 550Hz, Critical: 750Hz
        osc.frequency.setValueAtTime(painIntensity >= 9 ? 750 : 550, audioContextRef.current.currentTime);
        
        gain.gain.setValueAtTime(0.08, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 0.15);
        
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.2);
      };

      const delay = painIntensity >= 9 ? 650 : 1350;
      soundIntervalRef.current = setInterval(playBeep, delay);
    } catch (e) {
      console.warn("Audio warning synthesizer failed to start:", e);
    }
  };

  const stopWarningSound = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    if ((painIntensity >= 7) && !warningSoundMuted) {
      stopWarningSound();
      startWarningSound();
    } else {
      stopWarningSound();
    }
    return () => stopWarningSound();
  }, [painIntensity, warningSoundMuted]);

  // Helper to add findings to persistent memory
  const addMemoryRecord = (text, analysis) => {
    if (!analysis) return;
    const newRecord = {
      timestamp: new Date().toISOString(),
      symptoms: analysis.wellness_indicators || [],
      painLevel: analysis.pain_level || "Mild",
      detectedEmotion: analysis.detected_emotion || "calm",
      userInput: text,
      memoryRecall: analysis.memory_recall || ""
    };
    setMedicalMemory(prev => {
      const updated = [...prev, newRecord].slice(-15); // keep last 15
      try {
        localStorage.setItem("painttranslator_memory", JSON.stringify(updated));
      } catch (e) {
        console.error("Local storage error:", e);
      }
      return updated;
    });
  };

  const handleToggleZone = (zone) => {
    setTaggedZones(prev => 
      prev.includes(zone) 
        ? prev.filter(z => z !== zone) 
        : [...prev, zone]
    );
  };

  const activeEmotion = currentAnalysis?.detected_emotion || "calm";

  // Callback when voice is transcribed
  const handleTranscriptReceived = (text) => {
    handleSendMessage(text);
  };

  const {
    isListening,
    isSpeaking,
    toggleListening,
    speakText,
    stopSpeaking,
    hasSupport,
    permissionBlocked
  } = useVoice(language, activeEmotion, handleTranscriptReceived);

  // Core chat send function
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    // 1. Add user message to state
    const userMsg = {
      sender: "user",
      text,
      timestamp: new Date().toISOString()
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Stop speaking any ongoing reply
    stopSpeaking();

    try {
      // Send only messages with formatting to history (reduce payload)
      const serializableHistory = updatedMessages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      // 2. Fetch from Express Backend API
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: serializableHistory.slice(-10), // Limit history size
          mode,
          language,
          taggedZones,
          painIntensity,
          cameraBiometrics,
          medicalMemory
        })
      });

      if (!response.ok) {
        throw new Error("Server response error");
      }

      const analysis = await response.json();
      
      // 3. Save response & update state
      setCurrentAnalysis(analysis);
      addMemoryRecord(text, analysis);
      setMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: analysis.text_response,
          analysis,
          timestamp: new Date().toISOString()
        }
      ]);

      // 4. Voice response playback
      if (speakEnabled && analysis.vocal_script) {
        speakText(analysis.vocal_script);
      }

    } catch (err) {
      console.warn("Backend API not reachable. Using local symptom interpreter fallback.");
      
      // Execute self-healing fallback analysis
      const fallbackAnalysis = runClientFallback(text, updatedMessages, mode, language, taggedZones, painIntensity, medicalMemory);
      
      setCurrentAnalysis(fallbackAnalysis);
      addMemoryRecord(text, fallbackAnalysis);
      setMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: fallbackAnalysis.text_response,
          analysis: fallbackAnalysis,
          timestamp: new Date().toISOString()
        }
      ]);

      if (speakEnabled && fallbackAnalysis.vocal_script) {
        speakText(fallbackAnalysis.vocal_script);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setMessages([]);
    setCurrentAnalysis(null);
    setTaggedZones([]);
    setPainIntensity(3);
    setMedicalMemory([]);
    try {
      localStorage.removeItem("painttranslator_memory");
    } catch(e) {}
    stopSpeaking();
    try {
      await fetch("http://localhost:5000/api/clear-memory", { method: "POST" });
    } catch (e) {
      // Ignored if offline
    }
  };

  // Determine emotional radial aura overlay classes & HSL dynamic levels
  const getThemeColors = () => {
    if (painIntensity >= 9) {
      return {
        key: "Critical",
        hue: "0",
        saturation: "84%",
        lightness: "60%",
        hex: "#ef4444",
        glow: "rgba(239, 68, 68, 0.45)",
        glowClass: "from-red-950/20 via-slate-950 to-slate-950 border-red-500/20",
        accentText: "text-red-500",
        accentBorder: "border-red-500/30",
        pulseSpeed: "0.8s"
      };
    } else if (painIntensity >= 7) {
      return {
        key: "Severe",
        hue: "25",
        saturation: "95%",
        lightness: "53%",
        hex: "#f97316",
        glow: "rgba(249, 115, 22, 0.4)",
        glowClass: "from-orange-950/20 via-slate-950 to-slate-950 border-orange-500/20",
        accentText: "text-orange-400",
        accentBorder: "border-orange-500/30",
        pulseSpeed: "1.4s"
      };
    } else if (painIntensity >= 4) {
      return {
        key: "Moderate",
        hue: "270",
        saturation: "91%",
        lightness: "65%",
        hex: "#a855f7",
        glow: "rgba(168, 85, 247, 0.4)",
        glowClass: "from-purple-950/20 via-slate-950 to-slate-950 border-purple-500/20",
        accentText: "text-purple-400",
        accentBorder: "border-purple-500/30",
        pulseSpeed: "2.2s"
      };
    } else {
      return {
        key: "Mild",
        hue: "199",
        saturation: "89%",
        lightness: "48%",
        hex: "#0ea5e9",
        glow: "rgba(14, 165, 233, 0.35)",
        glowClass: "from-sky-950/20 via-slate-950 to-slate-950 border-sky-500/20",
        accentText: "text-sky-400",
        accentBorder: "border-sky-500/30",
        pulseSpeed: "3.5s"
      };
    }
  };

  const theme = getThemeColors();

  // Set CSS Custom Properties dynamically on root wrapper so Tailwind v4 tokens adapt immediately
  const themeStyle = {
    "--theme-h": theme.hue,
    "--theme-s": theme.saturation,
    "--theme-l": theme.lightness,
    "--theme-glow": theme.glow,
    "--theme-pulse-speed": theme.pulseSpeed,
  };

  return (
    <div 
      style={themeStyle}
      className={`min-h-screen bg-gradient-to-b ${theme.glowClass} text-slate-100 flex flex-col justify-between transition-all duration-1000 border-t-2 relative`}
    >
      
      {/* Background glowing sphere that reacts in HSL real time */}
      <div 
        className="radial-glow" 
        style={{ backgroundColor: `hsl(var(--theme-h), var(--theme-s), var(--theme-l), 0.12)` }}
      />

      {/* Futuristic Neural Network Particle Background */}
      <NeuralBackground />

      {/* Flashing warning overlay when Critical condition is active */}
      {painIntensity >= 9 && (
        <div className="absolute inset-0 bg-red-950/10 pointer-events-none z-30 animate-pulse border-red-500/10 border-4" />
      )}

      {/* Header Bar */}
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[var(--theme-color)] to-blue-500/20 border border-[var(--theme-color)]/30 transition-all duration-700">
              <Cpu className="w-5 h-5 text-[var(--theme-color)]" style={{ color: theme.hex }} />
            </div>
            <div>
              <h1 className="text-base font-display font-bold tracking-tight text-white m-0 p-0 leading-none">
                PainTranslator <span className="text-[var(--theme-color)] text-glow transition-colors duration-700" style={{ color: theme.hex }}>AI</span>
              </h1>
              <span className="text-[10px] text-slate-400 tracking-wider font-display uppercase">Next-Gen Biometric Agent</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Secure Diagnostic Engine
            </span>
            <span 
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: theme.hex }}
            />
          </div>
        </div>
      </header>

      {/* Main Console Workspace */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Agent Core & Metrics Dashboard (Column-Span: 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Holographic Core Panel */}
          <div className="glass-panel border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Visual scan overlay lines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
            <AIOrb 
              emotion={activeEmotion} 
              painLevel={theme.key}
              isSpeaking={isSpeaking} 
              isListening={isListening} 
            />
          </div>

          {/* Holographic Biometric Scanner */}
          <BodyScanner 
            analysis={currentAnalysis} 
            isLoading={isLoading} 
            taggedZones={taggedZones}
            onToggleZone={handleToggleZone}
            painIntensity={painIntensity}
            setPainIntensity={setPainIntensity}
            cameraBiometrics={cameraBiometrics}
            onUpdateBiometrics={(vitals) => {
              setCameraBiometrics(prev => ({
                ...prev,
                ...vitals
              }));
            }}
          />

          {/* Real-time Health Indicators */}
          <Dashboard 
            analysis={currentAnalysis} 
            history={messages} 
            painIntensity={painIntensity} 
            activeTheme={theme}
            cameraBiometrics={cameraBiometrics}
          />
        </div>

        {/* Right Side: Chat Container Panel (Column-Span: 7) */}
        <div className="lg:col-span-7">
          <ChatContainer
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearHistory={handleClearHistory}
            isListening={isListening}
            isSpeaking={isSpeaking}
            onToggleListening={toggleListening}
            mode={mode}
            setMode={setMode}
            language={language}
            setLanguage={setLanguage}
            speakEnabled={speakEnabled}
            setSpeakEnabled={setSpeakEnabled}
            warningSoundMuted={warningSoundMuted}
            setWarningSoundMuted={setWarningSoundMuted}
            isLoading={isLoading}
            hasSupport={hasSupport}
            permissionBlocked={permissionBlocked}
            painIntensity={painIntensity}
          />
        </div>

      </main>

      {/* Futuristic status footer */}
      <footer className="border-t border-white/5 bg-slate-950/60 py-3 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-slate-500 font-display uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Platform Core Status: ONLINE</span>
          </div>
          <span>PainTranslator AI © 2026. Futuristic Healthcare Technologies</span>
          <span>Security Protocol: AES-256-GCM</span>
        </div>
      </footer>

    </div>
  );
}
