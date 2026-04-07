/**
 * PHASE 35: useAIStream Hook
 * 
 * React hook for consuming Server-Sent Events (SSE) from AI streaming endpoints
 * 
 * Features:
 * - Real-time token streaming
 * - Automatic reconnection with exponential backoff
 * - Error handling and recovery
 * - Loading and completion states
 * - Cancel support
 * 
 * Usage:
 *   const { text, isStreaming, error, startStream, cancelStream } = useAIStream();
 *   
 *   const handleAnalyze = async () => {
 *     await startStream('/api/ai/dominus/stream', { leadId: '123' });
 *   };
 */

import { useCallback,useRef, useState } from "react";
import { logger } from "@/lib/logger";

export interface UseAIStreamOptions {
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number; // Base delay in ms
}

export interface UseAIStreamReturn {
  text: string;
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  startStream: (url: string, body?: any) => Promise<void>;
  cancelStream: () => void;
  reset: () => void;
}

export function useAIStream(options: UseAIStreamOptions = {}): UseAIStreamReturn {
  const {
    onComplete,
    onError,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const abortedRef = useRef(false);

  const cancelStream = useCallback(() => {
    abortedRef.current = true;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    cancelStream();
    setText("");
    setIsComplete(false);
    setError(null);
    retryCountRef.current = 0;
    abortedRef.current = false;
  }, [cancelStream]);

  const startStream = useCallback(
    async (url: string, body?: any) => {
      reset();
      setIsStreaming(true);
      abortedRef.current = false;

      try {
        // For SSE with POST, we need to create a session first
        // This creates a temporary streaming session ID
        const sessionResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${sessionResponse.status}`);
        }

        // Check if response is SSE
        const contentType = sessionResponse.headers.get("Content-Type");
        if (!contentType?.includes("text/event-stream")) {
          // Not streaming - just return the full response
          const data = await sessionResponse.json();
          setText(data.content || data.fullText || JSON.stringify(data));
          setIsComplete(true);
          setIsStreaming(false);
          onComplete?.(text);
          return;
        }

        // Read the SSE stream
        const reader = sessionResponse.body?.getReader();
        if (!reader) {
          throw new Error("No reader available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (!abortedRef.current) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              const event = line.substring(6).trim();
              
              if (event === "error") {
                const errorLine = lines.find(l => l.startsWith("data:"));
                if (errorLine) {
                  const errorData = JSON.parse(errorLine.substring(5));
                  throw new Error(errorData.error);
                }
              }
            } else if (line.startsWith("data:")) {
              const data = JSON.parse(line.substring(5));
              
              if (data.token) {
                fullText += data.token;
                setText(fullText);
              } else if (data.fullText) {
                fullText = data.fullText;
                setText(fullText);
                setIsComplete(true);
                setIsStreaming(false);
                onComplete?.(fullText);
                return;
              }
            }
          }
        }

        if (abortedRef.current) {
          setError("Stream cancelled");
        } else {
          setIsComplete(true);
          setIsStreaming(false);
          onComplete?.(fullText);
        }

      } catch (err) {
        logger.error("[useAIStream] Error:", err);
        const errorMsg = err instanceof Error ? err.message : "Stream failed";
        
        // Retry logic
        if (retryCountRef.current < maxRetries && !abortedRef.current) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
          
          logger.debug(`[useAIStream] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
          
          setTimeout(() => {
            if (!abortedRef.current) {
              void startStream(url, body);
            }
          }, delay);
        } else {
          setError(errorMsg);
          setIsStreaming(false);
          onError?.(err instanceof Error ? err : new Error(errorMsg));
        }
      }
    },
    [maxRetries, retryDelay, onComplete, onError, reset, text]
  );

  return {
    text,
    isStreaming,
    isComplete,
    error,
    startStream,
    cancelStream,
    reset,
  };
}
