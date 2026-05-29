import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Send, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Baby, 
  User, 
  Globe,
  BellRing,
  AlertOctagon,
  Activity
} from "lucide-react";

// Predefined quick symptom templates
const QUICK_TEMPLATES = [
  { text: "I have heavy crushing chest pain and breathing issues 😰", label: "Crisis: Chest" },
  { text: "My tummy is extremely sore and burning 😡", label: "Gastric: Tummy" },
  { text: "I feel dizzy, exhausted, and my head feels tight 😴", label: "Tension: Head" },
  { text: "I have an active muscle spasm in my limb after working out 🤕", label: "Somatic: Som" },
];

export default function ChatContainer({
  messages,
  onSendMessage,
  onClearHistory,
  isListening,
  isSpeaking,
  onToggleListening,
  mode,
  setMode,
  language,
  setLanguage,
  speakEnabled,
  setSpeakEnabled,
  warningSoundMuted,
  setWarningSoundMuted,
  isLoading,
  hasSupport = true,
  permissionBlocked = false,
  painIntensity = 3
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  useEffect(() => {
    setSelectedAnswers({});
  }, [messages.length]);

  // Web Audio Visualizer References
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const audioCanvasRef = useRef(null);

  // Audio Context waveform visualizer
  useEffect(() => {
    if (isListening) {
      startAudioVisualizer();
    } else {
      stopAudioVisualizer();
    }
    return () => stopAudioVisualizer();
  }, [isListening]);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; 
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Animation frame drawing loop
      const drawWave = () => {
        const canvas = audioCanvasRef.current;
        if (!canvas || !analyserRef.current) return;
        
        const ctx = canvas.getContext("2d");
        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = "hsl(var(--theme-h), var(--theme-s), var(--theme-l))"; // Dynamic colored voice pulse wave
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        animationRef.current = requestAnimationFrame(drawWave);
      };

      drawWave();
    } catch (err) {
      console.warn("Audio Visualizer failed:", err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch(e) {}
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleTemplateClick = (templateText) => {
    if (isLoading) return;
    onSendMessage(templateText);
  };

  const handleSelectOption = (qIdx, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: option
    }));
  };

  const handleQuestionnaireSubmit = () => {
    const latestAiMessage = messages[messages.length - 1];
    if (!latestAiMessage || !latestAiMessage.analysis?.follow_up_questions) return;
    
    const questions = latestAiMessage.analysis.follow_up_questions;
    let answerText = "Answers to follow-up questions:\n";
    let answeredCount = 0;
    
    questions.forEach((q, idx) => {
      const qText = typeof q === 'string' ? q : q.question;
      const ans = selectedAnswers[idx];
      if (ans) {
        answerText += `${idx + 1}. **${qText}** -> *${ans}*\n`;
        answeredCount++;
      }
    });
    
    if (answeredCount === 0) {
      alert("Please answer at least one question before submitting.");
      return;
    }
    
    onSendMessage(answerText);
    setSelectedAnswers({});
  };

  const renderQuestionnaire = (followUpQuestions) => {
    if (!followUpQuestions || followUpQuestions.length === 0) return null;
    
    return (
      <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-4">
        <h5 className="text-[11px] font-bold font-display uppercase tracking-widest text-[var(--theme-color)] flex items-center gap-1.5 border-b border-white/5 pb-2 transition-colors duration-1000">
          <Activity className="w-3.5 h-3.5 animate-pulse text-[var(--theme-color)]" />
          Somatic Diagnostics Follow-up Questionnaire
        </h5>
        
        <div className="space-y-3">
          {followUpQuestions.map((q, qIdx) => {
            const questionText = typeof q === 'string' ? q : q.question;
            const options = typeof q === 'string' ? ["Yes", "No", "Not sure"] : (q.options || ["Yes", "No", "Not sure"]);
            
            return (
              <div key={qIdx} className="space-y-2 bg-slate-900/40 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                <p className="text-xs font-semibold text-slate-200">
                  {qIdx + 1}. {questionText}
                </p>
                
                {/* Checkbox / Radio choices */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {options.map((opt, oIdx) => {
                    const isSelected = selectedAnswers[qIdx] === opt;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(qIdx, opt)}
                        className={`px-3 py-1.5 rounded-lg text-[10.5px] transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? "bg-[var(--theme-color)]/20 text-[var(--theme-color)] border-[var(--theme-color)]/40 shadow-[0_0_12px_var(--theme-glow)]"
                            : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-200"
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center border transition-all ${
                          isSelected ? "border-[var(--theme-color)] bg-[var(--theme-color)]" : "border-slate-600"
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Submit */}
        <button
          type="button"
          onClick={handleQuestionnaireSubmit}
          className="w-full mt-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-display font-semibold transition-all shadow-[0_4px_15px_rgba(147,51,234,0.3)] flex items-center justify-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          Submit Diagnostic Responses
        </button>
      </div>
    );
  };

  // Helper to parse simple markdown bold and lists
  const parseBoldText = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-white font-bold">{part}</strong>;
      }
      return part;
    });
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, index) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={index} className="text-sm font-bold font-display mt-3 mb-1 text-slate-200 flex items-center gap-1.5 border-b border-white/5 pb-1">
            <Sparkles className="w-3.5 h-3.5 text-[var(--theme-color)] transition-colors duration-1000" />
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("#### ")) {
        return <h5 key={index} className="text-xs font-semibold font-display mt-2.5 mb-1 text-[var(--theme-color)] transition-colors duration-1000 uppercase tracking-widest">{line.replace("#### ", "")}</h5>;
      }
      if (line.startsWith("- ")) {
        const cleanLine = line.replace("- ", "");
        return (
          <li key={index} className="ml-4 list-disc text-xs text-slate-300 mb-1 leading-relaxed">
            {parseBoldText(cleanLine)}
          </li>
        );
      }
      if (line.startsWith("1. ")) {
        const cleanLine = line.replace(/^\d+\.\s+/, "");
        return (
          <div key={index} className="flex gap-2 items-start ml-2 text-xs text-slate-300 mb-1.5 bg-slate-900/40 p-2 rounded border border-white/5 hover:border-white/10 transition-all">
            <span className="font-mono text-purple-400 font-bold bg-purple-950/40 px-1 rounded flex-shrink-0">?</span>
            <span className="leading-relaxed">{parseBoldText(cleanLine)}</span>
          </div>
        );
      }
      if (line.trim() === "---") {
        return <hr key={index} className="my-3 border-white/10" />;
      }
      if (line.trim() === "") {
        return <div key={index} className="h-1.5" />;
      }
      return <p key={index} className="text-xs text-slate-300 leading-relaxed mb-1">{parseBoldText(line)}</p>;
    });
  };

  return (
    <div className="flex flex-col h-[640px] glass-panel rounded-2xl border-white/5 overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_var(--theme-glow)]">
      
      {/* 1. Header Control Panel */}
      <div className="p-3 border-b border-white/5 bg-slate-950/40 flex flex-wrap gap-2 items-center justify-between">
        
        {/* Interpretation Modes */}
        <div className="flex items-center bg-slate-900/60 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setMode("regular")}
            className={`px-3 py-1 rounded text-xs font-display flex items-center gap-1.5 transition-all ${
              mode === "regular" 
                ? "bg-[var(--theme-color)]/20 text-[var(--theme-color)] border border-[var(--theme-color)]/30" 
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <User className="w-3 h-3" />
            Regular
          </button>
          <button
            onClick={() => setMode("child-elderly")}
            className={`px-3 py-1 rounded text-xs font-display flex items-center gap-1.5 transition-all ${
              mode === "child-elderly" 
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" 
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Baby className="w-3 h-3" />
            Child / Elderly
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative flex items-center bg-slate-900/60 border border-white/5 px-2 py-1 rounded-lg">
            <Globe className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="English" className="bg-slate-950">English</option>
              <option value="Hindi" className="bg-slate-950">Hindi</option>
              <option value="Kannada" className="bg-slate-950">Kannada</option>
              <option value="Telugu" className="bg-slate-950">Telugu</option>
              <option value="Tamil" className="bg-slate-950">Tamil</option>
            </select>
          </div>

          {/* Heart Beep Sound Synth Toggle */}
          {painIntensity >= 7 && (
            <button
              onClick={() => setWarningSoundMuted(!warningSoundMuted)}
              title={warningSoundMuted ? "Unmute Diagnostic Beep" : "Mute Diagnostic Beep"}
              className={`p-2 rounded-lg border transition-all ${
                !warningSoundMuted 
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse" 
                  : "bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200"
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Voice Speech Toggle */}
          <button
            onClick={() => setSpeakEnabled(!speakEnabled)}
            title={speakEnabled ? "Mute Voice Responses" : "Unmute Voice Responses"}
            className={`p-2 rounded-lg border transition-all ${
              speakEnabled 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200"
            }`}
          >
            {speakEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Conversations */}
          <button
            onClick={onClearHistory}
            title="Clear Chat Logs"
            className="p-2 rounded-lg bg-slate-900/60 border border-white/5 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 2. Emergency Flashing Banner (Visible for high-priority pain levels) */}
      {painIntensity >= 7 && (
        <div className="bg-red-950/20 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-xs text-red-400 select-none animate-pulse">
          <span className="flex items-center gap-1.5 font-semibold">
            <AlertOctagon className="w-4 h-4 text-red-500 animate-spin-slow" />
            WARNING: ELEVATED SOMATIC VITAL SIGNS [VAS {painIntensity}/10]
          </span>
          <span className="text-[10px] font-mono tracking-wider font-bold">EMERGENCY PROTOCOL ACTIVE</span>
        </div>
      )}

      {/* 3. Messages Transcript View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
        
        {/* Welcome Message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] glass-panel rounded-2xl rounded-tl-none p-4.5 border-white/5">
            <h4 className="text-xs font-display font-semibold uppercase tracking-wider text-[var(--theme-color)] mb-1 flex items-center gap-1.5 transition-colors duration-1000">
              <span>PainTranslator AI Biometric Agent v2.0</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hello. Describe your pain, tension, or somatic symptoms in plain words. I combine your symptom descriptions, body zones, manual pain scores, and live webcam face-tracking parameters to orchestrate a secure wellness assessment.
            </p>
          </div>
        </div>

        {/* Message Feed */}
        {messages.map((msg, index) => {
          const isEmergencyResponse = msg.analysis?.emergency_mode || (msg.sender === "ai" && painIntensity >= 7);
          return (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 leading-relaxed transition-all duration-500 ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-[var(--theme-color)]/25 to-blue-600/25 border border-[var(--theme-color)]/20 rounded-tr-none text-slate-100 text-xs"
                    : isEmergencyResponse
                    ? "bg-red-950/20 border-red-500/20 rounded-tl-none border shadow-[0_0_20px_rgba(239,68,68,0.06)] text-slate-300"
                    : "glass-panel rounded-tl-none border-white/5 text-slate-300"
                }`}
              >
                {msg.sender === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div>
                    {renderFormattedText(msg.text)}
                    {index === messages.length - 1 && renderQuestionnaire(msg.analysis?.follow_up_questions)}
                  </div>
                )}
                
                <div className="text-[9px] text-slate-500 text-right mt-1.5 select-none">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                </div>
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass-panel border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--theme-color)] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 bg-[var(--theme-color)] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 bg-[var(--theme-color)] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              <span className="text-[10px] text-slate-500 font-display uppercase tracking-widest ml-1">Analyzing Somatics</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Predefined templates */}
      {messages.length === 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-slate-950/20">
          <p className="text-[10px] text-slate-500 font-display uppercase tracking-wider mb-1.5">Try a quick biometric scenario:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => handleTemplateClick(tpl.text)}
                className="text-[10px] px-2.5 py-1 rounded bg-slate-900/60 border border-white/5 hover:border-[var(--theme-color)]/20 hover:text-[var(--theme-color)] transition-all text-slate-400"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Chat Input Section */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-slate-950/40">
        
        {/* Support Warning Banners */}
        {permissionBlocked && (
          <div className="mb-2.5 px-3 py-2 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] leading-relaxed flex items-start gap-1.5 animate-pulse">
            <span>⚠️</span>
            <span>
              <strong>Microphone access blocked.</strong> Please click the site settings lock icon in your browser URL bar, change microphone to "Allow", and try again.
            </span>
          </div>
        )}

        {!hasSupport && (
          <div className="mb-2.5 px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-500/20 text-amber-400 text-[10px] leading-relaxed flex items-start gap-1.5">
            <span>🚫</span>
            <span>
              <strong>Voice input not supported.</strong> Your browser does not support Speech Recognition. For full voice diagnostics, please use Google Chrome or Microsoft Edge.
            </span>
          </div>
        )}

        {/* Real-time Voice Frequency Visualizer Canvas */}
        {isListening && (
          <div className="mb-2.5 bg-slate-950/60 rounded-lg p-2 border border-[var(--theme-color)]/25 flex items-center justify-between">
            <span className="text-[8px] font-mono text-[var(--theme-color)] animate-pulse mr-2 flex-shrink-0">VOICE FREQUENCY FEED:</span>
            <canvas ref={audioCanvasRef} className="w-full h-5 rounded" />
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Micro Button */}
          <button
            type="button"
            onClick={onToggleListening}
            disabled={!hasSupport}
            className={`relative p-3 rounded-xl border flex-shrink-0 transition-all duration-300 ${
              !hasSupport
                ? "bg-slate-900/30 border-white/5 text-slate-600 cursor-not-allowed"
                : isListening
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"
                : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200"
            }`}
            title={!hasSupport ? "Voice input unsupported" : isListening ? "Listening... Click to stop" : "Start speaking"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening to your voice..." : "Describe how you feel..."}
            className="flex-1 bg-slate-900/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-[var(--theme-color)]/30 transition-all"
            disabled={isListening}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isListening}
            className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:hover:bg-purple-600 transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Disclaimer */}
        <div className="mt-2 text-center text-[9px] text-slate-500 leading-snug">
          🛡️ *This AI provides informational wellness guidance only and is not a substitute for professional medical advice.*
        </div>
      </form>

    </div>
  );
}
