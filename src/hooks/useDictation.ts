import { useCallback, useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: ((err?: unknown) => void) | null;
};

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  const win = window as unknown as Record<string, unknown>;
  const candidate = win["webkitSpeechRecognition"] ?? win["SpeechRecognition"] ?? null;
  if (typeof candidate === "function") return candidate as SpeechRecognitionConstructor;
  return null;
};

const SpeechRec = getSpeechRecognition();

interface UseDictationOptions {
  lang?: string;
  interim?: boolean;
}

export function useDictation({ lang = "en-US", interim = true }: UseDictationOptions = {}) {
  const [supported, setSupported] = useState<boolean>(!!SpeechRec);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const recRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);

  useEffect(() => {
    setSupported(!!SpeechRec);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRec) return;
    const rec = new (SpeechRec as SpeechRecognitionConstructor)();
    recRef.current = rec as InstanceType<SpeechRecognitionConstructor>;
    rec.lang = lang;
    rec.interimResults = interim;
    rec.continuous = true;

    rec.onresult = (e: unknown) => {
      // The event shape can vary; treat as unknown and read conservatively
      type ResultsLike = { resultIndex?: number; length?: number } & {
        [k: number]: { 0?: { transcript?: string } };
      };
      const ev = e as unknown as { resultIndex?: number; results?: ResultsLike };
      const start = ev.resultIndex ?? 0;
      const results = ev.results;
      let acc = "";
      if (results && typeof results === "object") {
        const len = typeof results.length === "number" ? results.length : 0;
        for (let i = start; i < len; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const item = (results as any)[i] as { 0?: { transcript?: string } } | undefined;
          const t = item?.[0]?.transcript;
          if (typeof t === "string") acc += t;
        }
      }
      if (acc) setText((t) => (t ? t + " " : "") + acc.trim());
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    try {
      rec.start();
      setListening(true);
    } catch (error) {
      logger.error("Failed to start dictation:", error);
      setListening(false);
    }
  }, [lang, interim]);

  const stop = useCallback(() => {
    recRef.current?.stop?.();
    setListening(false);
  }, []);

  const reset = useCallback(() => setText(""), []);

  return { supported, listening, text, start, stop, reset };
}
