"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Edit,
  Plus,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface Asset {
  id: string;
  name: string;
  type: "vehicle" | "tool" | "equipment";
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  status: "operational" | "maintenance" | "repair" | "retired";
  assignedTo?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  maintenanceCost: number;
}

export default function AssetTrackingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [assets] = useState<Asset[]>([
    {
      id: "1",
      name: "Ford F-150 Truck",
      type: "vehicle",
      serialNumber: "VIN1234567890",
      purchaseDate: "2022-01-15",
      purchasePrice: 45000,
      currentValue: 38000,
      status: "operational",
      assignedTo: "Mike's Crew",
      lastMaintenance: "2024-11-15",
      nextMaintenance: "2025-02-15",
      maintenanceCost: 2400,
    },
    {
      id: "2",
      name: "Air Compressor - DeWalt",
      type: "equipment",
      serialNumber: "DW-AC-9876",
      purchaseDate: "2023-06-20",
      purchasePrice: 1200,
      currentValue: 900,
      status: "maintenance",
      assignedTo: "Tom's Crew",
      lastMaintenance: "2024-10-01",
      nextMaintenance: "2025-01-01",
      maintenanceCost: 150,
    },
    {
      id: "3",
      name: "Pneumatic Nail Gun",
      type: "tool",
      serialNumber: "PNG-5544",
      purchaseDate: "2023-03-10",
      purchasePrice: 350,
      currentValue: 280,
      status: "operational",
      assignedTo: "Sarah's Crew",
      lastMaintenance: "2024-09-20",
      nextMaintenance: "2024-12-20",
      maintenanceCost: 45,
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | Asset["type"]>("all");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const getStatusBadge = (status: Asset["status"]) => {
    const styles = {
      operational: "bg-green-100 text-green-700",
      maintenance: "bg-yellow-100 text-yellow-700",
      repair: "bg-orange-100 text-orange-700",
      retired: "bg-gray-100 text-gray-700",
    };
    return styles[status];
  };

  const getTypeIcon = (type: Asset["type"]) => {
    switch (type) {
      case "vehicle":
        return <Truck className="h-5 w-5" />;
      case "equipment":
        return <Wrench className="h-5 w-5" />;
      case "tool":
        return <Wrench className="h-5 w-5" />;
    }
  };

  const filteredAssets =
    filterType === "all" ? assets : assets.filter((a) => a.type === filterType);

  const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalMaintenanceCost = assets.reduce((sum, asset) => sum + asset.maintenanceCost, 0);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
            Equipment & Asset Tracking
          </h1>
          <p className="text-gray-600">
            Manage tools, vehicles, and equipment with maintenance schedules
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-5 w-5" />
          Add Asset
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{assets.length}</div>
              <div className="text-sm text-gray-600">Total Assets</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {assets.filter((a) => a.status === "operational").length}
              </div>
              <div className="text-sm text-gray-600">Operational</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">${totalMaintenanceCost.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Maintenance YTD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-4 rounded-lg bg-white p-4 shadow">
        <button
          onClick={() => setFilterType("all")}
          className={`rounded-lg px-4 py-2 ${
            filterType === "all" ? "bg-sky-600 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          All Assets ({assets.length})
        </button>
        <button
          onClick={() => setFilterType("vehicle")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
            filterType === "vehicle" ? "bg-sky-600 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <Truck className="h-4 w-4" />
          Vehicles ({assets.filter((a) => a.type === "vehicle").length})
        </button>
        <button
          onClick={() => setFilterType("equipment")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
            filterType === "equipment" ? "bg-sky-600 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <Wrench className="h-4 w-4" />
          Equipment ({assets.filter((a) => a.type === "equipment").length})
        </button>
        <button
          onClick={() => setFilterType("tool")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
            filterType === "tool" ? "bg-sky-600 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <Wrench className="h-4 w-4" />
          Tools ({assets.filter((a) => a.type === "tool").length})
        </button>
      </div>

      {/* Assets List */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">Asset Inventory</h2>
        </div>
        <div className="divide-y">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="p-6 transition-colors hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      {getTypeIcon(asset.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{asset.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>SN: {asset.serialNumber}</span>
                        <span>•</span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${getStatusBadge(asset.status)}`}
                        >
                          {asset.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="mb-1 text-gray-600">Current Value</div>
                      <div className="font-semibold text-green-600">
                        ${asset.currentValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-gray-600">Assigned To</div>
                      <div className="font-semibold">{asset.assignedTo || "Unassigned"}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-gray-600">Last Maintenance</div>
                      <div className="font-semibold">
                        {asset.lastMaintenance
                          ? new Date(asset.lastMaintenance).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-gray-600">Next Maintenance</div>
                      <div className="font-semibold text-orange-600">
                        {asset.nextMaintenance
                          ? new Date(asset.nextMaintenance).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-gray-600">Maintenance Cost</div>
                      <div className="font-semibold">${asset.maintenanceCost.toLocaleString()}</div>
                    </div>
                  </div>

                  {asset.nextMaintenance &&
                    new Date(asset.nextMaintenance) <
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        Maintenance due within 30 days
                      </div>
                    )}
                </div>

                <div className="ml-4 flex gap-2">
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="Edit">
                    <Edit className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="Delete">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8">
            <h2 className="mb-6 text-2xl font-bold">Add New Asset</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Asset Name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border px-4 py-2"
                    placeholder="Ford F-150"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Type</label>
                  <select className="w-full rounded-lg border px-4 py-2" aria-label="Asset type">
                    <option value="vehicle">Vehicle</option>
                    <option value="equipment">Equipment</option>
                    <option value="tool">Tool</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Serial Number / VIN</label>
                <input
                  type="text"
                  className="w-full rounded-lg border px-4 py-2"
                  placeholder="1234567890"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Purchase Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border px-4 py-2"
                    aria-label="Purchase date"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Purchase Price</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border px-4 py-2"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Assign To</label>
                <select className="w-full rounded-lg border px-4 py-2" aria-label="Assign asset to">
                  <option>Unassigned</option>
                  <option>Mike&apos;s Crew</option>
                  <option>Tom&apos;s Crew</option>
                  <option>Sarah&apos;s Crew</option>
                </select>
              </div>
              <div className="mt-6 flex gap-3">
                <Button className="flex-1">Add Asset</Button>
                <Button onClick={() => setShowAddModal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
