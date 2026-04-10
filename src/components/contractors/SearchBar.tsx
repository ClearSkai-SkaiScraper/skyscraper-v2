"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  onSearch: (query: { zip?: string; trade?: string }) => void;
  initialZip?: string;
  initialTrade?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SearchBar({ onSearch, initialZip = "", initialTrade = "" }: SearchBarProps) {
  const [zip, setZip] = useState(initialZip);

  function handleSearch() {
    onSearch({ zip: zip || undefined });
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Enter ZIP code (e.g., 86301)"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1"
      />
      <Button onClick={handleSearch} className="bg-sky-600 hover:bg-sky-700">
        Search
      </Button>
    </div>
  );
}
