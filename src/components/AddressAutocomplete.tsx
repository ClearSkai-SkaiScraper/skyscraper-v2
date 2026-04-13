"use client";

/**
 * AddressAutocomplete (F4 Enhancement)
 *
 * Google Places-style address autocomplete input.
 * Uses a debounced search against a geocoding API.
 *
 * For production, integrate with:
 * - Google Places API (recommended)
 * - Mapbox Geocoding
 * - HERE Geocoding
 *
 * This implementation uses a mock for demo purposes
 * and can be swapped with real API calls.
 */

import { Loader2, MapPin, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface AddressSuggestion {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  fullAddress: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Mock suggestions for demo - replace with real API call
const MOCK_SUGGESTIONS: AddressSuggestion[] = [
  {
    id: "1",
    address: "123 Main Street",
    city: "Phoenix",
    state: "AZ",
    zip: "85001",
    fullAddress: "123 Main Street, Phoenix, AZ 85001",
  },
  {
    id: "2",
    address: "456 Oak Avenue",
    city: "Scottsdale",
    state: "AZ",
    zip: "85251",
    fullAddress: "456 Oak Avenue, Scottsdale, AZ 85251",
  },
  {
    id: "3",
    address: "789 Elm Drive",
    city: "Mesa",
    state: "AZ",
    zip: "85201",
    fullAddress: "789 Elm Drive, Mesa, AZ 85201",
  },
  {
    id: "4",
    address: "321 Pine Road",
    city: "Tempe",
    state: "AZ",
    zip: "85281",
    fullAddress: "321 Pine Road, Tempe, AZ 85281",
  },
  {
    id: "5",
    address: "654 Cedar Lane",
    city: "Gilbert",
    state: "AZ",
    zip: "85233",
    fullAddress: "654 Cedar Lane, Gilbert, AZ 85233",
  },
];

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter address...",
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      // Mock API call - replace with real geocoding API
      // Example: Google Places Autocomplete, Mapbox, etc.
      const filtered = MOCK_SUGGESTIONS.filter((s) =>
        s.fullAddress.toLowerCase().includes(value.toLowerCase())
      );

      // If no exact matches, return suggestions that start with similar characters
      if (filtered.length === 0 && value.length >= 3) {
        const fuzzyFiltered = MOCK_SUGGESTIONS.filter(
          (s) =>
            s.address.toLowerCase().startsWith(value.slice(0, 3).toLowerCase()) ||
            s.city.toLowerCase().startsWith(value.toLowerCase())
        );
        setSuggestions(fuzzyFiltered.slice(0, 5));
      } else {
        setSuggestions(filtered.slice(0, 5));
      }

      setIsLoading(false);
      setIsOpen(true);
      setHighlightedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      onChange(suggestion.fullAddress);
      onSelect?.(suggestion);
      setIsOpen(false);
      setSuggestions([]);
    },
    [onChange, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelect(suggestions[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          break;
      }
    },
    [isOpen, suggestions, highlightedIndex, handleSelect]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm",
            "placeholder:text-muted-foreground",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            "dark:border-slate-700 dark:bg-slate-800",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          autoComplete="off"
        />
        {value && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                    index === highlightedIndex
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 truncate">
                    <p className="font-medium">{suggestion.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.city}, {suggestion.state} {suggestion.zip}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-700">
            <p className="text-[10px] text-muted-foreground">
              Type at least 3 characters to search
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
