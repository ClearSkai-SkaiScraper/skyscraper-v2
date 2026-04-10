import { AIEngineRegistry } from "./AIEngineRegistry";
import { composeSections } from "./SectionRegistry";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const out = composeSections(["summary","photos","footer"] as any, { lat: 34.5, lng: -112.1 });
if (!Array.isArray(out) || !out.includes("map")) throw new Error("Composer failed to inject map.");
if (!AIEngineRegistry["ai.summary"].trigger({ reportType: "claims" })) throw new Error("AI trigger failed.");
