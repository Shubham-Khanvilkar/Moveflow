"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "../../hooks/useApi";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressDetails {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeArea?: string;
  country?: string;
  postalCode?: string;
}

interface AddressAutocompleteProps {
  value?: string;
  onSelect?: (address: AddressDetails) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  restrictToCountry?: string;
  types?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  error?: string;
  icon?: string;
}

export default function AddressAutocomplete({
  value = "",
  onSelect,
  onChange,
  placeholder = "Search address...",
  className = "",
  restrictToCountry = "in",
  types = "geocode",
  required = false,
  disabled = false,
  label,
  error,
  icon = "📍",
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      try {
        const data = await apiFetch(
          `/maps/autocomplete?input=${encodeURIComponent(input)}&country=${restrictToCountry}&types=${types}`
        );
        setPredictions(data?.predictions || []);
        setShowDropdown(true);
      } catch {
        setPredictions([]);
      }
      return;
    }

    try {
      const sessionToken = wrapperRef.current?.getAttribute("data-session-token") || "";
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&components=country:${restrictToCountry}&types=${types}&sessiontoken=${sessionToken}`;
      const res = await fetch(url);
      const data = await res.json();
      setPredictions(data.predictions || []);
      setShowDropdown(true);
    } catch {
      setPredictions([]);
    }
  }, [restrictToCountry, types]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);
    setHighlightIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = async (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setShowDropdown(false);
    setLoading(true);

    try {
      if (!GOOGLE_MAPS_API_KEY) {
        const data = await apiFetch(`/maps/place/${prediction.place_id}`);
        onSelect?.({
          placeId: prediction.place_id,
          formattedAddress: prediction.description,
          latitude: data?.latitude || 0,
          longitude: data?.longitude || 0,
          streetNumber: data?.streetNumber,
          route: data?.route,
          locality: data?.locality,
          administrativeArea: data?.administrativeArea,
          country: data?.country,
          postalCode: data?.postalCode,
        });
        return;
      }

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_API_KEY}&fields=formatted_address,geometry,address_components`;
      const res = await fetch(url);
      const data = await res.json();
      const result = data.result;

      const components: Record<string, string> = {};
      result.address_components?.forEach((c: any) => {
        c.types.forEach((t: string) => {
          components[t] = c.long_name;
        });
      });

      onSelect?.({
        placeId: prediction.place_id,
        formattedAddress: result.formatted_address || prediction.description,
        latitude: result.geometry?.location?.lat || 0,
        longitude: result.geometry?.location?.lng || 0,
        streetNumber: components["street_number"],
        route: components["route"],
        locality: components["locality"],
        administrativeArea: components["administrative_area_level_1"],
        country: components["country"],
        postalCode: components["postal_code"],
      });
    } catch {
      onSelect?.({
        placeId: prediction.place_id,
        formattedAddress: prediction.description,
        latitude: 0,
        longitude: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {icon} {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled || loading}
          required={required}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-400" : "border-gray-300"
          } ${disabled ? "bg-gray-50 text-gray-500" : ""}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && !disabled && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPredictions([]);
              onChange?.("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                index === highlightIndex ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-gray-400 mt-0.5">📍</span>
                <div>
                  <p className="font-medium text-gray-900">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </p>
                  {prediction.structured_formatting?.secondary_text && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {showDropdown && predictions.length === 0 && query.length >= 3 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No addresses found
        </div>
      )}
    </div>
  );
}

export type { AddressDetails };
