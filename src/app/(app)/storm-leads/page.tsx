/**
 * Storm → Leads Pipeline — REDIRECT
 * 
 * This page has been consolidated into Weather Maps.
 * Redirecting users to /maps/weather-chains
 */
import { redirect } from "next/navigation";

export default function StormLeadsRedirect() {
  redirect("/maps/weather-chains");
}
