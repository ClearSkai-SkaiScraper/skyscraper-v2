"use client";

import {
  Bookmark,
  Calculator,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  FileText,
  Link2,
  Loader2,
  Mail,
  MoreVertical,
  Package,
  Plus,
  RotateCcw,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { ClaimJobSelect, type ClaimJobSelection } from "@/components/selectors/ClaimJobSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types matching the API response shape ───────────────────────────────────
interface MaterialLine {
  category: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  coverage?: string;
}

interface EstimateResult {
  id: string;
  materials: MaterialLine[];
  totalCost: number;
  wasteFactor: number;
  measurements: {
    totalArea: number;
    pitch: string;
  };
  trade?: string;
  tradeLabel?: string;
  method?: string;
  jobContextType?: string;
  aiSummary?: string;
}

interface SavedEstimate {
  id: string;
  jobId?: string;
  claimId?: string;
  jobLabel: string;
  createdAt: string;
  totalArea: number;
  pitch: string;
  shingleType: string;
  materials: MaterialLine[];
  totalCost: number;
  wasteFactor: number;
  trade?: string;
  tradeLabel?: string;
}

// ── Dynamic item for windows/doors with multiple sizes ──────────────────────
interface DynamicItem {
  id: string;
  width: string;
  height: string;
  type: string;
  qty: string;
}

// ── Pitch options — value is the actual pitch string the API expects ────────
const ROOF_PITCHES = [
  { label: "Flat (2/12)", value: "2/12" },
  { label: "Low (4/12)", value: "4/12" },
  { label: "Standard (6/12)", value: "6/12" },
  { label: "Moderate (8/12)", value: "8/12" },
  { label: "Steep (10/12)", value: "10/12" },
  { label: "Very Steep (12/12)", value: "12/12" },
];

// ── Shingle types — value matches ShingleSpec.type ─────────────────────────
const SHINGLE_TYPES = [
  { label: "3-Tab Asphalt", value: "THREE_TAB" },
  { label: "Architectural Shingle", value: "ARCHITECTURAL" },
  { label: "Designer / Premium", value: "PREMIUM" },
];

// ── Complexity — matches WASTE_FACTORS keys ────────────────────────────────
const COMPLEXITY_OPTIONS = [
  { label: "Simple (gable)", value: "LOW" },
  { label: "Moderate (hip, some valleys)", value: "MEDIUM" },
  { label: "Complex (multiple valleys/dormers)", value: "HIGH" },
  { label: "Very Complex (turrets, multi-level)", value: "VERY_HIGH" },
];

// ── Job context options ──────────────────────────────────────────────────────
const JOB_CONTEXTS = [
  { value: "claim", label: "Insurance Claim" },
  { value: "retail", label: "Retail / Out-of-Pocket" },
  { value: "lead", label: "Lead / Sales Estimate" },
  { value: "repair", label: "Repair / Service" },
] as const;

// ── All supported trades (NO EMOJIS — roofing first) ────────────────────────
const TRADE_TYPES = [
  { value: "roofing", label: "Roofing", description: "Shingles, underlayment, flashing, ridge" },
  { value: "siding", label: "Siding", description: "Vinyl, hardie board, stone veneer" },
  { value: "gutters", label: "Gutters", description: "Gutters, downspouts, guards" },
  { value: "windows", label: "Windows", description: "Window units, trim, hardware" },
  { value: "doors", label: "Doors", description: "Interior, exterior, storm, patio" },
  { value: "painting", label: "Painting", description: "Interior/exterior paint, primer" },
  { value: "flooring", label: "Flooring", description: "Tile, hardwood, LVP, carpet" },
  { value: "drywall", label: "Drywall", description: "Sheetrock, mud, tape, texture" },
  { value: "insulation", label: "Insulation", description: "Batts, blown-in, spray foam" },
  { value: "fencing", label: "Fencing", description: "Wood, vinyl, chain link" },
  { value: "decking", label: "Decking / Porch", description: "Composite, wood, railing" },
  { value: "concrete", label: "Concrete / Flatwork", description: "Patio, driveway, sidewalk" },
  { value: "plumbing", label: "Plumbing", description: "Fixtures, piping, water heater" },
  { value: "electrical", label: "Electrical", description: "Panels, wiring, fixtures" },
  { value: "hvac", label: "HVAC", description: "Units, ductwork, vents, controls" },
  { value: "framing", label: "Framing", description: "Structural framing, trusses" },
  { value: "finish_carpentry", label: "Finish Carpentry", description: "Trim, molding, built-ins" },
  { value: "cabinets", label: "Cabinets & Countertops", description: "Kitchen, bath, vanity" },
  { value: "demolition", label: "Demolition", description: "Tear-out, haul-off, debris" },
  { value: "mitigation", label: "Mitigation", description: "Water/fire/mold mitigation" },
  { value: "masonry", label: "Masonry", description: "Brick, block, stone, tuckpointing" },
  { value: "solar", label: "Solar", description: "Panels, inverters, mounting" },
  { value: "landscaping", label: "Landscaping", description: "Grading, sod, irrigation" },
  { value: "garage_doors", label: "Garage Doors", description: "Doors, openers, hardware" },
  { value: "appliances", label: "Appliances", description: "Kitchen, laundry, install" },
  { value: "fire_sprinkler", label: "Fire / Sprinkler", description: "Sprinkler systems, alarms" },
  { value: "low_voltage", label: "Low Voltage", description: "Data, security, AV, cameras" },
] as const;

// ── Per-trade measurement config ─────────────────────────────────────────────
interface TradeMeasurement {
  id: string;
  label: string;
  unit: string;
  placeholder: string;
  required?: boolean;
}

const TRADE_MEASUREMENTS: Record<string, TradeMeasurement[]> = {
  siding: [
    { id: "area", label: "Wall Area", unit: "sq ft", placeholder: "1800", required: true },
    { id: "stories", label: "Stories", unit: "", placeholder: "2" },
    { id: "windows", label: "Window Count", unit: "", placeholder: "12" },
    { id: "doors", label: "Door Count", unit: "", placeholder: "3" },
  ],
  gutters: [
    { id: "linearFt", label: "Total Linear Feet", unit: "ft", placeholder: "180", required: true },
    { id: "corners", label: "Corners", unit: "", placeholder: "6" },
    { id: "downspouts", label: "Downspout Drops", unit: "", placeholder: "4" },
    { id: "stories", label: "Stories", unit: "", placeholder: "2" },
  ],
  windows: [
    { id: "_dynamic_windows", label: "Window Items", unit: "", placeholder: "", required: true },
  ],
  doors: [{ id: "_dynamic_doors", label: "Door Items", unit: "", placeholder: "", required: true }],
  painting: [
    { id: "area", label: "Paint Area", unit: "sq ft", placeholder: "3000", required: true },
    { id: "scope", label: "Scope", unit: "", placeholder: "Interior / Exterior / Both" },
    { id: "coats", label: "Coats", unit: "", placeholder: "2" },
    { id: "trimLf", label: "Trim Linear Ft", unit: "ft", placeholder: "200" },
  ],
  flooring: [
    { id: "area", label: "Floor Area", unit: "sq ft", placeholder: "1200", required: true },
    { id: "rooms", label: "Room Count", unit: "", placeholder: "5" },
    { id: "material", label: "Material", unit: "", placeholder: "LVP / Tile / Hardwood" },
    { id: "transitions", label: "Transitions", unit: "", placeholder: "4" },
  ],
  drywall: [
    { id: "area", label: "Wall/Ceiling Area", unit: "sq ft", placeholder: "2000", required: true },
    { id: "ceilings", label: "Ceiling sq ft", unit: "sq ft", placeholder: "800" },
    { id: "patches", label: "Patch Count", unit: "", placeholder: "0" },
    {
      id: "texture",
      label: "Texture Type",
      unit: "",
      placeholder: "Smooth / Orange Peel / Knockdown",
    },
  ],
  insulation: [
    { id: "area", label: "Insulation Area", unit: "sq ft", placeholder: "1500", required: true },
    { id: "rValue", label: "R-Value Target", unit: "", placeholder: "R-38" },
    { id: "type", label: "Type", unit: "", placeholder: "Batts / Blown / Spray Foam" },
    { id: "depth", label: "Depth", unit: "in", placeholder: "12" },
  ],
  fencing: [
    { id: "linearFt", label: "Total Linear Feet", unit: "ft", placeholder: "200", required: true },
    { id: "height", label: "Height", unit: "ft", placeholder: "6" },
    { id: "gates", label: "Gate Count", unit: "", placeholder: "2" },
    { id: "material", label: "Material", unit: "", placeholder: "Wood / Vinyl / Chain Link" },
  ],
  decking: [
    { id: "area", label: "Deck Area", unit: "sq ft", placeholder: "400", required: true },
    { id: "railingLf", label: "Railing Linear Ft", unit: "ft", placeholder: "60" },
    { id: "stairCount", label: "Stair Sets", unit: "", placeholder: "1" },
    { id: "material", label: "Material", unit: "", placeholder: "Composite / Pressure Treated" },
  ],
  concrete: [
    { id: "area", label: "Surface Area", unit: "sq ft", placeholder: "600", required: true },
    { id: "thickness", label: "Thickness", unit: "in", placeholder: "4" },
    { id: "type", label: "Type", unit: "", placeholder: "Patio / Driveway / Sidewalk" },
    { id: "finish", label: "Finish", unit: "", placeholder: "Broom / Stamped / Exposed Aggregate" },
  ],
  plumbing: [
    { id: "fixtures", label: "Fixture Count", unit: "", placeholder: "6", required: true },
    { id: "type", label: "Scope", unit: "", placeholder: "New / Repipe / Repair" },
    { id: "linearFt", label: "Pipe Run (ft)", unit: "ft", placeholder: "100" },
    { id: "waterHeater", label: "Water Heater", unit: "", placeholder: "Yes / No" },
  ],
  electrical: [
    { id: "circuits", label: "Circuit Count", unit: "", placeholder: "10", required: true },
    { id: "outlets", label: "Outlet/Switch Count", unit: "", placeholder: "20" },
    { id: "panelUpgrade", label: "Panel Upgrade", unit: "", placeholder: "200A / No" },
    { id: "fixtures", label: "Light Fixture Count", unit: "", placeholder: "12" },
  ],
  hvac: [
    { id: "sqft", label: "Conditioned Area", unit: "sq ft", placeholder: "2000", required: true },
    { id: "tonnage", label: "Tonnage", unit: "ton", placeholder: "3" },
    { id: "type", label: "System Type", unit: "", placeholder: "Split / Package / Mini-Split" },
    { id: "ductwork", label: "New Ductwork", unit: "", placeholder: "Yes / No / Partial" },
  ],
  framing: [
    { id: "area", label: "Wall/Floor Area", unit: "sq ft", placeholder: "1000", required: true },
    { id: "stories", label: "Stories", unit: "", placeholder: "1" },
    { id: "scope", label: "Scope", unit: "", placeholder: "New / Repair / Addition" },
    { id: "openings", label: "Openings (windows/doors)", unit: "", placeholder: "8" },
  ],
  finish_carpentry: [
    { id: "linearFt", label: "Trim Linear Ft", unit: "ft", placeholder: "400", required: true },
    { id: "crownLf", label: "Crown Molding (ft)", unit: "ft", placeholder: "200" },
    { id: "baseLf", label: "Base Molding (ft)", unit: "ft", placeholder: "300" },
    { id: "doors", label: "Door Casings", unit: "", placeholder: "10" },
  ],
  cabinets: [
    { id: "linearFt", label: "Cabinet Linear Ft", unit: "ft", placeholder: "20", required: true },
    { id: "counterSqft", label: "Counter Top (sq ft)", unit: "sq ft", placeholder: "40" },
    { id: "tier", label: "Grade", unit: "", placeholder: "Stock / Semi-Custom / Custom" },
    { id: "sink", label: "Sink + Faucet", unit: "", placeholder: "Yes / No" },
  ],
  demolition: [
    { id: "area", label: "Demo Area", unit: "sq ft", placeholder: "500", required: true },
    { id: "type", label: "Material Type", unit: "", placeholder: "Drywall / Flooring / Mixed" },
    { id: "dumpsters", label: "Dumpster Count", unit: "", placeholder: "1" },
    { id: "hazmat", label: "Hazardous Materials", unit: "", placeholder: "None / Asbestos / Lead" },
  ],
  mitigation: [
    { id: "area", label: "Affected Area", unit: "sq ft", placeholder: "800", required: true },
    { id: "type", label: "Damage Type", unit: "", placeholder: "Water / Fire / Mold" },
    { id: "class", label: "Water Class (1-4)", unit: "", placeholder: "2" },
    { id: "category", label: "Category (1-3)", unit: "", placeholder: "1" },
  ],
  masonry: [
    { id: "area", label: "Wall Area", unit: "sq ft", placeholder: "300", required: true },
    { id: "material", label: "Material", unit: "", placeholder: "Brick / Block / Stone" },
    { id: "scope", label: "Scope", unit: "", placeholder: "New / Tuckpoint / Repair" },
    { id: "height", label: "Height", unit: "ft", placeholder: "8" },
  ],
  solar: [
    { id: "sqft", label: "Roof Area Available", unit: "sq ft", placeholder: "600", required: true },
    { id: "kw", label: "System Size (kW)", unit: "kW", placeholder: "8" },
    { id: "panels", label: "Panel Count", unit: "", placeholder: "20" },
    { id: "battery", label: "Battery Storage", unit: "", placeholder: "Yes / No" },
  ],
  landscaping: [
    { id: "area", label: "Landscape Area", unit: "sq ft", placeholder: "2000", required: true },
    { id: "scope", label: "Scope", unit: "", placeholder: "Sod / Plants / Hardscape / Full" },
    { id: "irrigation", label: "Irrigation", unit: "", placeholder: "New / Repair / None" },
    { id: "grading", label: "Grading Needed", unit: "", placeholder: "Yes / No" },
  ],
  garage_doors: [
    { id: "doorCount", label: "Door Count", unit: "", placeholder: "2", required: true },
    { id: "width", label: "Width (ft)", unit: "ft", placeholder: "16" },
    { id: "height", label: "Height (ft)", unit: "ft", placeholder: "7" },
    { id: "opener", label: "Opener Included", unit: "", placeholder: "Yes / No" },
  ],
  appliances: [
    { id: "count", label: "Appliance Count", unit: "", placeholder: "4", required: true },
    { id: "types", label: "Types", unit: "", placeholder: "Fridge, Range, Dishwasher, Micro" },
    { id: "tier", label: "Grade", unit: "", placeholder: "Standard / Mid / Premium" },
    { id: "install", label: "Install Included", unit: "", placeholder: "Yes / No" },
  ],
  fire_sprinkler: [
    { id: "heads", label: "Head Count", unit: "", placeholder: "12", required: true },
    { id: "linearFt", label: "Pipe Run (ft)", unit: "ft", placeholder: "200" },
    { id: "type", label: "System Type", unit: "", placeholder: "Wet / Dry / Pre-Action" },
    { id: "scope", label: "Scope", unit: "", placeholder: "New / Retrofit / Repair" },
  ],
  low_voltage: [
    { id: "drops", label: "Data/Cable Drops", unit: "", placeholder: "10", required: true },
    { id: "cameras", label: "Camera Count", unit: "", placeholder: "4" },
    { id: "speakers", label: "Speaker/AV Count", unit: "", placeholder: "6" },
    { id: "panel", label: "Network Panel", unit: "", placeholder: "Yes / No" },
  ],
};

export default function MaterialEstimatorPage() {
  // Trade selection
  const [selectedTrade, setSelectedTrade] = useState("roofing");
  const [tradeMeasurements, setTradeMeasurements] = useState<Record<string, string>>({});
  const [jobContextType, setJobContextType] = useState("claim");

  // Dynamic items for windows & doors (multiple sizes)
  const [windowItems, setWindowItems] = useState<DynamicItem[]>([
    { id: "w1", width: "", height: "", type: "Double Hung", qty: "1" },
  ]);
  const [doorItems, setDoorItems] = useState<DynamicItem[]>([
    { id: "d1", width: "36", height: "80", type: "Entry", qty: "1" },
  ]);

  // Roofing-specific measurements
  const [totalArea, setTotalArea] = useState("");
  const [pitch, setPitch] = useState("6/12");
  const [complexity, setComplexity] = useState("MEDIUM");
  const [ridgeLf, setRidgeLf] = useState("");
  const [hipLf, setHipLf] = useState("");
  const [valleyLf, setValleyLf] = useState("");
  const [eaveLf, setEaveLf] = useState("");
  const [rakeLf, setRakeLf] = useState("");

  // Shingle
  const [shingleType, setShingleType] = useState("ARCHITECTURAL");

  // Job context
  const [jobContext, setJobContext] = useState<ClaimJobSelection>({});
  const [jobLabel, setJobLabel] = useState("");

  // State
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeStatus, setRouteStatus] = useState<"idle" | "routing" | "routed">("idle");

  // Saved estimates
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [estimatesLoading, setEstimatesLoading] = useState(true);

  // PDF ref
  const reportRef = useRef<HTMLDivElement>(null);

  // AI Summary toggle
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Scope of Work uploader
  const [scopeFile, setScopeFile] = useState<File | null>(null);
  const [scopeParsing, setScopeParsing] = useState(false);
  const [scopeResult, setScopeResult] = useState<{
    trade?: string;
    measurements?: Record<string, string>;
    lineItems?: Array<{
      description: string;
      quantity: string;
      unit: string;
      xactimateCode?: string;
      approvedAmount?: number;
    }>;
    carrierName?: string;
    claimNumber?: string;
    totalApproved?: number;
    notes?: string;
  } | null>(null);
  const scopeInputRef = useRef<HTMLInputElement>(null);

  // AI Chat — notes & conversation for the estimator
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatMessages, setAiChatMessages] = useState<
    Array<{ role: "user" | "ai"; text: string; time: string }>
  >([]);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch saved estimates from DB on mount ────────────────────────────────
  const loadEstimates = useCallback(async () => {
    try {
      const res = await fetch("/api/materials/estimates");
      const data = await res.json();
      if (data.ok && data.estimates) {
        setSavedEstimates(data.estimates);
      }
    } catch {
      /* silently fail — estimates panel just stays empty */
    } finally {
      setEstimatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  // ── Handle scope of work file upload ────────────────────────────────────
  const handleScopeUpload = async (file: File) => {
    setScopeFile(file);
    setScopeParsing(true);
    setScopeResult(null);
    setError("");

    try {
      let scopeText = "";

      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        scopeText = await file.text();
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // Extract text from PDF using pdf.js
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => ("str" in item ? item.str : ""))
            .join(" ");
          pages.push(pageText);
        }
        scopeText = pages.join("\n\n");
      } else {
        // For images or other files, read as base64 text
        scopeText = `[Uploaded file: ${file.name}, type: ${file.type}, size: ${file.size} bytes. Please provide the scope text manually.]`;
      }

      if (scopeText.length < 20) {
        setError("Could not extract enough text from the document. Try a text or PDF file.");
        setScopeParsing(false);
        return;
      }

      const res = await fetch("/api/materials/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse-scope", scopeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scope parsing failed");

      const scope = data.scopeData;
      setScopeResult(scope);

      // Auto-populate trade selector
      if (scope.trade) {
        const matched = TRADE_TYPES.find(
          (t) =>
            t.value === scope.trade || t.label.toLowerCase().includes(scope.trade.toLowerCase())
        );
        if (matched) {
          handleTradeChange(matched.value);
        }
      }

      // Auto-populate measurements
      if (scope.measurements) {
        setTradeMeasurements((prev) => ({ ...prev, ...scope.measurements }));
        // If scope has area and trade is roofing, also set totalArea
        if (scope.measurements.area && selectedTrade === "roofing") {
          setTotalArea(scope.measurements.area);
        }
      }

      // Auto-set job context to "claim" when uploading a scope
      setJobContextType("claim");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse scope document");
    } finally {
      setScopeParsing(false);
    }
  };

  // ── AI Chat: send a message to the assistant ──────────────────────────
  const handleAiChatSend = async () => {
    const msg = aiChatInput.trim();
    if (!msg) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user" as const, text: msg, time: timestamp };
    setAiChatMessages((prev) => [...prev, userMsg]);
    setAiChatInput("");
    setAiChatLoading(true);

    try {
      const tradeConfig = TRADE_TYPES.find((t) => t.value === selectedTrade);
      const contextLabel =
        JOB_CONTEXTS.find((c) => c.value === jobContextType)?.label || "Estimate";

      const res = await fetch("/api/materials/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ai-chat",
          trade: selectedTrade,
          tradeLabel: tradeConfig?.label || selectedTrade,
          jobContextType,
          jobContextLabel: contextLabel,
          userMessage: msg,
          chatHistory: aiChatMessages.slice(-10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI chat failed");

      const aiTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAiChatMessages((prev) => [...prev, { role: "ai", text: data.reply, time: aiTimestamp }]);
    } catch {
      const errTimestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setAiChatMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, I couldn't process that. Try again.", time: errTimestamp },
      ]);
    } finally {
      setAiChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  // Build cumulative user notes from the final notes input for the AI estimate
  const buildUserNotes = () => {
    return aiChatInput.trim();
  };

  // ── Auto-estimate linear feet from area if user leaves them blank ────────
  function deriveLinearFeet(areaNum: number) {
    const side = Math.sqrt(areaNum);
    return {
      ridgeLength: ridgeLf ? Number(ridgeLf) : Math.round(side),
      hipLength: hipLf ? Number(hipLf) : 0,
      valleyLength: valleyLf ? Number(valleyLf) : 0,
      eaveLength: eaveLf ? Number(eaveLf) : Math.round(side * 2),
      rakeLength: rakeLf ? Number(rakeLf) : Math.round(side * 2),
    };
  }

  const handleEstimate = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (selectedTrade === "roofing") {
        // ── Roofing: use existing detailed calculator ──
        const areaNum = Number(totalArea);
        if (!totalArea || areaNum <= 0) {
          setError("Enter a valid roof area in square feet");
          setIsLoading(false);
          return;
        }
        const derived = deriveLinearFeet(areaNum);
        const res = await fetch("/api/materials/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "calculate",
            measurements: { totalArea: areaNum, pitch, complexity, ...derived },
            shingleSpec: { type: shingleType },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Estimation failed");
        setResult(data.estimate);
      } else {
        // ── All other trades: AI-powered estimation ──
        const tradeConfig = TRADE_TYPES.find((t) => t.value === selectedTrade);
        const measurements = TRADE_MEASUREMENTS[selectedTrade] || [];

        // Build measurement summary — handle dynamic items for windows/doors
        let measurementSummary = "";

        if (selectedTrade === "windows") {
          if (windowItems.length === 0 || !windowItems.some((w) => w.width && w.height)) {
            setError("Add at least one window with width and height");
            setIsLoading(false);
            return;
          }
          measurementSummary = windowItems
            .filter((w) => w.width && w.height)
            .map(
              (w, i) =>
                `Window ${i + 1}: ${w.width}"W x ${w.height}"H, Type: ${w.type}, Qty: ${w.qty || 1}`
            )
            .join("; ");
        } else if (selectedTrade === "doors") {
          if (doorItems.length === 0 || !doorItems.some((d) => d.width && d.height)) {
            setError("Add at least one door with width and height");
            setIsLoading(false);
            return;
          }
          measurementSummary = doorItems
            .filter((d) => d.width && d.height)
            .map(
              (d, i) =>
                `Door ${i + 1}: ${d.width}"W x ${d.height}"H, Type: ${d.type}, Qty: ${d.qty || 1}`
            )
            .join("; ");
        } else {
          const requiredField = measurements.find((m) => m.required);
          if (requiredField && !tradeMeasurements[requiredField.id]) {
            setError(`Please enter ${requiredField.label}`);
            setIsLoading(false);
            return;
          }
          measurementSummary = measurements
            .filter((m) => tradeMeasurements[m.id])
            .map((m) => `${m.label}: ${tradeMeasurements[m.id]}${m.unit ? ` ${m.unit}` : ""}`)
            .join(", ");
        }

        const contextLabel =
          JOB_CONTEXTS.find((c) => c.value === jobContextType)?.label || "Estimate";

        const res = await fetch("/api/materials/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ai-estimate",
            trade: selectedTrade,
            tradeLabel: tradeConfig?.label || selectedTrade,
            measurements: tradeMeasurements,
            measurementSummary,
            jobContextType,
            jobContextLabel: contextLabel,
            userNotes: buildUserNotes(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Estimation failed");
        setResult(data.estimate);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Estimation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteToABC = async () => {
    if (!result) return;
    setRouteStatus("routing");
    try {
      const res = await fetch("/api/materials/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "route",
          estimate: result,
          jobSiteZip: "86001",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to route to ABC Supply");
      }
      setRouteStatus("routed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Routing failed");
      setRouteStatus("idle");
    }
  };

  const handleReset = () => {
    setTotalArea("");
    setPitch("6/12");
    setComplexity("MEDIUM");
    setShingleType("ARCHITECTURAL");
    setRidgeLf("");
    setHipLf("");
    setValleyLf("");
    setEaveLf("");
    setRakeLf("");
    setTradeMeasurements({});
    setWindowItems([{ id: "w1", width: "", height: "", type: "Double Hung", qty: "1" }]);
    setDoorItems([{ id: "d1", width: "36", height: "80", type: "Entry", qty: "1" }]);
    setResult(null);
    setError("");
    setRouteStatus("idle");
  };

  const handleTradeChange = (trade: string) => {
    setSelectedTrade(trade);
    setTradeMeasurements({});
    setResult(null);
    setError("");
  };

  // ── Save current estimate to DB ────────────────────────────────────────────
  const handleSaveEstimate = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/materials/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobContext.jobId,
          claimId: jobContext.claimId || jobContext.resolvedClaimId,
          jobLabel: jobLabel || "Unlinked Estimate",
          totalArea: result.measurements.totalArea,
          pitch: result.measurements.pitch,
          shingleType,
          wasteFactor: result.wasteFactor,
          materials: result.materials,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await loadEstimates(); // re-fetch full list from DB
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setError("Failed to save estimate");
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/estimates?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSavedEstimates((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to delete estimate");
    }
  };

  // ── Transfer estimate to ABC Supply order ──────────────────────────────────
  const handleTransferToOrder = async (est: SavedEstimate) => {
    try {
      const res = await fetch("/api/materials/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "route",
          estimate: {
            materials: est.materials,
            totalCost: est.totalCost,
            wasteFactor: est.wasteFactor,
            measurements: { totalArea: est.totalArea, pitch: est.pitch },
          },
          jobSiteZip: "86001",
        }),
      });
      if (!res.ok) throw new Error("Route failed");
      alert("✅ Estimate transferred to ABC Supply!");
    } catch {
      alert("Failed to route — try again.");
    }
  };

  // ── Build materials text for email ─────────────────────────────────────────
  const buildMaterialsText = (est: SavedEstimate) => {
    const lines = est.materials.map(
      (m) => `${m.productName}: ${m.quantity} ${m.unit} ($${m.totalPrice.toLocaleString()})`
    );
    return [
      `Material Estimate — ${est.jobLabel}`,
      `Date: ${new Date(est.createdAt).toLocaleDateString()}`,
      `Roof: ${est.totalArea} sq ft • ${est.pitch} pitch`,
      ``,
      ...lines,
      ``,
      `Total: $${est.totalCost.toLocaleString()}`,
      ``,
      `— Generated by SkaiScraper`,
    ].join("%0A");
  };

  const handleRequestQuote = (est: SavedEstimate) => {
    const subject = encodeURIComponent(
      `Quote Request — ${est.jobLabel} (${est.materials.length} items)`
    );
    const body = buildMaterialsText(est);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleEmailPartner = (est: SavedEstimate) => {
    const subject = encodeURIComponent(`Materials List — ${est.jobLabel}`);
    const body = buildMaterialsText(est);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  // ── Attach estimate as a document link to the job/claim ──────────────────
  const handleAttachToJobDocs = async (est: SavedEstimate) => {
    if (!est.jobId && !est.claimId) {
      alert("This estimate isn't linked to a job or claim. Save it with a job first.");
      return;
    }
    try {
      const res = await fetch("/api/documents/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "estimate",
          sourceId: est.id,
          jobId: est.jobId || null,
          claimId: est.claimId || null,
          title: `Material Estimate — ${est.jobLabel}`,
          url: `/materials/estimator?load=${est.id}`,
          mimeType: "application/json",
          sizeBytes: null,
          category: "estimate",
        }),
      });
      if (res.ok) {
        alert("✅ Estimate attached to job documents!");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to attach");
      }
    } catch {
      alert("Failed to attach estimate to job docs");
    }
  };

  // ── Derived stats for the results header ─────────────────────────────────
  const wasteLabel = result?.wasteFactor ? `${Math.round((result.wasteFactor - 1) * 100)}%` : null;

  // ── Transfer current estimate to localStorage cart ──────────────────────
  const handleTransferToCart = () => {
    if (!result) return;
    try {
      const existingRaw = localStorage.getItem("skai-material-cart");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const newItems = result.materials.map((m) => ({
        productId: `est-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sku: "",
        name: m.productName,
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        unit: m.unit,
        imageUrl: "",
        supplier: "home-depot",
      }));
      localStorage.setItem("skai-material-cart", JSON.stringify([...existing, ...newItems]));
      window.location.href = "/materials/cart";
    } catch {
      setError("Failed to transfer to cart");
    }
  };

  // ── Download Professional PDF report ─────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!result) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const tradeLabel =
        result.tradeLabel ||
        TRADE_TYPES.find((t) => t.value === selectedTrade)?.label ||
        selectedTrade;
      const contextLabel = JOB_CONTEXTS.find((c) => c.value === jobContextType)?.label || "";

      // ── Helper: add footer to each page ──
      const addFooter = () => {
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          "This estimate is for planning purposes only. Verify all quantities with your supplier before ordering.",
          margin,
          pageHeight - 10
        );
        pdf.text(
          `Generated by SkaiScraper  •  ${new Date().toLocaleString()}  •  Page ${pdf.getNumberOfPages()}`,
          margin,
          pageHeight - 6
        );
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      };

      // ── Helper: check page break ──
      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 20) {
          addFooter();
          pdf.addPage();
          y = margin;
        }
      };

      // ── HEADER: Gradient bar ──
      pdf.setFillColor(30, 41, 59); // slate-900
      pdf.rect(0, 0, pageWidth, 32, "F");
      pdf.setFillColor(249, 115, 22); // orange-500 accent bar
      pdf.rect(0, 32, pageWidth, 2, "F");

      // Title on dark bar
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.text("Material Estimate Report", margin, 16);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(203, 213, 225); // slate-300
      pdf.text(
        `${tradeLabel}  •  ${contextLabel}  •  ${new Date().toLocaleDateString()}`,
        margin,
        24
      );

      y = 42;

      // ── PROJECT SUMMARY BOX ──
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, contentWidth, 24, 3, 3, "FD");

      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      const summaryItems = [
        { label: "Trade", value: tradeLabel },
        { label: "Context", value: contextLabel },
        { label: "Items", value: `${result.materials.length}` },
        { label: "Waste Factor", value: wasteLabel || "10%" },
        { label: "Total", value: `$${result.totalCost.toLocaleString()}` },
      ];
      const boxColWidth = contentWidth / summaryItems.length;
      summaryItems.forEach((item, i) => {
        const xPos = margin + boxColWidth * i + boxColWidth / 2;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        pdf.text(item.label, xPos, y + 9, { align: "center" });
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text(item.value, xPos, y + 17, { align: "center" });
      });

      y += 32;

      // ── MATERIALS TABLE ──
      // Table header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(margin, y, contentWidth, 8, "F");
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      const cols = {
        item: margin + 2,
        qty: margin + 95,
        unit: margin + 112,
        unitPrice: margin + 132,
        total: margin + 158,
      };
      pdf.text("Material / Product", cols.item, y + 5.5);
      pdf.text("Qty", cols.qty, y + 5.5);
      pdf.text("Unit", cols.unit, y + 5.5);
      pdf.text("Unit Price", cols.unitPrice, y + 5.5);
      pdf.text("Total", cols.total, y + 5.5);
      y += 8;

      // Table rows
      let currentCategory = "";
      result.materials.forEach((mat, idx) => {
        checkPageBreak(14);

        // Category header row
        if (mat.category && mat.category !== currentCategory) {
          currentCategory = mat.category;
          pdf.setFillColor(241, 245, 249); // slate-100
          pdf.rect(margin, y, contentWidth, 6, "F");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(71, 85, 105); // slate-600
          pdf.text(mat.category.toUpperCase(), cols.item, y + 4.2);
          y += 6;
          checkPageBreak(10);
        }

        // Alternating row background
        if (idx % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(248, 250, 252);
        }
        pdf.rect(margin, y, contentWidth, 8, "F");

        // Row border
        pdf.setDrawColor(241, 245, 249);
        pdf.line(margin, y + 8, margin + contentWidth, y + 8);

        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 41, 59);

        // Product name (truncated if too long)
        const name =
          mat.productName.length > 50 ? mat.productName.slice(0, 48) + "…" : mat.productName;
        pdf.text(name, cols.item, y + 5.5);

        pdf.setFont("helvetica", "bold");
        pdf.text(String(mat.quantity), cols.qty, y + 5.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 116, 139);
        pdf.text(mat.unit, cols.unit, y + 5.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`$${mat.unitPrice.toLocaleString()}`, cols.unitPrice, y + 5.5);
        pdf.setFont("helvetica", "bold");
        pdf.text(`$${mat.totalPrice.toLocaleString()}`, cols.total, y + 5.5);

        // Coverage note (small)
        if (mat.coverage) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(6);
          pdf.setTextColor(148, 163, 184);
          const covText = mat.coverage.length > 60 ? mat.coverage.slice(0, 58) + "…" : mat.coverage;
          pdf.text(covText, cols.item + 2, y + 8 + 3.5);
          y += 4; // extra space for coverage line
        }

        y += 8;
      });

      // ── TOTAL ROW ──
      checkPageBreak(14);
      pdf.setFillColor(249, 115, 22); // orange-500
      pdf.rect(margin, y + 2, contentWidth, 10, "F");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("ESTIMATED TOTAL", cols.item, y + 9);
      pdf.setFontSize(12);
      pdf.text(`$${result.totalCost.toLocaleString()}`, cols.total, y + 9);
      y += 16;

      // ── AI SUMMARY SECTION ──
      if (result.aiSummary) {
        checkPageBreak(30);
        pdf.setFillColor(239, 246, 255); // blue-50
        pdf.setDrawColor(59, 130, 246); // blue-500
        pdf.roundedRect(margin, y, contentWidth, 6, 2, 2, "FD");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 64, 175); // blue-800
        pdf.text("AI Analysis & Recommendations", margin + 3, y + 4.3);
        y += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(51, 65, 85); // slate-700

        // Word-wrap the summary
        const summaryLines = pdf.splitTextToSize(result.aiSummary, contentWidth - 6);
        for (const line of summaryLines) {
          checkPageBreak(5);
          pdf.text(line, margin + 3, y + 3);
          y += 4;
        }
        y += 4;
      }

      // ── SCOPE OF WORK REFERENCE ──
      if (scopeResult) {
        checkPageBreak(20);
        pdf.setFillColor(240, 253, 244); // green-50
        pdf.setDrawColor(34, 197, 94); // green-500
        pdf.roundedRect(margin, y, contentWidth, 6, 2, 2, "FD");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(22, 101, 52); // green-800
        pdf.text("Insurance Scope Reference", margin + 3, y + 4.3);
        y += 8;

        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(51, 65, 85);
        if (scopeResult.carrierName) {
          pdf.text(`Carrier: ${scopeResult.carrierName}`, margin + 3, y + 3);
          y += 5;
        }
        if (scopeResult.claimNumber) {
          pdf.text(`Claim #: ${scopeResult.claimNumber}`, margin + 3, y + 3);
          y += 5;
        }
        if (scopeResult.totalApproved) {
          pdf.text(
            `Approved Amount: $${scopeResult.totalApproved.toLocaleString()}`,
            margin + 3,
            y + 3
          );
          y += 5;
        }
        if (scopeResult.notes) {
          const noteLines = pdf.splitTextToSize(`Notes: ${scopeResult.notes}`, contentWidth - 6);
          for (const line of noteLines) {
            checkPageBreak(5);
            pdf.text(line, margin + 3, y + 3);
            y += 4;
          }
        }
        y += 4;
      }

      // Add footer to last page
      addFooter();

      const filename = `SkaiScraper-Estimate-${tradeLabel.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("PDF download failed — try again");
    }
  };

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="trades"
        title="Material Estimator"
        subtitle="Calculate materials for any trade — roofing, siding, flooring, electrical, and more. Route orders to suppliers with one click."
        icon={<Calculator className="h-7 w-7" />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Input Form ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Project Measurements</CardTitle>
            <CardDescription>
              Select a trade and enter measurements for your estimate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Trade Selector */}
            <div className="space-y-2">
              <Label>Trade Type</Label>
              <Select value={selectedTrade} onValueChange={handleTradeChange}>
                <SelectTrigger className="font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <span>{t.label}</span>
                        <span className="text-[10px] text-muted-foreground">— {t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link to Job / Claim */}
            <div className="space-y-2">
              <Label>Link to Job / Claim (optional)</Label>
              <ClaimJobSelect
                value={jobContext}
                onValueChange={(next) => {
                  setJobContext(next);
                  // Derive label for saved estimates
                  const el = document.querySelector(
                    "[data-radix-select-viewport] [data-state=checked]"
                  );
                  setJobLabel(el?.textContent || "Linked Job");
                }}
                placeholder="Link estimate to a job or claim…"
              />
            </div>

            {/* Job Context Type */}
            <div className="space-y-2">
              <Label>Job Context</Label>
              <Select value={jobContextType} onValueChange={setJobContextType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CONTEXTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {jobContextType === "claim"
                  ? "Insurance claim — includes Xactimate codes & supplement notes"
                  : jobContextType === "retail"
                    ? "Out-of-pocket job — includes good/better/best tiers"
                    : jobContextType === "lead"
                      ? "Sales estimate — pricing for proposals & bids"
                      : "Service/repair — diagnostic + parts breakdown"}
              </p>
            </div>

            {/* ── INSURANCE SCOPE OF WORK UPLOADER ── */}
            {jobContextType === "claim" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Insurance Approved Scope of Work
                </Label>
                <div
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all ${
                    scopeFile
                      ? "border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-900/20"
                      : "border-slate-300 bg-slate-50/50 hover:border-orange-400 hover:bg-orange-50/30 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-orange-600"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-orange-400", "bg-orange-50/30");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("border-orange-400", "bg-orange-50/30");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-orange-400", "bg-orange-50/30");
                    const file = e.dataTransfer.files[0];
                    if (file) handleScopeUpload(file);
                  }}
                >
                  <input
                    ref={scopeInputRef}
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleScopeUpload(file);
                    }}
                  />
                  {scopeParsing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Parsing scope document with AI…
                      </p>
                      <p className="text-xs text-slate-400">
                        Extracting trades, measurements & line items
                      </p>
                    </div>
                  ) : scopeFile && scopeResult ? (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            Scope parsed successfully
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setScopeFile(null);
                            setScopeResult(null);
                            if (scopeInputRef.current) scopeInputRef.current.value = "";
                          }}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">{scopeFile.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {scopeResult.trade && (
                          <Badge variant="secondary" className="text-[10px]">
                            Trade: {scopeResult.trade}
                          </Badge>
                        )}
                        {scopeResult.carrierName && (
                          <Badge variant="secondary" className="text-[10px]">
                            {scopeResult.carrierName}
                          </Badge>
                        )}
                        {scopeResult.claimNumber && (
                          <Badge variant="secondary" className="text-[10px]">
                            Claim #{scopeResult.claimNumber}
                          </Badge>
                        )}
                        {scopeResult.totalApproved && (
                          <Badge className="bg-green-100 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Approved: ${scopeResult.totalApproved.toLocaleString()}
                          </Badge>
                        )}
                        {scopeResult.lineItems && (
                          <Badge variant="outline" className="text-[10px]">
                            {scopeResult.lineItems.length} line items
                          </Badge>
                        )}
                      </div>
                      {scopeResult.notes && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                          📋 {scopeResult.notes.slice(0, 150)}
                          {scopeResult.notes.length > 150 ? "…" : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Drop scope document here or{" "}
                        <button
                          onClick={() => scopeInputRef.current?.click()}
                          className="text-orange-600 underline hover:text-orange-700 dark:text-orange-400"
                        >
                          browse files
                        </button>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Upload your insurance-approved scope (PDF or TXT) — AI will auto-extract
                        trade, measurements & line items
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── ROOFING-SPECIFIC INPUTS ── */}
            {selectedTrade === "roofing" && (
              <>
                {/* Total Area */}
                <div className="space-y-2">
                  <Label htmlFor="sqft">Total Roof Area (sq ft) *</Label>
                  <Input
                    id="sqft"
                    type="number"
                    placeholder="2400"
                    value={totalArea}
                    onChange={(e) => setTotalArea(e.target.value)}
                  />
                </div>

                {/* Pitch & Complexity side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Roof Pitch</Label>
                    <Select value={pitch} onValueChange={setPitch}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOF_PITCHES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Complexity</Label>
                    <Select value={complexity} onValueChange={setComplexity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLEXITY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Shingle Type */}
                <div className="space-y-2">
                  <Label>Shingle Type</Label>
                  <Select value={shingleType} onValueChange={setShingleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHINGLE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Linear measurements — optional, auto-estimated if blank */}
                <div>
                  <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                    Linear Measurements (optional — estimated from area if blank)
                  </Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="ridge" className="text-xs">
                        Ridge (ft)
                      </Label>
                      <Input
                        id="ridge"
                        type="number"
                        placeholder="auto"
                        value={ridgeLf}
                        onChange={(e) => setRidgeLf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="hip" className="text-xs">
                        Hip (ft)
                      </Label>
                      <Input
                        id="hip"
                        type="number"
                        placeholder="0"
                        value={hipLf}
                        onChange={(e) => setHipLf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="valley" className="text-xs">
                        Valley (ft)
                      </Label>
                      <Input
                        id="valley"
                        type="number"
                        placeholder="0"
                        value={valleyLf}
                        onChange={(e) => setValleyLf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="eave" className="text-xs">
                        Eave (ft)
                      </Label>
                      <Input
                        id="eave"
                        type="number"
                        placeholder="auto"
                        value={eaveLf}
                        onChange={(e) => setEaveLf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rake" className="text-xs">
                        Rake (ft)
                      </Label>
                      <Input
                        id="rake"
                        type="number"
                        placeholder="auto"
                        value={rakeLf}
                        onChange={(e) => setRakeLf(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── OTHER TRADES: Dynamic measurements ── */}
            {selectedTrade !== "roofing" && selectedTrade === "windows" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Windows — Add each size separately
                  </Label>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() =>
                      setWindowItems((prev) => [
                        ...prev,
                        {
                          id: `w${Date.now()}`,
                          width: "",
                          height: "",
                          type: "Double Hung",
                          qty: "1",
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Window
                  </Button>
                </div>
                <div className="space-y-2">
                  {windowItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                      <div className="grid flex-1 grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Width (in)</Label>
                          <Input
                            placeholder="36"
                            value={item.width}
                            onChange={(e) =>
                              setWindowItems((prev) =>
                                prev.map((w) =>
                                  w.id === item.id ? { ...w, width: e.target.value } : w
                                )
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Height (in)</Label>
                          <Input
                            placeholder="60"
                            value={item.height}
                            onChange={(e) =>
                              setWindowItems((prev) =>
                                prev.map((w) =>
                                  w.id === item.id ? { ...w, height: e.target.value } : w
                                )
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Type</Label>
                          <Select
                            value={item.type}
                            onValueChange={(v) =>
                              setWindowItems((prev) =>
                                prev.map((w) => (w.id === item.id ? { ...w, type: v } : w))
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "Double Hung",
                                "Single Hung",
                                "Casement",
                                "Sliding",
                                "Picture",
                                "Bay",
                                "Awning",
                                "Egress",
                              ].map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Qty</Label>
                          <Input
                            placeholder="1"
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              setWindowItems((prev) =>
                                prev.map((w) =>
                                  w.id === item.id ? { ...w, qty: e.target.value } : w
                                )
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      {windowItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setWindowItems((prev) => prev.filter((w) => w.id !== item.id))
                          }
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Total: {windowItems.reduce((sum, w) => sum + (Number(w.qty) || 1), 0)} window
                  {windowItems.reduce((sum, w) => sum + (Number(w.qty) || 1), 0) !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {selectedTrade !== "roofing" && selectedTrade === "doors" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Doors — Add each size and type separately
                  </Label>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() =>
                      setDoorItems((prev) => [
                        ...prev,
                        {
                          id: `d${Date.now()}`,
                          width: "36",
                          height: "80",
                          type: "Entry",
                          qty: "1",
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Door
                  </Button>
                </div>
                <div className="space-y-2">
                  {doorItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-700 dark:bg-slate-800/50"
                    >
                      <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                      <div className="grid flex-1 grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Width (in)</Label>
                          <Input
                            placeholder="36"
                            value={item.width}
                            onChange={(e) =>
                              setDoorItems((prev) =>
                                prev.map((d) =>
                                  d.id === item.id ? { ...d, width: e.target.value } : d
                                )
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Height (in)</Label>
                          <Input
                            placeholder="80"
                            value={item.height}
                            onChange={(e) =>
                              setDoorItems((prev) =>
                                prev.map((d) =>
                                  d.id === item.id ? { ...d, height: e.target.value } : d
                                )
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Type</Label>
                          <Select
                            value={item.type}
                            onValueChange={(v) =>
                              setDoorItems((prev) =>
                                prev.map((d) => (d.id === item.id ? { ...d, type: v } : d))
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "Entry",
                                "Interior",
                                "Patio / Sliding Glass",
                                "French",
                                "Storm",
                                "Garage Entry",
                                "Barn",
                                "Pocket",
                                "Bifold",
                              ].map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Qty</Label>
                          <Input
                            placeholder="1"
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              setDoorItems((prev) =>
                                prev.map((d) =>
                                  d.id === item.id ? { ...d, qty: e.target.value } : d
                                )
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      {doorItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDoorItems((prev) => prev.filter((d) => d.id !== item.id))
                          }
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Total: {doorItems.reduce((sum, d) => sum + (Number(d.qty) || 1), 0)} door
                  {doorItems.reduce((sum, d) => sum + (Number(d.qty) || 1), 0) !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {selectedTrade !== "roofing" &&
              selectedTrade !== "windows" &&
              selectedTrade !== "doors" &&
              TRADE_MEASUREMENTS[selectedTrade] && (
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {TRADE_TYPES.find((t) => t.value === selectedTrade)?.label} Measurements
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {TRADE_MEASUREMENTS[selectedTrade].map((field) => (
                      <div key={field.id} className="space-y-1">
                        <Label htmlFor={`trade-${field.id}`} className="text-xs">
                          {field.label} {field.unit && `(${field.unit})`} {field.required && "*"}
                        </Label>
                        <Input
                          id={`trade-${field.id}`}
                          placeholder={field.placeholder}
                          value={tradeMeasurements[field.id] || ""}
                          onChange={(e) =>
                            setTradeMeasurements((prev) => ({
                              ...prev,
                              [field.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* AI Notice */}
            {selectedTrade !== "roofing" && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 dark:border-blue-900 dark:bg-blue-950/30">
                <Badge
                  variant="outline"
                  className="mt-0.5 shrink-0 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                >
                  AI
                </Badge>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  AI-powered estimation using GPT-4o — materials, quantities, and pricing are
                  estimated using industry standards for{" "}
                  <strong>{JOB_CONTEXTS.find((c) => c.value === jobContextType)?.label}</strong>{" "}
                  context. Verify with your supplier before ordering.
                </p>
              </div>
            )}

            {/* ── FINAL NOTES BOX (Simple) ── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Final Notes for AI
              </Label>
              <div className="overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50/50 to-white dark:border-purple-800 dark:from-purple-950/30 dark:to-slate-900">
                <Textarea
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Add any special instructions for the AI estimate...

Examples:
• Use premium materials only
• Include code upgrades for ice dam protection
• Homeowner prefers energy-efficient options
• Add 4 extra windows to the west side
• Include ice and water shield on all valleys"
                  className="min-h-[120px] resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                  rows={5}
                />
              </div>
              {aiChatInput.trim() && (
                <p className="text-[10px] text-purple-500 dark:text-purple-400">
                  ✓ Your notes will be included in the AI estimate
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleEstimate} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  "Calculating..."
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Materials
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Material List
            </CardTitle>
            <CardDescription>
              {result
                ? `${result.tradeLabel || TRADE_TYPES.find((t) => t.value === selectedTrade)?.label || selectedTrade} — ${result.materials.length} items`
                : "Enter measurements and click Calculate"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* PDF-capturable report area */}
                <div ref={reportRef} className="space-y-4 bg-white p-1 dark:bg-slate-900">
                  {/* Trade & Context badge row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                      {result.tradeLabel ||
                        TRADE_TYPES.find((t) => t.value === selectedTrade)?.label}
                    </Badge>
                    <Badge variant="outline">
                      {JOB_CONTEXTS.find((c) => c.value === jobContextType)?.label}
                    </Badge>
                    {result.method && (
                      <Badge
                        variant="outline"
                        className="border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                      >
                        {result.method}
                      </Badge>
                    )}
                    {wasteLabel && (
                      <Badge variant="outline" className="text-muted-foreground">
                        {wasteLabel} waste
                      </Badge>
                    )}
                  </div>

                  {/* Materials table */}
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="col-span-5">Product</span>
                      <span className="col-span-2 text-right">Qty</span>
                      <span className="col-span-2 text-right">Unit Price</span>
                      <span className="col-span-3 text-right">Total</span>
                    </div>
                    {result.materials.map((mat, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                        <div className="col-span-5">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {mat.productName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {mat.category}
                            {mat.coverage ? ` — ${mat.coverage}` : ""}
                          </p>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {mat.quantity}
                          </span>
                          <span className="ml-1 text-xs text-slate-500">{mat.unit}</span>
                        </div>
                        <div className="col-span-2 text-right text-sm text-slate-600 dark:text-slate-400">
                          ${mat.unitPrice.toLocaleString()}
                        </div>
                        <div className="col-span-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                          ${mat.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Cost */}
                  <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 dark:from-slate-800/60 dark:to-slate-800/40">
                    <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                      <DollarSign className="h-4 w-4" />
                      Estimated Total
                    </span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      ${result.totalCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* ── AI SUMMARY / ANALYSIS BOX ── */}
                {result.aiSummary && (
                  <div className="overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:border-blue-800 dark:from-blue-950/40 dark:to-indigo-950/30">
                    <button
                      onClick={() => setSummaryExpanded(!summaryExpanded)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            AI Analysis & Recommendations
                          </h3>
                          <p className="text-[11px] text-blue-600/70 dark:text-blue-400/60">
                            Powered by GPT-4o
                          </p>
                        </div>
                      </div>
                      {summaryExpanded ? (
                        <ChevronUp className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-blue-500" />
                      )}
                    </button>
                    {summaryExpanded && (
                      <div className="border-t border-blue-200/60 px-4 pb-4 pt-3 dark:border-blue-800/40">
                        <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
                          {result.aiSummary.split("\n").map((paragraph, i) =>
                            paragraph.trim() ? (
                              <p key={i} className="mb-2 text-[13px] leading-relaxed">
                                {paragraph}
                              </p>
                            ) : null
                          )}
                        </div>
                        {/* Scope reference if available */}
                        {scopeResult && scopeResult.totalApproved && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
                            <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs text-green-700 dark:text-green-300">
                              Insurance approved: ${scopeResult.totalApproved.toLocaleString()}
                              {scopeResult.totalApproved &&
                                result.totalCost > scopeResult.totalApproved && (
                                  <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">
                                    — Estimate exceeds approved amount by $
                                    {(
                                      result.totalCost - scopeResult.totalApproved
                                    ).toLocaleString()}{" "}
                                    (supplement opportunity)
                                  </span>
                                )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Button
                    onClick={handleTransferToCart}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button onClick={handleDownloadPDF} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    PDF Report
                  </Button>
                  <Button
                    onClick={handleRouteToABC}
                    disabled={routeStatus !== "idle"}
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                  >
                    {routeStatus === "routing" ? (
                      "Routing..."
                    ) : routeStatus === "routed" ? (
                      <>
                        <Truck className="mr-2 h-4 w-4" /> Routed
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        ABC Supply
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveEstimate}
                    variant={saveSuccess ? "default" : "outline"}
                    className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Bookmark className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="mb-3 h-12 w-12 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Material list will appear here after calculation
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ───────── SAVED ESTIMATES HOLDER ───────── */}
      {(savedEstimates.length > 0 || estimatesLoading) && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Bookmark className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Estimates</h2>
              <p className="text-sm text-slate-500">
                {estimatesLoading
                  ? "Loading saved estimates…"
                  : `${savedEstimates.length} estimate${savedEstimates.length !== 1 ? "s" : ""} — transfer to orders, request quotes, or email to partners`}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedEstimates.map((est) => (
              <div
                key={est.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-orange-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Header row */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{est.jobLabel}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {new Date(est.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* 3-dot action menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => handleTransferToOrder(est)}>
                        <Truck className="mr-2 h-4 w-4 text-orange-500" />
                        Transfer to ABC Supply
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRequestQuote(est)}>
                        <Send className="mr-2 h-4 w-4 text-blue-500" />
                        Request Vendor Quote
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEmailPartner(est)}>
                        <Mail className="mr-2 h-4 w-4 text-emerald-500" />
                        Email to Partner
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAttachToJobDocs(est)}>
                        <Link2 className="mr-2 h-4 w-4 text-purple-500" />
                        Attach to Job Docs
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteEstimate(est.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Estimate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Specs */}
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {est.totalArea.toLocaleString()} sq ft
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {est.pitch}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {est.materials.length} items
                  </span>
                </div>

                {/* Material summary (first 3 items) */}
                <div className="mb-3 space-y-1">
                  {est.materials.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate text-slate-600 dark:text-slate-400">
                        {m.productName}
                      </span>
                      <span className="ml-2 font-medium text-slate-900 dark:text-white">
                        {m.quantity} {m.unit}
                      </span>
                    </div>
                  ))}
                  {est.materials.length > 3 && (
                    <p className="text-xs text-slate-400">+{est.materials.length - 3} more items</p>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Estimated Total
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    ${est.totalCost.toLocaleString()}
                  </span>
                </div>

                {/* Bottom slide animation */}
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-orange-500 to-amber-500 transition-all group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
