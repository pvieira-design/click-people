"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
};

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  maxHeight?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  disabled = false,
  className,
  maxHeight = "200px",
}: SearchableSelectProps) {
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.description?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  return (
    <div className={cn("w-full", className)}>
      {/* Search Input */}
      <div className="flex items-center border rounded-xl px-3 py-2 bg-background focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Options List */}
      <div
        className="mt-2 border rounded-xl overflow-hidden bg-popover"
        style={{ maxHeight }}
      >
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onValueChange(option.value);
                    setSearch("");
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                    value === option.value && "bg-accent text-accent-foreground",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    {value === option.value && (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                  <div className="flex flex-col items-start">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
