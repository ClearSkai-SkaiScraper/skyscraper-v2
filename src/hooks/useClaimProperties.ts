"use client";
import { useEffect, useState } from 'react';
interface ClaimProp { id: string; claimNumber: string; property?: string; }
export default function useClaimProperties(){
  const [claims,setClaims]=useState<ClaimProp[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useEffect(()=>{ void (async()=>{ try { const res = await fetch('/api/claims'); const data = await res.json(); const list = (data?.claims||[]).map((c:any)=>({ id:c.id, claimNumber:c.claimNumber, property: c?.properties?.street || c?.properties?.address || '' })); setClaims(list); } catch {} })(); },[]);
  return claims;
}
