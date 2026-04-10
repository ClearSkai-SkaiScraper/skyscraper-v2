"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "#story", label: "Story" },
  { href: "#demo", label: "Demo" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact Us" },
];

export default function MarketingNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold">SkaiScraper<span className="ml-[1px] align-super text-[10px]">™</span></span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-gray-600 transition hover:text-gray-900">
              {l.label}
            </a>
          ))}
          <SignedOut>
            <Link href="/sign-in?type=pro" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">PRO Sign In</Link>
            <Link href="/sign-in?type=client" className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">CLIENT Sign In</Link>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
            <Link href="/dashboard" className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Dashboard</Link>
          </SignedIn>
        </nav>
        <div className="md:hidden">
          {/* Mobile expansion potential future */}
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
      <rect x="2" y="2" width="28" height="28" rx="6" className="fill-blue-600" />
      <path d="M10 20L16 10L22 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="22" r="2" fill="white" />
    </svg>
  );
}
