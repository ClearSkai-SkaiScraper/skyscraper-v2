"use client";

import React from "react";
import { Toaster } from "sonner";

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="bottom-right"
      expand
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        style: {
          fontFamily: "inherit",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        },
        className: "toast",
      }}
    />
  );
};
