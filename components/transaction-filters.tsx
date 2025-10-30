"use client";

import { useState, useEffect } from "react";
import { TransactionFilters as FilterType, SavedFilter } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Search,
  Filter,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/types";

interface TransactionFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  availableCategories?: string[];
  showTypeFilter?: boolean;
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  availableCategories = DEFAULT_CATEGORIES as string[],
  showTypeFilter = true,
}: TransactionFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [selectedSavedFilter, setSelectedSavedFilter] = useState<string>("");

  const savedFilters = useLiveQuery(() =>
    db.savedFilters.orderBy("lastUsed").reverse().toArray()
  );

  const updateFilter = (key: keyof FilterType, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setSelectedSavedFilter("");
  };

  const saveCurrentFilter = async () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: filterName,
      filters: filters,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    await db.savedFilters.add(newFilter);
    setFilterName("");
    setShowSaveDialog(false);
  };

  const loadSavedFilter = async (filterId: string) => {
    const filter = await db.savedFilters.get(filterId);
    if (filter) {
      onFiltersChange(filter.filters);
      setSelectedSavedFilter(filterId);
      // Update last used
      await db.savedFilters.update(filterId, { lastUsed: new Date() });
    }
  };

  const deleteSavedFilter = async (filterId: string) => {
    await db.savedFilters.delete(filterId);
    if (selectedSavedFilter === filterId) {
      setSelectedSavedFilter("");
    }
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof FilterType] !== undefined
  );

  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof FilterType] !== undefined
  ).length;

  // Generate month and year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <Card className="p-4 space-y-4">
      {/* Saved Filters */}
      {savedFilters && savedFilters.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Saved Filters</label>
          <div className="flex gap-2">
            <Select
              value={selectedSavedFilter}
              onValueChange={loadSavedFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Load a saved filter..." />
              </SelectTrigger>
              <SelectContent>
                {savedFilters.map((filter) => (
                  <SelectItem key={filter.id} value={filter.id}>
                    {filter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSavedFilter && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => deleteSavedFilter(selectedSavedFilter)}
                title="Delete saved filter"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={filters.searchTerm || ""}
            onChange={(e) => updateFilter("searchTerm", e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={
              filters.categories && filters.categories.length > 0
                ? filters.categories[0]
                : "all"
            }
            onValueChange={(value) =>
              updateFilter("categories", value === "all" ? undefined : [value])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type Filter */}
        {showTypeFilter && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={filters.type || "all"}
              onValueChange={(value) =>
                updateFilter("type", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Month Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Month</label>
          <Select
            value={filters.month?.toString() || "all"}
            onValueChange={(value) =>
              updateFilter("month", value === "all" ? undefined : parseInt(value))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(!showSaveDialog)}
            disabled={!hasActiveFilters}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Filter
          </Button>
        </div>
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="space-y-2 p-3 bg-muted rounded-lg">
          <label className="text-sm font-medium">Filter Name</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter filter name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveCurrentFilter();
              }}
            />
            <Button onClick={saveCurrentFilter} disabled={!filterName.trim()}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={
                  filters.dateFrom
                    ? new Date(filters.dateFrom).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  updateFilter(
                    "dateFrom",
                    e.target.value ? new Date(e.target.value) : undefined
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={
                  filters.dateTo
                    ? new Date(filters.dateTo).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  updateFilter(
                    "dateTo",
                    e.target.value ? new Date(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={filters.amountMin || ""}
                onChange={(e) =>
                  updateFilter(
                    "amountMin",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={filters.amountMax || ""}
                onChange={(e) =>
                  updateFilter(
                    "amountMax",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>

          {/* Year Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <Select
              value={filters.year?.toString() || "all"}
              onValueChange={(value) =>
                updateFilter("year", value === "all" ? undefined : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {filters.searchTerm && (
            <Badge variant="secondary">
              Search: {filters.searchTerm}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("searchTerm", undefined)}
              />
            </Badge>
          )}
          {filters.categories && filters.categories.length > 0 && (
            <Badge variant="secondary">
              Category: {filters.categories[0]}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("categories", undefined)}
              />
            </Badge>
          )}
          {filters.type && filters.type !== "all" && (
            <Badge variant="secondary">
              Type: {filters.type}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("type", undefined)}
              />
            </Badge>
          )}
          {filters.month && (
            <Badge variant="secondary">
              Month: {months.find((m) => m.value === filters.month)?.label}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("month", undefined)}
              />
            </Badge>
          )}
          {filters.year && (
            <Badge variant="secondary">
              Year: {filters.year}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("year", undefined)}
              />
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary">
              From: {new Date(filters.dateFrom).toLocaleDateString()}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("dateFrom", undefined)}
              />
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary">
              To: {new Date(filters.dateTo).toLocaleDateString()}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("dateTo", undefined)}
              />
            </Badge>
          )}
          {filters.amountMin !== undefined && (
            <Badge variant="secondary">
              Min: €{filters.amountMin}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("amountMin", undefined)}
              />
            </Badge>
          )}
          {filters.amountMax !== undefined && (
            <Badge variant="secondary">
              Max: €{filters.amountMax}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter("amountMax", undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}
