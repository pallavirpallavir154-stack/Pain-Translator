import { useState, useEffect, useRef } from "react";

// Language code mapper
const LANG_MAP = {
  English: "en-US",
  Hindi: "hi-IN",
  Kannada: "kn-IN",
  Telugu: "te-IN",
  Tamil: "ta-IN",
};

export function useVoice(language = "English", emotion = "calm", onTranscriptReceived = () => {}) {
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [browserSupport, setBrowserSupport] = useState({ stt: false, tts: false });

  const recognitionRef = useRef(null);
  const isActuallyRunning = useRef(false);
  const shouldBeListening = useRef(false);
  
  // Ref to prevent stale closure in recognition handlers
  const onTranscriptRef = useRef(onTranscriptReceived);
  
  // Sync the transcript callback on every render
  useEffect(() => {
    onTranscriptRef.current = onTranscriptReceived;
  }, [onTranscriptReceived]);

  // Initialize Speech Recognition and Synthesis availability
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasSTT = !!SpeechRecognition;
    const hasTTS = !!window.speechSynthesis;
    setBrowserSupport({ stt: hasSTT, tts: hasTTS });

    if (hasSTT) {
      const rec = new SpeechRecognition();
      rec.continuous = false; 
      rec.interimResults = false;
      rec.lang = LANG_MAP[language] || "en-US";

      rec.onstart = () => {
        isActuallyRunning.current = true;
        setIsListening(true);
      };

      rec.onend = () => {
        isActuallyRunning.current = false;
        if (shouldBeListening.current) {
          try {
            if (!isActuallyRunning.current) {
              rec.start();
            }
          } catch (err) {
            console.error("Failed to auto-restart recognition:", err);
          }
        } else {
          setIsListening(false);
        }
      };

      rec.onerror = (event) => {
        if (event.error === "aborted") {
          return; // Suppress normal abort logs
        }
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setPermissionBlocked(true);
          shouldBeListening.current = false;
          setIsListening(false);
        }
      };

      rec.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript;
        if (text && onTranscriptRef.current) {
          onTranscriptRef.current(text);
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      // Unmount cleanup
      shouldBeListening.current = false;
      if (recognitionRef.current && isActuallyRunning.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error("Error aborting SpeechRecognition:", e);
        }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);


  // Update language dynamically on the speech recognition instance
  useEffect(() => {
    if (recognitionRef.current) {
      const wasListening = isListening;
      if (wasListening) {
        stopListening();
      }
      recognitionRef.current.lang = LANG_MAP[language] || "en-US";
      if (wasListening) {
        // Give it a tiny delay to ensure proper reset before starting again
        setTimeout(() => {
          startListening();
        }, 100);
      }
    }
  }, [language]);

  const startListening = () => {
    if (!browserSupport.stt) return;
    setPermissionBlocked(false);
    shouldBeListening.current = true;
    if (recognitionRef.current && !isActuallyRunning.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("SpeechRecognition start error:", err);
      }
    }
  };

  const stopListening = () => {
    shouldBeListening.current = false;
    if (recognitionRef.current && isActuallyRunning.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        console.error("SpeechRecognition stop error:", err);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Speaks the text back adapting rate and pitch to current detected emotion
  const speakText = (text) => {
    if (!browserSupport.tts) return;

    // Stop any current speaking
    window.speechSynthesis.cancel();

    // Map emotion to pitch and rate
    let pitch = 1.0;
    let rate = 1.0;

    switch (emotion) {
      case "calm":
        pitch = 1.0;
        rate = 0.95;
        break;
      case "stress":
        // Comforting, slower, warmer
        pitch = 0.95;
        rate = 0.85;
        break;
      case "panic":
        // Direct, clear, reassuring but alert
        pitch = 1.1;
        rate = 1.05;
        break;
      case "sad":
        // Slower, soft tone
        pitch = 0.9;
        rate = 0.8;
        break;
      case "energetic":
        // Bright, upbeat
        pitch = 1.15;
        rate = 1.15;
        break;
      default:
        pitch = 1.0;
        rate = 1.0;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice for the selected language if available
    const targetLangCode = LANG_MAP[language] || "en-US";
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(targetLangCode.split("-")[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    
    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("TTS Utterance Error:", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (browserSupport.tts) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    toggleListening,
    speakText,
    stopSpeaking,
    hasSupport: browserSupport.stt,
    permissionBlocked
  };
}
