/**
 * TRADES NETWORK - SEED DATA
 * Common trade types, specialties, and sample data
 * "The Modern Everyday Tradesman" - Moving Blue Collar into the Future
 */

export const TRADE_TYPES = [
  // Construction & Building Trades
  { value: "roofing", label: "Roofing Contractor" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "electrical", label: "Electrical" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "drywall", label: "Drywall & Insulation" },
  { value: "windows", label: "Windows & Doors" },
  { value: "siding", label: "Siding" },
  { value: "gutters", label: "Gutters" },
  { value: "fencing", label: "Fencing" },
  { value: "landscaping", label: "Landscaping" },
  { value: "concrete", label: "Concrete & Masonry" },
  { value: "carpentry", label: "Carpentry" },
  { value: "tile", label: "Tile & Stone" },
  { value: "foundation", label: "Foundation Repair" },
  { value: "chimney", label: "Chimney & Fireplace" },

  // Restoration & Remediation
  { value: "restoration", label: "Water/Fire Restoration" },
  { value: "mold_remediation", label: "Mold Remediation" },
  { value: "biohazard_cleanup", label: "Biohazard & Crime Scene Cleanup" },
  { value: "asbestos_abatement", label: "Asbestos & Lead Abatement" },
  { value: "smoke_damage", label: "Smoke & Odor Remediation" },

  // Pool & Water Features
  { value: "pool_contractor", label: "Pool Contractor" },
  { value: "pool_service", label: "Pool Service & Maintenance" },
  { value: "pool_remodel", label: "Pool Remodel & Renovation" },
  { value: "hot_tub_spa", label: "Hot Tub & Spa Services" },
  { value: "water_features", label: "Water Features & Fountains" },

  // Smart Home & Technology
  { value: "smart_home", label: "Smart Home Installation" },
  { value: "home_automation", label: "Home Automation" },
  { value: "security_systems", label: "Security Systems" },
  { value: "av_installation", label: "Audio/Video Installation" },
  { value: "network_cabling", label: "Network & Cabling" },
  { value: "ev_charging", label: "EV Charging Installation" },

  // Solar & Energy
  { value: "solar", label: "Solar Installation" },
  { value: "battery_storage", label: "Battery Storage Systems" },
  { value: "energy_efficiency", label: "Energy Efficiency Audits" },

  // Specialty Services
  { value: "garage_doors", label: "Garage Doors" },
  { value: "appliance_repair", label: "Appliance Repair" },
  { value: "pest_control", label: "Pest Control" },
  { value: "tree_service", label: "Tree Service & Arborist" },
  { value: "irrigation", label: "Irrigation Systems" },
  { value: "septic_services", label: "Septic Services" },
  { value: "well_services", label: "Well & Water Services" },
  { value: "locksmith", label: "Locksmith Services" },
  { value: "handyman", label: "Handyman Services" },
];

export const TRADE_SPECIALTIES = {
  roofing: [
    "Asphalt Shingle Installation",
    "Metal Roofing",
    "Tile Roofing",
    "Flat/Commercial Roofing",
    "Roof Repair & Maintenance",
    "Emergency Tarping",
    "Gutter Installation",
    "Skylight Installation",
    "Roof Inspection",
    "Storm Damage Assessment",
  ],
  plumbing: [
    "Leak Detection & Repair",
    "Water Heater Installation",
    "Drain Cleaning",
    "Pipe Repair & Replacement",
    "Fixture Installation",
    "Sewer Line Repair",
    "Gas Line Installation",
    "Emergency Plumbing",
    "Backflow Prevention",
    "Re-piping",
  ],
  hvac: [
    "AC Installation & Repair",
    "Furnace Installation & Repair",
    "Duct Cleaning",
    "Air Quality Testing",
    "Heat Pump Installation",
    "Mini-Split Systems",
    "Emergency HVAC Service",
    "Preventive Maintenance",
    "Thermostat Installation",
    "Commercial HVAC",
  ],
  electrical: [
    "Panel Upgrades",
    "Outlet & Switch Installation",
    "Lighting Installation",
    "Circuit Breaker Repair",
    "Generator Installation",
    "EV Charger Installation",
    "Ceiling Fan Installation",
    "Emergency Electrical",
    "Code Compliance",
    "Commercial Electrical",
  ],
  general_contractor: [
    "Full Home Remodeling",
    "Kitchen Remodeling",
    "Bathroom Remodeling",
    "Room Additions",
    "Basement Finishing",
    "Project Management",
    "Insurance Restoration",
    "Commercial Build-Outs",
    "New Construction",
    "Historic Renovation",
  ],
  // Pool & Water Features
  pool_contractor: [
    "New Pool Construction",
    "Pool Renovation",
    "Plaster & Resurface",
    "Pool Deck Installation",
    "Equipment Installation",
    "Waterfall Features",
    "Pool Heating Systems",
    "Salt Water Conversion",
    "Infinity Edge Pools",
    "Commercial Pools",
  ],
  pool_service: [
    "Weekly Pool Maintenance",
    "Chemical Balancing",
    "Equipment Repair",
    "Filter Cleaning",
    "Pool Opening/Closing",
    "Green Pool Recovery",
    "Leak Detection",
    "Tile & Surface Cleaning",
    "Pool Inspections",
    "Vacation Service",
  ],
  // Biohazard & Remediation
  biohazard_cleanup: [
    "Crime Scene Cleanup",
    "Trauma Scene Cleaning",
    "Unattended Death Cleanup",
    "Blood & Bodily Fluid Cleanup",
    "Hoarding Cleanup",
    "Infectious Disease Decontamination",
    "Drug Lab Cleanup",
    "Tear Gas Remediation",
    "Vehicle Biohazard Cleanup",
    "Commercial Biohazard Services",
  ],
  mold_remediation: [
    "Mold Inspection & Testing",
    "Mold Removal",
    "HVAC Mold Remediation",
    "Crawlspace Remediation",
    "Attic Mold Treatment",
    "Post-Flood Mold Prevention",
    "Air Quality Testing",
    "Encapsulation",
    "Preventive Treatments",
    "Commercial Mold Services",
  ],
  // Smart Home & Technology
  smart_home: [
    "Smart Thermostat Installation",
    "Smart Lighting Systems",
    "Smart Lock Installation",
    "Voice Assistant Setup",
    "Smart Appliance Integration",
    "Whole-Home Automation",
    "Smart Irrigation",
    "Energy Monitoring",
    "Smart Security Integration",
    "Troubleshooting & Support",
  ],
  home_automation: [
    "Control4 Systems",
    "Crestron Installation",
    "Savant Systems",
    "Lutron Lighting",
    "Motorized Shades",
    "Climate Control Automation",
    "Multi-Room Audio",
    "Home Theater Automation",
    "Surveillance Integration",
    "Custom Programming",
  ],
  security_systems: [
    "Alarm System Installation",
    "Camera Installation",
    "Access Control",
    "Video Doorbells",
    "Motion Sensors",
    "24/7 Monitoring Setup",
    "Smart Lock Integration",
    "Commercial Security",
    "Fire & CO Detection",
    "Security Upgrades",
  ],
  // Solar & Energy
  solar: [
    "Residential Solar Installation",
    "Commercial Solar",
    "Solar Panel Maintenance",
    "Inverter Replacement",
    "System Monitoring Setup",
    "Grid-Tied Systems",
    "Off-Grid Solutions",
    "Solar Roof Tiles",
    "EV Charging Integration",
    "Permit & Utility Coordination",
  ],
};

export const URGENCY_LEVELS = [
  { value: "emergency", label: "Emergency (Same Day)", color: "red" },
  { value: "urgent", label: "Urgent (1-2 Days)", color: "orange" },
  { value: "high", label: "High Priority (3-7 Days)", color: "yellow" },
  { value: "normal", label: "Normal (1-2 Weeks)", color: "blue" },
  { value: "flexible", label: "Flexible Timeline", color: "gray" },
];

export const CONNECTION_STATUS = [
  { value: "pending", label: "Pending", description: "Waiting for pro response" },
  { value: "accepted", label: "Accepted", description: "Pro accepted connection" },
  { value: "declined", label: "Declined", description: "Pro declined request" },
  { value: "revoked", label: "Revoked", description: "Client cancelled request" },
];

export const CONTACT_METHODS = [
  { value: "phone", label: "Phone Call", icon: "phone" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "portal", label: "Portal Message", icon: "message-square" },
  { value: "text", label: "Text/SMS", icon: "smartphone" },
];

export const PRO_BADGES = [
  {
    value: "verified",
    label: "Verified Pro",
    description: "Identity and licensing verified",
    icon: "shield-check",
    color: "blue",
  },
  {
    value: "top_rated",
    label: "Top Rated",
    description: "4.8+ average rating with 10+ reviews",
    icon: "star",
    color: "yellow",
  },
  {
    value: "fast_response",
    label: "Fast Response",
    description: "Responds within 2 hours on average",
    icon: "zap",
    color: "green",
  },
  {
    value: "insurance_preferred",
    label: "Insurance Preferred",
    description: "Preferred by major insurance carriers",
    icon: "award",
    color: "purple",
  },
  {
    value: "emergency_available",
    label: "Emergency Available",
    description: "Offers 24/7 emergency service",
    icon: "alert-circle",
    color: "red",
  },
  {
    value: "eco_friendly",
    label: "Eco-Friendly",
    description: "Specializes in sustainable practices",
    icon: "leaf",
    color: "green",
  },
  {
    value: "veteran_owned",
    label: "Veteran Owned",
    description: "Veteran-owned business",
    icon: "flag",
    color: "blue",
  },
];

export const DEFAULT_RESPONSE_TEMPLATES = [
  {
    name: "Initial Response",
    body: `Thank you for your inquiry! I've received your request and will review the details shortly. I typically respond with a detailed estimate within 24 hours.\n\nIn the meantime, if you have any urgent questions or additional photos to share, feel free to message me directly through the portal.\n\nLooking forward to working with you!`,
  },
  {
    name: "Schedule Inspection",
    body: `I'd like to schedule an on-site inspection to provide you with an accurate estimate. I have availability:\n\n• [Day 1] - [Time slots]\n• [Day 2] - [Time slots]\n• [Day 3] - [Time slots]\n\nPlease let me know which time works best for you, and I'll send a calendar confirmation.`,
  },
  {
    name: "Estimate Ready",
    body: `Good news! I've completed your estimate and it's ready for your review. You can view it in the portal under "Documents."\n\nThe estimate includes:\n• Detailed scope of work\n• Material specifications\n• Timeline estimate\n• Total investment\n\nI'm happy to discuss any questions you have. When would be a good time for a call?`,
  },
  {
    name: "Emergency Response",
    body: `I understand this is an emergency situation. I can have a crew on-site within [X hours/today/tomorrow morning].\n\nFor immediate concerns:\n• Call/Text: [Your Phone]\n• Emergency line: [Emergency #]\n\nI'll follow up within 15 minutes to confirm arrival time.`,
  },
];

// Matching algorithm scoring weights
export const MATCHING_WEIGHTS = {
  distance: 0.3, // 30% - proximity to job site
  rating: 0.25, // 25% - average rating
  availability: 0.2, // 20% - accepting new clients, availability calendar
  specialty: 0.15, // 15% - specialty match
  responseTime: 0.1, // 10% - historical response speed
};

// Default search radius expansion strategy
export const SEARCH_RADIUS_STRATEGY = [
  { radius: 10, minMatches: 5 }, // Try 10 miles first
  { radius: 25, minMatches: 3 }, // Expand to 25 if < 5 matches
  { radius: 50, minMatches: 1 }, // Expand to 50 if < 3 matches
  { radius: 100, minMatches: 1 }, // Last resort: 100 miles
];
