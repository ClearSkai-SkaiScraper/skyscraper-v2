"use client";

import { CheckCircle, Eye, Globe, Languages, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  completeness: number;
}

export default function MultiLanguagePage() {
  const [languages] = useState<Language[]>([
    { code: "en", name: "English", nativeName: "English", enabled: true, completeness: 100 },
    { code: "es", name: "Spanish", nativeName: "Español", enabled: true, completeness: 95 },
    { code: "fr", name: "French", nativeName: "Français", enabled: false, completeness: 78 },
    { code: "de", name: "German", nativeName: "Deutsch", enabled: false, completeness: 65 },
    { code: "zh", name: "Chinese", nativeName: "中文", enabled: false, completeness: 0 },
    { code: "ja", name: "Japanese", nativeName: "日本語", enabled: false, completeness: 0 },
  ]);

  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [autoDetect, setAutoDetect] = useState(true);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
            Multi-Language Support
          </h1>
          <p className="text-gray-600">Configure language settings and translations</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-5 w-5" />
          Add Language
        </Button>
      </div>

      {/* Preview Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
        <div className="flex items-start gap-3">
          <Eye className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">Preview Mode</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Multi-language support is currently in preview. Translations and language
              configurations shown here are examples only.
            </p>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold dark:text-slate-100">
          <Globe className="h-6 w-6 text-blue-600" />
          Global Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Default Language</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="w-full max-w-xs rounded-lg border px-4 py-2"
              aria-label="Default Language"
            >
              {languages
                .filter((lang) => lang.enabled)
                .map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
            </select>
            <p className="mt-1 text-sm text-gray-600">
              This language will be used as the fallback for all users
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoDetect"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="autoDetect" className="text-sm font-medium">
              Automatically detect user language from browser settings
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="showSelector" defaultChecked className="h-4 w-4" />
            <label htmlFor="showSelector" className="text-sm font-medium">
              Show language selector in user interface
            </label>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Languages className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold dark:text-slate-100">
                {languages.filter((l) => l.enabled).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Active Languages</div>
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
                {Math.round(
                  languages.reduce((sum, lang) => sum + lang.completeness, 0) / languages.length
                )}
                %
              </div>
              <div className="text-sm text-gray-600">Avg Completeness</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{languages.length}</div>
              <div className="text-sm text-gray-600">Total Languages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Languages List */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">Available Languages</h2>
        </div>
        <div className="divide-y">
          {languages.map((language) => (
            <div key={language.code} className="p-6 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <span className="text-xl font-bold text-blue-600">
                        {language.code.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{language.name}</h3>
                        <span className="text-gray-600">({language.nativeName})</span>
                        {language.enabled && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Active
                          </span>
                        )}
                        {language.completeness === 100 && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-16">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-gray-600">Translation Progress</span>
                          <span className="font-medium">{language.completeness}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full ${
                              language.completeness === 100
                                ? "bg-green-500"
                                : language.completeness >= 80
                                  ? "bg-blue-500"
                                  : language.completeness >= 50
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                            }`}
                            style={{ width: `${language.completeness}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {language.enabled ? (
                          <Button variant="outline" size="sm">
                            Disable
                          </Button>
                        ) : (
                          <Button size="sm">Enable</Button>
                        )}
                        <Button variant="outline" size="sm">
                          Edit Translations
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Settings */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Regional Settings</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-medium">Date Format</label>
            <select className="w-full rounded-lg border px-4 py-2" aria-label="Date Format">
              <option>MM/DD/YYYY (US)</option>
              <option>DD/MM/YYYY (UK/Europe)</option>
              <option>YYYY-MM-DD (ISO)</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Time Format</label>
            <select className="w-full rounded-lg border px-4 py-2" aria-label="Time Format">
              <option>12-hour (AM/PM)</option>
              <option>24-hour</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Currency Symbol</label>
            <select className="w-full rounded-lg border px-4 py-2" aria-label="Currency Symbol">
              <option>$ (USD)</option>
              <option>€ (EUR)</option>
              <option>£ (GBP)</option>
              <option>¥ (JPY)</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Number Format</label>
            <select className="w-full rounded-lg border px-4 py-2" aria-label="Number Format">
              <option>1,234.56 (US/UK)</option>
              <option>1.234,56 (Europe)</option>
              <option>1 234,56 (France)</option>
            </select>
          </div>
        </div>
        <Button className="mt-6">Save Regional Settings</Button>
      </div>
    </div>
  );
}
