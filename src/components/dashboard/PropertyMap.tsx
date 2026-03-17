"use client";

import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { useEffect,useState } from "react";

import { logger } from "@/lib/logger";

interface MapProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
  type: string;
  dateOfLoss?: string;
  lifecycleStage?: string;
}

interface PropertyDetails {
  id: string;
  claimNumber?: string;
  lifecycleStage?: string;
  exposureCents?: number;
  dateOfLoss?: string;
}

export default function PropertyMap() {
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    async function fetchMapData() {
      try {
        const res = await fetch("/api/properties/map");
        if (!res.ok) throw new Error("Failed to load map data");
        const data = await res.json();
        setProperties(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchMapData();
  }, []);
  
  const handlePropertyClick = async (prop: MapProperty) => {
    setSelectedProperty(prop);
    setLoadingDetails(true);
    
    try {
      // Fetch additional details based on type
      const endpoint = prop.type === 'property' 
        ? `/api/properties/${prop.id}` 
        : `/api/leads/${prop.id}`;
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setPropertyDetails({
          id: data.id,
          claimNumber: data.claimNumber || data.claim?.claimNumber,
          lifecycleStage: data.lifecycleStage || data.status,
          exposureCents: data.exposureCents || data.estimatedValue,
          dateOfLoss: data.dateOfLoss,
        });
      }
    } catch (err) {
      logger.error("Failed to load property details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Determine if a property needs alert styling
  const getPropertyAlertStatus = (prop: MapProperty): 'critical' | 'warning' | 'normal' => {
    // Critical: DENIED status
    if (prop.lifecycleStage === 'DENIED' || prop.status === 'DENIED') {
      return 'critical';
    }
    
    // Warning: 30+ days old
    if (prop.dateOfLoss) {
      const daysSinceLoss = Math.floor(
        (Date.now() - new Date(prop.dateOfLoss).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLoss > 30) {
        return 'warning';
      }
    }
    
    return 'normal';
  };

  const getAlertStyling = (alertStatus: string): string => {
    switch (alertStatus) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-500';
      default:
        return 'border-[color:var(--border)] bg-[var(--surface-2)] hover:border-[color:var(--primary)]';
    }
  };

  const getAlertIcon = (alertStatus: string): string | null => {
    switch (alertStatus) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
          <span className="text-xl">🗺️</span> Property Map
        </h3>
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[color:var(--primary)]" />
        </div>
      </div>
    );
  }

  if (error || properties.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
          <span className="text-xl">🗺️</span> Property Map
        </h3>
        <div className="py-12 text-center text-[color:var(--muted)]">
          <p>{error ? `Error: ${error}` : "No properties or leads found yet."}</p>
          <p className="mt-2 text-sm">Add properties or leads to see them on the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
          <span className="text-xl">🗺️</span> Property & Lead Locations
        </h3>
        <span className="text-sm text-[color:var(--muted)]">
          {properties.length} {properties.length === 1 ? 'location' : 'locations'}
        </span>
      </div>
      <div className="grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 lg:grid-cols-3">
        {properties.map((prop) => {
          const alertStatus = getPropertyAlertStatus(prop);
          const alertIcon = getAlertIcon(alertStatus);
          
          return (
          <button
            key={prop.id}
            onClick={() => handlePropertyClick(prop)}
            className={`relative w-full cursor-pointer rounded-lg p-3 text-left transition ${getAlertStyling(alertStatus)} hover:bg-[var(--surface-3)]`}
          >
            {alertIcon && (
              <div className="absolute -right-2 -top-2 animate-pulse text-2xl">
                {alertIcon}
              </div>
            )}
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg">{prop.type === 'property' ? '🏠' : '📍'}</span>
              <span className="text-xs font-semibold uppercase text-[color:var(--muted)]">{prop.type}</span>
              <MapPin className="ml-auto h-4 w-4 text-[color:var(--primary)]" />
            </div>
            <div className="mb-1 text-sm font-semibold text-[color:var(--text)]">{prop.address}</div>
            <div className="text-xs text-[color:var(--muted)]">
              {prop.city}, {prop.state} {prop.zipCode}
            </div>
            {alertStatus === 'critical' && (
              <div className="mt-2">
                <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                  DENIED - Needs Attention
                </span>
              </div>
            )}
            {alertStatus === 'warning' && prop.dateOfLoss && (
              <div className="mt-2">
                <span className="rounded-full bg-yellow-600 px-2 py-1 text-xs font-semibold text-white">
                  30+ Days Old
                </span>
              </div>
            )}
            {prop.status && prop.status !== 'property' && alertStatus === 'normal' && (
              <div className="mt-2">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {prop.status}
                </span>
              </div>
            )}
          </button>
        );
        })}
      </div>
      
      {/* Property Details Modal */}
      {selectedProperty && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/50" 
            onClick={() => setSelectedProperty(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProperty(null)}>
            <div 
              className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 shadow-2xl backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-[color:var(--text)]">
                    <span>{selectedProperty.type === 'property' ? '🏠' : '📍'}</span>
                    {selectedProperty.type === 'property' ? 'Property' : 'Lead'} Details
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {selectedProperty.address}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="text-2xl leading-none text-[color:var(--muted)] hover:text-[color:var(--text)]"
                >
                  ×
                </button>
              </div>
              
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[color:var(--primary)]" />
                </div>
              ) : propertyDetails ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-[var(--surface-2)] p-4">
                    <p className="text-sm text-[color:var(--muted)]">Location</p>
                    <p className="font-semibold text-[color:var(--text)]">
                      {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zipCode}
                    </p>
                  </div>
                  
                  {propertyDetails.claimNumber && (
                    <div className="rounded-lg bg-[var(--surface-2)] p-4">
                      <p className="text-sm text-[color:var(--muted)]">Claim Number</p>
                      <p className="font-semibold text-[color:var(--text)]">{propertyDetails.claimNumber}</p>
                    </div>
                  )}
                  
                  {propertyDetails.lifecycleStage && (
                    <div className="rounded-lg bg-[var(--surface-2)] p-4">
                      <p className="text-sm text-[color:var(--muted)]">Status</p>
                      <span className="mt-1 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {propertyDetails.lifecycleStage}
                      </span>
                    </div>
                  )}
                  
                  {propertyDetails.exposureCents && (
                    <div className="rounded-lg bg-[var(--surface-2)] p-4">
                      <p className="text-sm text-[color:var(--muted)]">Exposure</p>
                      <p className="text-lg font-bold text-[color:var(--text)]">
                        ${(propertyDetails.exposureCents / 100).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-4">
                    <a
                      href={selectedProperty.type === 'property' ? `/properties/${selectedProperty.id}` : `/leads/${selectedProperty.id}`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:scale-[1.02]"
                    >
                      View Full Details <ExternalLink className="h-4 w-4" />
                    </a>
                    {propertyDetails.claimNumber && (
                      <a
                        href={`/claims/${propertyDetails.id}`}
                        className="flex-1 rounded-xl border-2 border-[color:var(--primary)] px-4 py-2 text-center font-semibold text-[color:var(--primary)] transition hover:bg-[var(--surface-2)]"
                      >
                        View Claim
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-[color:var(--muted)]">No additional details available</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
