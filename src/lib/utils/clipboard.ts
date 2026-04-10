/**
 * 🔥 PHASE C: QOL - Copy to Clipboard Utility
 */

import { toast } from "sonner";

export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label ? `${label} copied to clipboard` : "Copied to clipboard");
    return true;
  } catch (_error) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      toast.success(label ? `${label} copied to clipboard` : "Copied to clipboard");
      return true;
    } catch (_fallbackError) {
      toast.error("Could not copy to clipboard");
      return false;
    }
  }
}

// CopyButton component should be in a .tsx file, not .ts
// For now, export only the utility function
