"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Splash() {
  const pathname = usePathname();
  const [show, setShow] = useState(true);

  // never show on auth pages
  const block = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

  useEffect(() => {
    if (block) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(false), 1500); // <= 1.5s then hide
    return () => clearTimeout(t);
  }, [block]);

  if (!show) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        display: block ? "none" : "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10,26,47,0.92)", // #0A1A2F w/ transparency
        zIndex: 40, // below header tooltips etc.
        pointerEvents: "none", // <-- never blocks clicks
      }}
    >
      <div
        style={{
          padding: "28px 36px",
          borderRadius: 12,
          background: "#0A1A2F",
          boxShadow: "0 8px 30px rgba(0,0,0,.35)",
        }}
      >
        {/* Replace with your SVG/Logo component */}
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/pro_portal_logo.png"
          alt="SkaiScraper"
          width={420}
          height={120}
        />
        <p style={{ textAlign: "center", marginTop: 12, opacity: 0.9 }}>
          Let’s Take Your Company to New Heights
        </p>
      </div>
    </div>
  );
}
