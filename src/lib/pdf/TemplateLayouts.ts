import structure from "@/config/skai-structure.json";

export type TemplateLayout = {
  key: string;
  title: string;
  defaultSections: string[];
};

interface StructureConfig {
  reports: Record<string, { sections?: string[] }>;
}

const typedStructure = structure as unknown as StructureConfig;

const layouts: Record<string, TemplateLayout> = {
  proposal: {
    key: "proposal",
    title: "Contractor Proposal",
    defaultSections: typedStructure.reports.proposal?.sections ?? [],
  },
  claims: {
    key: "claims",
    title: "Insurance Claim Packet",
    defaultSections: typedStructure.reports.claims?.sections ?? [],
  },
  damage: {
    key: "damage",
    title: "AI Damage Export",
    defaultSections: typedStructure.reports.damage?.sections ?? [],
  },
  carrier: {
    key: "carrier",
    title: "Carrier Summary",
    defaultSections: typedStructure.reports.carrier?.sections ?? [],
  },
};

export default layouts;
