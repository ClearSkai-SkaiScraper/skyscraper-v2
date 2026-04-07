"use client";

import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

interface Vendor {
  id: string;
  name: string;
  apiUrl: string;
  site: string;
  logoUrl: string;
  autoSync: boolean;
  updatedAt?: number;
}

export default function VendorConnect() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    apiUrl: "",
    site: "",
    autoSync: false,
    logoUrl: "",
  });

  async function loadVendors() {
    try {
      const snap = await getDocs(collection(db, "vendors"));
      const vendorList = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vendor);
      setVendors(vendorList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      logger.error("Error loading vendors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveVendor() {
    if (!form.id.trim()) {
      alert("Please enter a vendor ID");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "vendors", form.id),
        {
          name: form.name || form.id,
          apiUrl: form.apiUrl || "",
          site: form.site || "",
          logoUrl: form.logoUrl || "",
          autoSync: !!form.autoSync,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      alert("Vendor saved successfully!");
      setForm({
        id: "",
        name: "",
        apiUrl: "",
        site: "",
        autoSync: false,
        logoUrl: "",
      });
      await loadVendors();
    } catch (error) {
      logger.error("Error saving vendor:", error);
      alert("Failed to save vendor");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVendor(vendorId: string) {
    if (!confirm(`Delete vendor "${vendorId}"? This will also remove all their products.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "vendors", vendorId));
      alert("Vendor deleted successfully!");
      await loadVendors();
    } catch (error) {
      logger.error("Error deleting vendor:", error);
      alert("Failed to delete vendor");
    }
  }

  function editVendor(vendor: Vendor) {
    setForm({
      id: vendor.id,
      name: vendor.name,
      apiUrl: vendor.apiUrl,
      site: vendor.site,
      logoUrl: vendor.logoUrl,
      autoSync: vendor.autoSync,
    });
  }

  function resetForm() {
    setForm({
      id: "",
      name: "",
      apiUrl: "",
      site: "",
      autoSync: false,
      logoUrl: "",
    });
  }

  useEffect(() => {
    void loadVendors();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#147BFF] border-t-transparent"></div>
          <p className="text-neutral-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="mb-4 text-4xl font-bold text-[#081A2F]">Vendor Connect</h1>
          <p className="text-xl text-neutral-600">
            Manage vendor API endpoints and configure automatic catalog synchronization
          </p>
        </motion.div>

        <div className="grid gap-8 xl:grid-cols-5">
          {/* Vendor Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-2"
          >
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  {form.id ? "Edit Vendor" : "Add New Vendor"}
                </h2>
                {form.id && (
                  <button
                    onClick={resetForm}
                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-800"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Vendor ID *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., owens-corning"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                    value={form.id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Owens Corning"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    API Endpoint URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.vendor.com/catalog"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                    value={form.apiUrl}
                    onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://vendor.com"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                    value={form.site}
                    onChange={(e) => setForm({ ...form, site: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://vendor.com/logo.png"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.autoSync}
                      onChange={(e) => setForm({ ...form, autoSync: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300 text-[#147BFF] focus:ring-[#147BFF]"
                    />
                    <div>
                      <span className="text-sm font-medium text-neutral-900">
                        Auto-Sync Nightly
                      </span>
                      <p className="text-xs text-neutral-600">
                        Automatically fetch catalog updates every night at 6 AM UTC
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  onClick={saveVendor}
                  disabled={saving || !form.id.trim()}
                  className="w-full rounded-lg bg-[#147BFF] px-4 py-3 font-medium text-white transition-colors hover:bg-[#1260D4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : form.id ? "Update Vendor" : "Add Vendor"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Vendors List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-3"
          >
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Registered Vendors ({vendors.length})
                </h2>
                <button
                  onClick={loadVendors}
                  className="text-sm text-[#147BFF] transition-colors hover:text-[#1260D4]"
                >
                  Refresh
                </button>
              </div>

              {vendors.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-100">
                    <svg
                      className="h-8 w-8 text-neutral-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <p className="text-neutral-600">No vendors registered yet</p>
                </div>
              ) : (
                <div className="max-h-96 space-y-4 overflow-y-auto">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-300"
                    >
                      <div className="flex items-start gap-4">
                        {vendor.logoUrl ? (
                          <img
                            src={vendor.logoUrl}
                            alt={`${vendor.name} logo`}
                            className="h-12 w-12 rounded-lg bg-neutral-50 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
                            <span className="text-sm font-medium text-neutral-600">
                              {vendor.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-neutral-900">{vendor.name}</h3>
                              <p className="mb-2 text-sm text-neutral-600">ID: {vendor.id}</p>

                              <div className="space-y-1 text-xs text-neutral-500">
                                {vendor.apiUrl && (
                                  <div className="flex items-center gap-1">
                                    <span>API:</span>
                                    <span className="max-w-xs truncate rounded bg-neutral-100 px-1 font-mono">
                                      {vendor.apiUrl}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-3">
                                  <span
                                    className={`inline-flex items-center gap-1 ${
                                      vendor.autoSync ? "text-green-600" : "text-neutral-500"
                                    }`}
                                  >
                                    <div
                                      className={`h-2 w-2 rounded-full ${
                                        vendor.autoSync ? "bg-green-500" : "bg-neutral-400"
                                      }`}
                                    ></div>
                                    Auto-Sync: {vendor.autoSync ? "Enabled" : "Disabled"}
                                  </span>

                                  {vendor.updatedAt && (
                                    <span>
                                      Updated: {new Date(vendor.updatedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="ml-4 flex items-center gap-2">
                              {vendor.site && (
                                <a
                                  href={vendor.site}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#147BFF] transition-colors hover:text-[#1260D4]"
                                >
                                  Visit Site
                                </a>
                              )}

                              <button
                                onClick={() => editVendor(vendor)}
                                className="text-xs text-neutral-600 transition-colors hover:text-neutral-800"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => deleteVendor(vendor.id)}
                                className="text-xs text-red-600 transition-colors hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6"
        >
          <h3 className="mb-3 text-lg font-semibold text-blue-900">How Vendor Connect Works</h3>
          <div className="grid gap-4 text-sm text-blue-800 md:grid-cols-3">
            <div>
              <div className="mb-1 font-medium">1. Register Vendors</div>
              <p>Add vendor API endpoints and configure auto-sync settings</p>
            </div>
            <div>
              <div className="mb-1 font-medium">2. Nightly Sync</div>
              <p>Enabled vendors automatically sync their catalogs every night at 6 AM UTC</p>
            </div>
            <div>
              <div className="mb-1 font-medium">3. Browse Products</div>
              <p>Updated catalogs appear in the Trades Network for easy browsing and selection</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
