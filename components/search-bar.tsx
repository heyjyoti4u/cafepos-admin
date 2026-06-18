"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for dishes..."
        className="pl-10 pr-10 bg-muted border-0 h-11 w-full rounded-xl focus-visible:ring-1 focus-visible:ring-orange-500"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-slate-200/50 p-1 rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}