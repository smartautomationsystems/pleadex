import React, { useState, useRef, useEffect } from 'react';

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressAutocompleteProps {
  value: Address;
  onChange: (address: Address) => void;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmNvbG9tYmFuYSIsImEiOiJjbWFneGMzMXMwNWFiMmpzZzFnM2JrdjEyIn0.mHDt6susT6nWR9Dco7CSmQ';

export type { Address };
export default function AddressAutocomplete({ value, onChange }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value.street);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value.street);
  }, [value.street]);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=US&types=address&limit=5`;
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Optionally log other errors
        }
      }
    };
    fetchSuggestions();
    return () => {
      if (!controller.signal.aborted) {
        try {
          controller.abort();
        } catch {}
      }
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(feature: any) {
    // Parse address components
    let street = feature.text || '';
    let city = '';
    let state = '';
    let zip = '';
    for (const c of feature.context || []) {
      if (c.id.startsWith('place')) city = c.text;
      if (c.id.startsWith('region')) state = c.short_code ? c.short_code.replace('US-', '') : c.text;
      if (c.id.startsWith('postcode')) zip = c.text;
    }
    // Sometimes the address number is in address property
    if (feature.address) street = feature.address + ' ' + street;
    onChange({ street, city, state, zip });
    setQuery(street);
    setShowDropdown(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        className="w-full p-2 border rounded"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onChange({ ...value, street: e.target.value });
          setShowDropdown(true);
        }}
        placeholder="123 Main St"
        autoComplete="off"
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-10 bg-white border rounded shadow w-full mt-1 max-h-60 overflow-auto">
          {suggestions.map((feature) => (
            <div
              key={feature.id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(feature)}
            >
              {feature.place_name}
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <input
          type="text"
          className="p-2 border rounded"
          value={value.city}
          onChange={e => onChange({ ...value, city: e.target.value })}
          placeholder="City"
        />
        <input
          type="text"
          className="p-2 border rounded"
          value={value.state}
          onChange={e => onChange({ ...value, state: e.target.value })}
          placeholder="State"
        />
        <input
          type="text"
          className="p-2 border rounded"
          value={value.zip}
          onChange={e => onChange({ ...value, zip: e.target.value })}
          placeholder="ZIP"
        />
      </div>
    </div>
  );
} 