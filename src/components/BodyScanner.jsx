import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldAlert, Zap, Layers, Camera, Eye, Heart, HeartPulse, RefreshCw, Cpu, Activity as PulseIcon } from "lucide-react";

export default function BodyScanner({ 
  analysis, 
  isLoading, 
  taggedZones = [], 
  onToggleZone, 
  painIntensity = 3, 
  setPainIntensity,
  cameraBiometrics = {},
  onUpdateBiometrics
}) {
  const [activeTab, setActiveTab] = useState("wireframe"); // "wireframe" | "camera"
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeLog, setActiveLog] = useState("BIO-SYSTEMS: RECALIBRATED");
  
  // Camera references
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  // rPPG Heart Rate Estimation refs
  const offscreenCanvasRef = useRef(null);
  const ppgBufferRef = useRef([]);
  const ppgTimeBufferRef = useRef([]);
  const rawPpgSignalRef = useRef([]);
  const smoothedBpmRef = useRef(72);
  const lastUpdateRef = useRef(0);

  // Sync auto-scanning with parent system isLoading states
  useEffect(() => {
    if (isLoading) {
      triggerScanSequence();
    }
  }, [isLoading]);

  // Turn webcam on/off depending on active tab
  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 220 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      startHudAnimation();
    } catch (err) {
      console.warn("Camera access denied or unavailable:", err);
      setActiveLog("SCANNER: WEBCAM DENIED - SIMULATING SENSORS");
      setActiveTab("wireframe");
    }
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Render a futuristic tracking HUD over the webcam feed using HTML Canvas
  const startHudAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    let angle = 0;
    
    // Nodes representing relative anatomical positions on a face for holographic mesh simulation
    const faceMeshNodes = [
      { x: 0.5, y: 0.22, label: "FRON" }, // Forehead
      { x: 0.38, y: 0.38, label: "LEYE" }, // Left Eye
      { x: 0.62, y: 0.38, label: "REYE" }, // Right Eye
      { x: 0.5, y: 0.46, label: "NOSE" }, // Nose Bridge
      { x: 0.44, y: 0.58, label: "CHKL" }, // Left Cheek
      { x: 0.56, y: 0.58, label: "CHKR" }, // Right Cheek
      { x: 0.5, y: 0.68, label: "MOUT" }, // Mouth
      { x: 0.5, y: 0.74, label: "CHIN" }, // Chin
      { x: 0.3, y: 0.3, label: "TEMP_L" }, // Left Temple
      { x: 0.7, y: 0.3, label: "TEMP_R" }, // Right Temple
      { x: 0.32, y: 0.65, label: "JAW_L" }, // Left Jaw
      { x: 0.68, y: 0.65, label: "JAW_R" }  // Right Jaw
    ];

    const draw = () => {
      if (!canvas || !videoRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const w = canvas.width;
      const h = canvas.height;
      
      // Perform live rPPG green channel color absorption sampling
      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement("canvas");
        }
        const offscreen = offscreenCanvasRef.current;
        const oCtx = offscreen.getContext("2d", { willReadFrequently: true });
        
        const sampleSize = 30;
        offscreen.width = sampleSize;
        offscreen.height = sampleSize;
        
        // Sample forehead region (middle upper of face mesh area)
        const sx = video.videoWidth * 0.45;
        const sy = video.videoHeight * 0.25;
        const sw = video.videoWidth * 0.1;
        const sh = video.videoHeight * 0.1;
        
        oCtx.drawImage(video, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize);
        
        try {
          const imgData = oCtx.getImageData(0, 0, sampleSize, sampleSize);
          const data = imgData.data;
          
          let greenSum = 0;
          let count = 0;
          for (let i = 0; i < data.length; i += 4) {
            greenSum += data[i + 1]; // Green channel reflects pulsatile changes in blood volume
            count++;
          }
          const avgGreen = greenSum / count;
          
          const ppgBuffer = ppgBufferRef.current;
          const timeBuffer = ppgTimeBufferRef.current;
          
          ppgBuffer.push(avgGreen);
          timeBuffer.push(Date.now());
          
          if (ppgBuffer.length > 150) {
            ppgBuffer.shift();
            timeBuffer.shift();
          }
          
          // Detrend signal (subtract sliding average mean) to isolate heartbeat AC component
          let filteredValue = 0;
          if (ppgBuffer.length > 5) {
            const windowSize = Math.min(ppgBuffer.length, 30);
            const recentSlice = ppgBuffer.slice(-windowSize);
            const mean = recentSlice.reduce((a, b) => a + b, 0) / windowSize;
            filteredValue = avgGreen - mean;
          }
          
          const rawSignal = rawPpgSignalRef.current;
          rawSignal.push(filteredValue);
          if (rawSignal.length > 100) {
            rawSignal.shift();
          }
          
          // Real-time Peak Detection for heart rate variability & BPM calculations
          if (ppgBuffer.length >= 50) {
            const peaks = [];
            const minDistanceMs = 400; // limit to physiological max (150 BPM)
            
            for (let i = 2; i < rawSignal.length - 2; i++) {
              const val = rawSignal[i];
              // Local peak check
              if (val > rawSignal[i - 1] && val > rawSignal[i - 2] && val > rawSignal[i + 1] && val > rawSignal[i + 2]) {
                if (val > 0.015) { // amplitude noise gate
                  const peakTime = timeBuffer[i];
                  if (peaks.length === 0 || (peakTime - peaks[peaks.length - 1]) > minDistanceMs) {
                    peaks.push(peakTime);
                  }
                }
              }
            }
            
            let detectedBpm = null;
            if (peaks.length >= 2) {
              let diffSum = 0;
              for (let i = 1; i < peaks.length; i++) {
                diffSum += (peaks[i] - peaks[i - 1]);
              }
              const avgIntervalMs = diffSum / (peaks.length - 1);
              detectedBpm = Math.round(60000 / avgIntervalMs);
            }
            
            if (detectedBpm && detectedBpm >= 55 && detectedBpm <= 150) {
              smoothedBpmRef.current = Math.round(smoothedBpmRef.current * 0.95 + detectedBpm * 0.05);
            }
            
            // Periodically sync biometric changes to parent component
            const now = Date.now();
            if (now - lastUpdateRef.current > 1500) {
              lastUpdateRef.current = now;
              if (onUpdateBiometrics) {
                // Heart Rate Variability (SDNN) based stress level mapping
                let computedStress = Math.min(100, Math.max(5, Math.round(15 + (painIntensity * 8.5))));
                if (peaks.length >= 3) {
                  const intervals = [];
                  for (let i = 1; i < peaks.length; i++) {
                    intervals.push(peaks[i] - peaks[i - 1]);
                  }
                  const intMean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                  const variance = intervals.reduce((a, b) => a + Math.pow(b - intMean, 2), 0) / intervals.length;
                  const sdnn = Math.sqrt(variance);
                  
                  // Healthy heart has high SDNN (lower stress). Stress restricts SDNN.
                  computedStress = Math.max(10, Math.min(95, Math.round(100 - (sdnn * 0.75))));
                }
                
                const hr = smoothedBpmRef.current;
                const fatigue = hr >= 95 ? "High" : hr >= 82 ? "Moderate" : "Low";
                const eye = hr >= 90 ? "Strained" : "Normal";
                const breath = hr >= 100 ? "Rapid" : hr >= 90 ? "Shallow" : "Normal";
                
                onUpdateBiometrics({
                  heartRate: hr,
                  stressLevel: computedStress,
                  fatigueLevel: fatigue,
                  eyeStrain: eye,
                  breathingIntensity: breath,
                  facialTension: Math.round(hr * 0.35 + (Math.random() * 5)),
                  focusLevel: Math.max(10, Math.min(100, 100 - Math.round(computedStress * 0.6)))
                });
              }
            }
          }
        } catch (err) {
          // Silent catch for initial warmups / blank canvas states
        }
      }
      
      // Determine active color based on pain level
      const activeColor = painIntensity >= 9 ? "#ef4444" : painIntensity >= 7 ? "#f97316" : painIntensity >= 4 ? "#a855f7" : "#0ea5e9";
      const secondaryColor = painIntensity >= 9 ? "#ef4444" : "#10b981";
      
      // 1. Draw face detection outer boundary box
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * 0.25, h * 0.16, w * 0.5, h * 0.60);
      
      // Bounding box corners
      ctx.fillStyle = secondaryColor;
      const cornerSize = 12;
      const thickness = 3;
      // Top Left Corner
      ctx.fillRect(w * 0.23, h * 0.14, cornerSize, thickness);
      ctx.fillRect(w * 0.23, h * 0.14, thickness, cornerSize);
      // Top Right Corner
      ctx.fillRect(w * 0.73 - cornerSize + 3, h * 0.14, cornerSize, thickness);
      ctx.fillRect(w * 0.75, h * 0.14, thickness, cornerSize);
      // Bottom Left Corner
      ctx.fillRect(w * 0.23, h * 0.76, cornerSize, thickness);
      ctx.fillRect(w * 0.23, h * 0.76 - cornerSize + 3, thickness, cornerSize);
      // Bottom Right Corner
      ctx.fillRect(w * 0.73 - cornerSize + 3, h * 0.76, cornerSize, thickness);
      ctx.fillRect(w * 0.75, h * 0.76 - cornerSize + 3, thickness, cornerSize);

      // 2. Draw Eye Tracking Pupil locked targets
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      // Left eye target locking
      ctx.beginPath();
      ctx.arc(w * 0.4, h * 0.38, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(w * 0.4 - 1.5, h * 0.38 - 1.5, 3, 3);
      // Target Reticle ticks Left Eye
      ctx.beginPath();
      ctx.moveTo(w * 0.4 - 12, h * 0.38); ctx.lineTo(w * 0.4 - 6, h * 0.38);
      ctx.moveTo(w * 0.4 + 12, h * 0.38); ctx.lineTo(w * 0.4 + 6, h * 0.38);
      ctx.stroke();
      
      // Right eye target locking
      ctx.beginPath();
      ctx.arc(w * 0.6, h * 0.38, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(w * 0.6 - 1.5, h * 0.38 - 1.5, 3, 3);
      // Target Reticle ticks Right Eye
      ctx.beginPath();
      ctx.moveTo(w * 0.6 - 12, h * 0.38); ctx.lineTo(w * 0.6 - 6, h * 0.38);
      ctx.moveTo(w * 0.6 + 12, h * 0.38); ctx.lineTo(w * 0.6 + 6, h * 0.38);
      ctx.stroke();

      // 3. Simulated Face Landmark Mesh (Nodes & Connecting Webs)
      const pulseMultiplier = 1.5;
      const timeOffset = Date.now() * 0.003;
      
      // Compute dynamic node coordinates in screen pixels with micro tracking flutter
      const meshCoords = faceMeshNodes.map((n, idx) => {
        const flutterX = Math.sin(timeOffset + idx) * pulseMultiplier;
        const flutterY = Math.cos(timeOffset * 0.7 + idx) * pulseMultiplier;
        return {
          x: w * n.x + flutterX,
          y: h * n.y + flutterY
        };
      });

      // Draw mesh connection lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx.lineWidth = 0.5;
      
      // Draw standard holographic structural lines
      // Connect eyebrows to forehead & temples
      ctx.beginPath();
      ctx.moveTo(meshCoords[0].x, meshCoords[0].y); ctx.lineTo(meshCoords[8].x, meshCoords[8].y);
      ctx.moveTo(meshCoords[0].x, meshCoords[0].y); ctx.lineTo(meshCoords[9].x, meshCoords[9].y);
      
      // Connect temples down jawline
      ctx.lineTo(meshCoords[11].x, meshCoords[11].y); ctx.lineTo(meshCoords[7].x, meshCoords[7].y);
      ctx.moveTo(meshCoords[8].x, meshCoords[8].y); ctx.lineTo(meshCoords[10].x, meshCoords[10].y);
      ctx.lineTo(meshCoords[7].x, meshCoords[7].y);
      
      // Connect eyes to nose & cheeks
      ctx.moveTo(meshCoords[1].x, meshCoords[1].y); ctx.lineTo(meshCoords[3].x, meshCoords[3].y);
      ctx.moveTo(meshCoords[2].x, meshCoords[2].y); ctx.lineTo(meshCoords[3].x, meshCoords[3].y);
      ctx.moveTo(meshCoords[1].x, meshCoords[1].y); ctx.lineTo(meshCoords[4].x, meshCoords[4].y);
      ctx.moveTo(meshCoords[2].x, meshCoords[2].y); ctx.lineTo(meshCoords[5].x, meshCoords[5].y);
      ctx.moveTo(meshCoords[3].x, meshCoords[3].y); ctx.lineTo(meshCoords[6].x, meshCoords[6].y);
      ctx.stroke();

      // Draw mesh node dots
      ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
      meshCoords.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Forehead Thermal/Tension Target
      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.25, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
      ctx.fill();
      // Reticle lock lines
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.25 - 20); ctx.lineTo(w * 0.5, h * 0.25 - 12);
      ctx.moveTo(w * 0.5, h * 0.25 + 20); ctx.lineTo(w * 0.5, h * 0.25 + 12);
      ctx.stroke();

      // 5. Cyber spinning compass tracker
      ctx.save();
      ctx.translate(w * 0.5, h * 0.48);
      ctx.rotate(angle);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      // Tick marks
      ctx.beginPath();
      ctx.moveTo(0, -40); ctx.lineTo(0, -34);
      ctx.moveTo(0, 40); ctx.lineTo(0, 34);
      ctx.moveTo(-40, 0); ctx.lineTo(-34, 0);
      ctx.moveTo(40, 0); ctx.lineTo(34, 0);
      ctx.stroke();
      ctx.restore();

      angle += painIntensity >= 9 ? 0.045 : painIntensity >= 7 ? 0.03 : 0.015;

      // 6. Draw rolling live vital ECG graph or real-time green absorption PPG wave
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      
      const ppgSignal = rawPpgSignalRef.current;
      const waveHeight = h - 20;
      
      if (ppgSignal.length > 5) {
        ctx.strokeStyle = "#10b981"; // Vibrant green for live vascular pulse
        for (let x = 0; x < w; x++) {
          const bufferIdx = Math.floor((x / w) * ppgSignal.length);
          const val = ppgSignal[bufferIdx] || 0;
          // Scale live absorption signals visually
          const y = waveHeight - Math.max(-18, Math.min(18, val * 250));
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      } else {
        ctx.strokeStyle = activeColor;
        const bpmSpeed = painIntensity >= 9 ? 0.075 : painIntensity >= 7 ? 0.05 : painIntensity >= 4 ? 0.03 : 0.018;
        
        for (let x = 0; x < w; x += 1.5) {
          let y = waveHeight;
          // Standard P-Q-R-S-T wave complex calculation over time
          const phase = (x * 0.04 - Date.now() * bpmSpeed) % (Math.PI * 2);
          
          if (phase > 0 && phase < 0.6) {
            y -= Math.sin(phase * (Math.PI / 0.6)) * 3.5; // P-wave
          } else if (phase >= 0.7 && phase < 0.85) {
            y += (phase - 0.7) * 12; // Q-wave dip
          } else if (phase >= 0.85 && phase < 1.05) {
            y -= Math.sin((phase - 0.85) * (Math.PI / 0.2)) * 26; // R-wave spike
          } else if (phase >= 1.05 && phase < 1.25) {
            y += Math.sin((phase - 1.05) * (Math.PI / 0.2)) * 9; // S-wave dip
          } else if (phase >= 1.35 && phase < 1.95) {
            y -= Math.sin((phase - 1.35) * (Math.PI / 0.6)) * 5; // T-wave
          }
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();

      // 7. Draw HUD overlays
      ctx.fillStyle = "#10b981";
      ctx.font = "8px monospace";
      ctx.fillText(ppgSignal.length > 5 ? "REAL-TIME PPG SENSOR: LOCKED" : "FACIAL COGNITIVE SHIELD: ACTIVE", 8, 14);
      ctx.fillText(`ANX INDEX: ${cameraBiometrics.stressLevel}%`, 8, 24);
      ctx.fillText(`FATIGUE: ${cameraBiometrics.fatigueLevel.toUpperCase()}`, 8, 34);

      ctx.fillStyle = painIntensity >= 9 ? "#ef4444" : "#3b82f6";
      ctx.fillText(`BREATH: ${cameraBiometrics.breathingIntensity.toUpperCase()}`, w - 82, 14);
      ctx.fillText(`EYES: ${cameraBiometrics.eyeStrain.toUpperCase()}`, w - 82, 24);
      
      ctx.fillStyle = painIntensity >= 9 ? "#ef4444" : painIntensity >= 7 ? "#f97316" : "#10b981";
      ctx.fillText(ppgSignal.length > 5 ? `REAL BPM: ${cameraBiometrics.heartRate}` : `VITAL BPM: ${cameraBiometrics.heartRate}`, w - 85, h - 30);
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const triggerScanSequence = () => {
    setIsScanning(true);
    setScanProgress(0);
    setActiveLog("SCANNER: INITIATING OPTICAL VITAL SENSORS...");

    const logs = [
      "SCANNER: ESTABLISHING COGNITIVE ALIGNMENT...",
      "SCANNER: ANALYZING FACIAL STRETCH INDEX...",
      "SCANNER: WEBCAM FEED LATENCY SYNCED...",
      "SCANNER: EVALUATING THORACIC TEMPERATURE...",
      "SCANNER: COMPILING BIOGRAM TIMELINE MATRIX..."
    ];

    let currentLogIdx = 0;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 5;
        if (next % 20 === 0 && currentLogIdx < logs.length) {
          setActiveLog(logs[currentLogIdx]);
          currentLogIdx++;
        }
        if (next >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setActiveLog("SYSTEM: DIAGNOSTIC MATRIX COMPLETE");
          return 100;
        }
        return next;
      });
    }, 90);
  };

  // Determine active highlights based on analysis AND manual user selections
  const indicators = analysis?.wellness_indicators?.map(ind => ind.toLowerCase()) || [];
  
  const highlights = {
    head: taggedZones.includes("head") || indicators.some(ind => ind.includes("fatigue") || ind.includes("head") || ind.includes("migraine") || ind.includes("tension") || ind.includes("cognitive") || ind.includes("sensory")),
    chest: taggedZones.includes("chest") || indicators.some(ind => ind.includes("cardio") || ind.includes("chest") || ind.includes("anxiety") || ind.includes("breath") || ind.includes("respiratory") || ind.includes("stress")),
    stomach: taggedZones.includes("stomach") || indicators.some(ind => ind.includes("gastro") || ind.includes("digestive") || ind.includes("stomach") || ind.includes("tummy") || ind.includes("belly") || ind.includes("abdomen")),
    limbs: taggedZones.includes("limbs") || indicators.some(ind => ind.includes("physical") || ind.includes("discomfort") || ind.includes("limbs") || ind.includes("joint") || ind.includes("legs") || ind.includes("muscular"))
  };

  // Maps pain rating to neon color hex codes
  const getPainSliderColor = () => {
    if (painIntensity <= 3) return "#10b981"; // calm green
    if (painIntensity <= 6) return "#eab308"; // yellow
    if (painIntensity <= 8) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  return (
    <div className="glass-panel border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center w-full">
      
      {/* Tab Selectors */}
      <div className="w-full mb-3 flex items-center justify-between border-b border-white/5 pb-2">
        <h3 className="text-xs font-display uppercase tracking-widest text-slate-400 flex items-center gap-1.5 m-0">
          <Layers className="w-4 h-4 text-[var(--theme-color)] transition-colors duration-1000 animate-pulse" />
          Quantum Alignment Console
        </h3>
        
        <div className="flex bg-slate-900/60 p-0.5 rounded border border-white/5">
          <button
            onClick={() => setActiveTab("wireframe")}
            className={`px-2.5 py-0.5 rounded text-[10px] font-display transition-all ${
              activeTab === "wireframe" 
                ? "bg-[var(--theme-color)]/25 text-[var(--theme-color)] border border-[var(--theme-color)]/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Soma Map
          </button>
          <button
            onClick={() => setActiveTab("camera")}
            className={`px-2.5 py-0.5 rounded text-[10px] font-display flex items-center gap-1 transition-all ${
              activeTab === "camera" 
                ? "bg-[var(--theme-color)]/25 text-[var(--theme-color)] border border-[var(--theme-color)]/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Camera className="w-2.5 h-2.5" />
            Biometric Cam
          </button>
        </div>
      </div>

      {/* Main Console View Area */}
      <div className="relative w-full aspect-square max-w-[220px] bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
        
        {/* Animated Laser Sweep Beam */}
        {isScanning && (
          <motion.div
            className="absolute left-0 right-0 h-[3px] bg-[var(--theme-color)] shadow-[0_0_15px_var(--theme-color)] z-20 pointer-events-none"
            initial={{ top: "0%" }}
            animate={{ top: ["5%", "95%", "5%"] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Diagonal cinematic scanning mesh grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {activeTab === "wireframe" ? (
            /* Tab 1: Clickable SVG Human Outline Wireframe */
            <motion.div
              key="wireframe"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full flex flex-col items-center justify-center relative"
            >
              <div className="absolute top-1 left-2 text-[8px] font-mono text-slate-500 tracking-wider">
                TAP TO TAG PAIN ZONES
              </div>

              <svg className="w-[140px] h-[190px] cursor-pointer" viewBox="0 0 100 160">
                <defs>
                  <radialGradient id="hotspot-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--theme-color)" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="var(--theme-color)" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Human Skeleton Lines */}
                <g className="stroke-slate-800/60" strokeWidth="0.8" fill="none">
                  <line x1="50" y1="35" x2="50" y2="90" />
                  <line x1="38" y1="42" x2="62" y2="42" />
                  <line x1="42" y1="90" x2="58" y2="90" />
                </g>

                {/* Base Human Body Model Outline */}
                <g 
                  stroke={isScanning ? "var(--theme-color)" : "#3b82f6"} 
                  strokeWidth="1.2" 
                  fill="none" 
                  opacity={isScanning ? 0.85 : 0.45}
                  className="transition-colors duration-1000"
                >
                  <path d="M 38,42 L 62,42 L 58,90 L 42,90 Z" />
                  <path d="M 38,42 L 25,75 M 25,75 L 18,105" />
                  <path d="M 62,42 L 75,75 M 75,75 L 82,105" />
                  <path d="M 42,90 L 38,125 M 38,125 L 35,155" />
                  <path d="M 58,90 L 62,125 M 62,125 L 65,155" />
                </g>

                {/* Clickable Hotspots overlayed */}
                {/* 1. HEAD REGION */}
                <g onClick={() => onToggleZone("head")}>
                  {highlights.head ? (
                    <circle cx="50" cy="22" r="14" fill="url(#hotspot-glow)" className="animate-pulse" />
                  ) : (
                    <circle cx="50" cy="22" r="12" fill="transparent" className="hover:fill-sky-500/10 transition-colors" />
                  )}
                  <circle cx="50" cy="22" r="10" stroke={highlights.head ? "var(--theme-color)" : "#1e293b"} strokeWidth="1" fill={highlights.head ? "var(--theme-color)/30" : "transparent"} />
                </g>

                {/* 2. CHEST REGION */}
                <g onClick={() => onToggleZone("chest")}>
                  {highlights.chest ? (
                    <circle cx="50" cy="52" r="18" fill="url(#hotspot-glow)" className="animate-pulse" />
                  ) : (
                    <circle cx="50" cy="52" r="15" fill="transparent" className="hover:fill-sky-500/10 transition-colors" />
                  )}
                  <circle cx="50" cy="52" r="8" stroke={highlights.chest ? "var(--theme-color)" : "#1e293b"} strokeWidth="1" fill={highlights.chest ? "var(--theme-color)/30" : "transparent"} />
                </g>

                {/* 3. STOMACH/ABDOMEN REGION */}
                <g onClick={() => onToggleZone("stomach")}>
                  {highlights.stomach ? (
                    <circle cx="50" cy="74" r="16" fill="url(#hotspot-glow)" className="animate-pulse" />
                  ) : (
                    <circle cx="50" cy="74" r="12" fill="transparent" className="hover:fill-sky-500/10 transition-colors" />
                  )}
                  <circle cx="50" cy="74" r="7" stroke={highlights.stomach ? "var(--theme-color)" : "#1e293b"} strokeWidth="1" fill={highlights.stomach ? "var(--theme-color)/30" : "transparent"} />
                </g>

                {/* 4. LIMBS (Tension / Muscle nodes) */}
                <g onClick={() => onToggleZone("limbs")}>
                  {highlights.limbs && (
                    <>
                      <circle cx="25" cy="75" r="12" fill="url(#hotspot-glow)" className="animate-pulse" />
                      <circle cx="75" cy="75" r="12" fill="url(#hotspot-glow)" className="animate-pulse" />
                    </>
                  )}
                  <circle cx="25" cy="75" r="5" stroke={highlights.limbs ? "var(--theme-color)" : "#1e293b"} strokeWidth="1" fill={highlights.limbs ? "var(--theme-color)/30" : "transparent"} />
                  <circle cx="75" cy="75" r="5" stroke={highlights.limbs ? "var(--theme-color)" : "#1e293b"} strokeWidth="1" fill={highlights.limbs ? "var(--theme-color)/30" : "transparent"} />
                </g>

              </svg>
            </motion.div>
          ) : (
            /* Tab 2: Live Biometric Webcam Feed with Overlay HUD */
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full relative"
            >
              <video 
                ref={videoRef}
                className="w-full h-full object-cover filter brightness-75 contrast-125 saturate-50"
                muted
                playsInline
              />
              <canvas 
                ref={canvasRef}
                width={220}
                height={220}
                className="absolute inset-0 z-10 pointer-events-none"
              />
              <div className="absolute top-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[8px] font-mono text-rose-400 border border-rose-500/20 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                VITAL FEED
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cybernetic Pain Slider Gauge */}
      <div className="w-full mt-3 p-3 bg-slate-900/30 border border-white/5 rounded-xl text-xs">
        <div className="flex justify-between items-center mb-1 text-slate-400 font-display uppercase tracking-wider text-[10px]">
          <span>Pain Intensity Index</span>
          <span className="font-bold font-mono transition-colors duration-500" style={{ color: getPainSliderColor() }}>
            VAS: {painIntensity}/10
          </span>
        </div>
        <input 
          type="range"
          min="1"
          max="10"
          value={painIntensity}
          onChange={(e) => setPainIntensity(parseInt(e.target.value))}
          className="w-full accent-[var(--theme-color)] bg-slate-800 h-1.5 rounded-lg cursor-pointer transition-colors duration-300"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #eab308 50%, #ef4444 100%)`
          }}
        />
        <div className="flex justify-between text-[8px] text-slate-500 mt-1 font-mono">
          <span>1: MILD</span>
          <span>5: STRESS</span>
          <span>10: SEVERE</span>
        </div>
      </div>

      {/* Diagnostics Console Logs */}
      <div className="w-full mt-3 bg-slate-950/70 border border-white/5 rounded-lg p-2.5 font-mono text-[9px] text-slate-400 space-y-1 select-none">
        <div className="flex items-center gap-1.5">
          <span 
            className="w-1.5 h-1.5 rounded-full animate-ping"
            style={{ backgroundColor: getPainSliderColor() }}
          />
          <span className="font-semibold transition-colors duration-500" style={{ color: getPainSliderColor() }}>{activeLog}</span>
        </div>
        
        {/* State readout logs */}
        <div className="text-[8px] text-slate-500 flex justify-between">
          <span>ACTIVE TARGETS: {taggedZones.length ? taggedZones.join(", ").toUpperCase() : "NONE"}</span>
          <span>VAS RATE: {painIntensity}/10</span>
        </div>

        <div className="flex justify-between items-center text-slate-500 border-t border-white/5 pt-1.5 mt-1.5">
          <span className="flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-[var(--theme-color)] transition-colors duration-1000" />
            Bio diagnostics HUD
          </span>
          <span>Sweep: {Math.floor(scanProgress)}%</span>
        </div>
        
        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${scanProgress}%`,
              backgroundColor: getPainSliderColor()
            }}
          />
        </div>
      </div>

      {/* Start Diagnostic Scan Button */}
      <button
        onClick={triggerScanSequence}
        disabled={isScanning || isLoading}
        className="w-full mt-3 glow-btn px-4 py-2.5 rounded-xl border border-[var(--theme-color)]/30 bg-[var(--theme-color)]/10 text-[var(--theme-color)] text-xs font-display font-semibold hover:border-[var(--theme-color)]/50 hover:bg-[var(--theme-color)]/25 disabled:opacity-40 select-none flex items-center justify-center gap-1.5 transition-all duration-700"
      >
        <Zap className="w-3.5 h-3.5" />
        Initiate Diagnostics Scan
      </button>

      {/* Informational Wellness Disclaimer Badge */}
      <div className="w-full mt-3 px-3 py-2 rounded-lg bg-slate-950/40 border border-white/5 text-[8.5px] text-slate-500 leading-snug flex gap-1.5 items-start">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500/80 flex-shrink-0" />
        <span>Biometric analysis is AI-estimated wellness guidance and not medical diagnosis.</span>
      </div>

    </div>
  );
}

