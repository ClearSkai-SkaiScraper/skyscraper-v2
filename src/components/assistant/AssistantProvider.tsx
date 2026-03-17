"use client";

import React, { createContext, useCallback,useContext, useState } from "react";

import { logger } from "@/lib/logger";

interface AssistantContextValue {
  isOpen: boolean;
  draftMessage: string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  prefill: (text: string) => void;
  send: (text: string) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    logger.warn("useAssistant called outside provider - returning safe mock");
    return {
      isOpen: false,
      draftMessage: "",
      open: () => {},
      close: () => {},
      toggle: () => {},
      prefill: () => {},
      send: () => {},
    };
  }
  return context;
}

interface AssistantProviderProps {
  children: React.ReactNode;
}

export function AssistantProvider({ children }: AssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const prefill = useCallback((text: string) => {
    setDraftMessage(text);
  }, []);

  const send = useCallback((text: string) => {
    setDraftMessage(text);
    setIsOpen(true);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        draftMessage,
        open,
        close,
        toggle,
        prefill,
        send,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}
