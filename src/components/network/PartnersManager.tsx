// components/network/PartnersManager.tsx
"use client";

import { useEffect,useState } from "react";

import { logger } from "@/lib/logger";

interface Partner {
  id: string;
  name: string;
  trade: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const COMMON_TRADES = [
  "Roofing",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Flooring",
  "Painting",
  "Drywall",
  "Framing",
  "Masonry",
  "Landscaping",
  "Other",
];

export function PartnersManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    trade: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    void fetchPartners();
  }, []);

  useEffect(() => {
    filterPartners();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners, searchQuery, tradeFilter]);

  async function fetchPartners() {
    try {
      const res = await fetch("/api/partners");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPartners(data);
    } catch (error) {
      logger.error("Failed to load partners:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterPartners() {
    let filtered = partners;

    if (tradeFilter) {
      filtered = filtered.filter((p) => p.trade === tradeFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.trade.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.phone?.includes(q)
      );
    }

    setFilteredPartners(filtered);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/partners/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        // Create
        const res = await fetch("/api/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create");
      }

      // Reset and reload
      setFormData({
        name: "",
        trade: "",
        email: "",
        phone: "",
        website: "",
        address: "",
        notes: "",
      });
      setShowForm(false);
      setEditingId(null);
      void fetchPartners();
    } catch (error: any) {
      alert(error.message || "Operation failed");
    }
  }

  function handleEdit(partner: Partner) {
    setFormData({
      name: partner.name,
      trade: partner.trade,
      email: partner.email || "",
      phone: partner.phone || "",
      website: partner.website || "",
      address: partner.address || "",
      notes: partner.notes || "",
    });
    setEditingId(partner.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this partner?")) return;

    try {
      const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      void fetchPartners();
    } catch (error: any) {
      alert(error.message || "Delete failed");
    }
  }

  function cancelForm() {
    setFormData({
      name: "",
      trade: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      notes: "",
    });
    setShowForm(false);
    setEditingId(null);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading partners...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search partners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm"
        />
        <select
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All Trades</option>
          {COMMON_TRADES.map((trade) => (
            <option key={trade} value={trade}>
              {trade}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          + Add Partner
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="rounded-lg border bg-white p-4 shadow-md">
          <h2 className="mb-3 text-sm font-semibold">
            {editingId ? "Edit Partner" : "Add New Partner"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Trade *</label>
              <select
                required
                value={formData.trade}
                onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              >
                <option value="">Select trade</option>
                {COMMON_TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
                rows={2}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelForm}
                className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Partners List */}
      {filteredPartners.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {searchQuery || tradeFilter ? "No partners match your filters" : "No partners yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPartners.map((partner) => (
            <div key={partner.id} className="rounded-lg border bg-white p-4 transition hover:shadow-md">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{partner.name}</h3>
                  <span className="text-xs text-gray-500">{partner.trade}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(partner)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-xs text-gray-300">|</span>
                  <button
                    onClick={() => handleDelete(partner.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {partner.email && (
                <p className="mb-1 text-xs text-gray-600">✉️ {partner.email}</p>
              )}
              {partner.phone && (
                <p className="mb-1 text-xs text-gray-600">📞 {partner.phone}</p>
              )}
              {partner.website && (
                <p className="mb-1 text-xs text-blue-600">
                  <a href={partner.website} target="_blank" rel="noreferrer">
                    🌐 Website
                  </a>
                </p>
              )}
              {partner.address && (
                <p className="mb-1 text-xs text-gray-600">📍 {partner.address}</p>
              )}
              {partner.notes && (
                <p className="mt-2 text-xs italic text-gray-500">{partner.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
