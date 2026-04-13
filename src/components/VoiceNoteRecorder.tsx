"use client";

/**
 * VoiceNoteRecorder (F2 Enhancement)
 *
 * Web Speech API integration for voice-to-text annotations.
 * Allows users to speak damage notes instead of typing.
 *
 * Browser Support:
 * - Chrome: Full support
 * - Edge: Full support
 * - Safari: Partial (iOS 14.5+)
 * - Firefox: Not supported (falls back to text input)
 */

import { Loader2, Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => void) | null;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInterface;
  webkitSpeechRecognition?: new () => SpeechRecognitionInterface;
}

interface VoiceNoteRecorderProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function VoiceNoteRecorder({
  onTranscript,
  className,
  disabled = false,
  placeholder = "Tap to speak...",
}: VoiceNoteRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const win = window as WindowWithSpeechRecognition;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone access.");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Try again.");
      } else {
        setError(`Error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        onTranscript(final.trim());
        setInterimTranscript("");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (disabled || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      setInterimTranscript("");
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition may already be started
        console.warn("Speech recognition already started", err);
      }
    }
  }, [isListening, disabled]);

  // If not supported, show a simple text input
  if (!isSupported) {
    return (
      <div className={cn("relative", className)}>
        <input
          type="text"
          placeholder={placeholder}
          onChange={(e) => onTranscript(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          Voice not supported
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all",
          isListening
            ? "animate-pulse bg-red-500 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {isListening ? (
          <>
            <MicOff className="h-5 w-5" />
            <span>Tap to stop</span>
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            <span>{placeholder}</span>
          </>
        )}
      </button>

      {/* Live transcript preview */}
      {interimTranscript && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="italic">{interimTranscript}</span>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Compact voice note button - for inline use
 */
interface VoiceNoteButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VoiceNoteButton({
  onTranscript,
  className,
  disabled = false,
}: VoiceNoteButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  useEffect(() => {
    const win = window as WindowWithSpeechRecognition;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript.trim());
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (disabled || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Speech recognition error", err);
      }
    }
  }, [isListening, disabled]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        "rounded-full p-2 transition-all",
        isListening
          ? "animate-pulse bg-red-500 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      title={isListening ? "Stop recording" : "Start voice note"}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}

export default VoiceNoteRecorder;
