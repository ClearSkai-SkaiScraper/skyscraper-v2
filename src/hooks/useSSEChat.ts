import { useCallback,useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type ChatMessage =
  | { role: "user" | "assistant"; content: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { tool: string; result?: any; error?: string };

export function useSSEChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const send = useCallback(
    async (input: string) => {
      if (!input.trim()) return;

      // Add user message
      setMessages((prev) => [...prev, { role: "user", content: input }]);
      setIsStreaming(true);

      try {
        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Error: Authentication required" },
          ]);
          setIsStreaming(false);
          return;
        }

        // Call streaming assistant function
        const response = await fetch(
          `${
            // eslint-disable-next-line no-restricted-syntax
            (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
            // eslint-disable-next-line no-restricted-syntax
            process.env.NEXT_PUBLIC_SUPABASE_URL
          }/functions/v1/assistant-chat`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: messages
                .filter((m): m is { role: "user" | "assistant"; content: string } => "role" in m)
                .concat([{ role: "user", content: input }]),
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Request failed" }));
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${error.error || "Assistant request failed"}` },
          ]);
          setIsStreaming(false);
          return;
        }

        // Read SSE stream
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.delta) {
                // Append to last assistant message or create new one
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && "role" in last && last.role === "assistant") {
                    return [
                      ...prev.slice(0, -1),
                      { role: "assistant", content: last.content + data.delta },
                    ];
                  }
                  return [...prev, { role: "assistant", content: data.delta }];
                });
              } else if (data.tool) {
                // Add tool result
                setMessages((prev) => [
                  ...prev,
                  {
                    tool: data.tool,
                    ...(data.error ? { error: data.error } : { result: data.result }),
                  },
                ]);
              }
            } catch (e) {
              logger.error("Failed to parse SSE data:", e);
            }
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        logger.error("Chat error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${error.message}`,
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages]
  );

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, send, isStreaming, clear };
}
