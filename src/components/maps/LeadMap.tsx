"use client";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

export default function LeadMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // eslint-disable-next-line no-restricted-syntax
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 14,
    });
    const mk = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
    return () => {
      mk.remove();
      map.remove();
    };
  }, [lat, lng]);
  return <div ref={ref} className="h-64 w-full rounded-xl border" />;
}
