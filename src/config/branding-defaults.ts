import { BRAND_ACCENT, BRAND_NAVY, BRAND_SECONDARY } from "@/lib/constants/branding";

export const CLEARSKAI_BRANDING = {
  orgId: "00000000-0000-0000-0000-000000000000",
  name: "ClearSkai Technologies, LLC",
  roc: "ROC-345678",
  contact: {
    name: "Damien Willingham",
    title: "Founder & Lead Technologist",
    phone: "(480) 995-5820",
    email: "damien@clearskai.com",
    website: "https://www.clearskai.com",
  },
  tagline: "Moving Blue Collar into the Future",
  serviceArea: "Phoenix Metro, Prescott, Flagstaff, Northern Arizona",
  colors: {
    primary: BRAND_NAVY,
    secondary: BRAND_SECONDARY,
    accent: BRAND_ACCENT,
  },
  logos: {
    logo: "/branding/clearskai/logo.svg",
    headshot: "/branding/clearskai/headshot.svg",
  },
  teamRoles: ["Lead Technologist", "Smart Home Installer", "Network Engineer"],
};
