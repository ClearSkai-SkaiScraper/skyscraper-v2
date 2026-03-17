"use client";

import { createContext, type ReactNode,useCallback, useContext, useState } from "react";

export interface TaskPanelOptions {
  /** Pre-fill the task title */
  prefillTitle?: string;
  /** Pre-fill the task description */
  prefillDescription?: string;
  /** Context label (e.g. "commissions", "permits", "claims") */
  context?: string;
  /** Related claim ID */
  claimId?: string;
  /** Related project ID */
  projectId?: string;
}

interface TaskSlideOverState {
  isOpen: boolean;
  options: TaskPanelOptions;
  openTaskPanel: (opts?: TaskPanelOptions) => void;
  closeTaskPanel: () => void;
}

const TaskSlideOverContext = createContext<TaskSlideOverState>({
  isOpen: false,
  options: {},
  openTaskPanel: () => {},
  closeTaskPanel: () => {},
});

export function TaskSlideOverProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<TaskPanelOptions>({});

  const openTaskPanel = useCallback((opts?: TaskPanelOptions) => {
    setOptions(opts ?? {});
    setIsOpen(true);
  }, []);

  const closeTaskPanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <TaskSlideOverContext.Provider value={{ isOpen, options, openTaskPanel, closeTaskPanel }}>
      {children}
    </TaskSlideOverContext.Provider>
  );
}

export function useTaskSlideOver() {
  return useContext(TaskSlideOverContext);
}
