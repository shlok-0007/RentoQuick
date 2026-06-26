import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

export default function LocationAutocomplete({ onSelect, initialValue = '' }) {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);
    const abortRef = useRef(null);

    // Debounce the raw query so API calls only fire after user stops typing
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Fetch locations whenever the debounced query changes ─────────
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Cancel previous request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        (async () => {
            try {
                const response = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(debouncedQuery)}&limit=5`,
                    { signal: controller.signal }
                );
                const data = await response.json();
                
                const formattedSuggestions = data.features.map(feature => {
                    const props = feature.properties;
                    
                    let city = props.city || '';
                    let state = props.state || '';
                    let country = props.country || '';
                    let postcode = props.postcode || '';
                    let address = props.formatted || props.name || '';
                    
                    if (!city && props.name) {
                        city = props.name;
                    }
                    
                    if (!state && props.county) {
                        state = props.county;
                    }
                    
                    const description = props.name 
                        ? `${props.name}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`
                        : props.formatted || `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}`;
                    
                    return {
                        place_id: props.osm_id,
                        description: description,
                        city: city,
                        state: state,
                        country: country,
                        address: address,
                        postcode: postcode,
                        lat: feature.geometry.coordinates[1],
                        lon: feature.geometry.coordinates[0],
                        raw: feature
                    };
                });

                setSuggestions(formattedSuggestions);
                setShowSuggestions(true);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching locations:', error);
                    setSuggestions([]);
                }
            } finally {
                if (abortRef.current === controller) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            if (abortRef.current === controller) {
                controller.abort();
            }
        };
    }, [debouncedQuery]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        // Debouncing is handled by the useDebounce hook + useEffect above
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion.description);
        setShowSuggestions(false);
        setSuggestions([]);
        
        // Extract additional location data from the raw feature if needed
        const props = suggestion.raw?.properties || {};
        
        // Try to get more detailed location information
        let city = suggestion.city;
        let state = suggestion.state;
        let pincode = suggestion.postcode;
        let address = suggestion.address;
        
        // If city is still empty, try to get it from other fields
        if (!city && props.name) {
            city = props.name;
        }
        
        // If state is still empty, try to get it from other fields
        if (!state) {
            state = props.state || props.county || props.region || '';
        }
        
        // If pincode is not available, try to extract from context or formatted address
        if (!pincode && props.formatted) {
            const pincodeMatch = props.formatted.match(/\b\d{6}\b/);
            if (pincodeMatch) {
                pincode = pincodeMatch[0];
            }
        }
        
        // Build comprehensive address
        if (!address || address === city) {
            address = props.formatted || `${city}${state ? ', ' + state : ''}${props.country ? ', ' + props.country : ''}`;
        }
        
        onSelect({
            city: city || '',
            state: state || '',
            address: address || '',
            pincode: pincode || '',
            lat: suggestion.lat,
            lon: suggestion.lon
        });
    };

    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        onSelect({
            city: '',
            state: '',
            address: '',
            pincode: ''
        });
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 w-4 h-4" />
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => query.length >= 3 && setShowSuggestions(true)}
                    placeholder="Search for your location..."
                    className="w-full pl-10 pr-10 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium"
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-700 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                {loading && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-primary-500/10 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.place_id || index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-primary-500/5 transition-colors border-b border-primary-500/5 last:border-b-0"
                        >
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-surface-950">{suggestion.description}</p>
                                    {suggestion.city && suggestion.state && (
                                        <p className="text-xs text-surface-700 mt-0.5">
                                            {suggestion.city}, {suggestion.state}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showSuggestions && suggestions.length === 0 && !loading && query.length >= 3 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-primary-500/10 p-4">
                    <p className="text-sm text-surface-700 text-center">No locations found</p>
                </div>
            )}
        </div>
    );
}
