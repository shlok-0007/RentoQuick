import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, MapPin } from 'lucide-react';

/**
 * Reusable custom dropdown — shares the same styling, hover states and
 * animation logic as the category picker in CreateListingPage.
 *
 * Props:
 *  - value:       currently selected value (string)
 *  - onChange:    (value) => void
 *  - options:     array of strings OR array of { value, label, color? }
 *  - placeholder: text shown when no value
 *  - error:       boolean — renders red border when true
 *  - disabled:    boolean
 *  - searchable:  boolean — show a search filter input (default true)
 *  - icon:        optional lucide icon node rendered before the label
 *  - leadingDot:  boolean — render a colored dot for options that have a color
 *  - id:          optional id for the trigger button
 *  - ariaLabel:   optional aria-label
 */
export default function CustomDropdown({
    value,
    onChange,
    options = [],
    placeholder = 'Select an option',
    error = false,
    disabled = false,
    searchable = true,
    icon: Icon,
    leadingDot = false,
    id,
    ariaLabel,
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);
    const searchRef = useRef(null);

    // Normalize options to { value, label, color? }
    const normalized = options.map(o => {
        if (typeof o === 'string') return { value: o, label: o, color: null };
        return {
            value: o.value ?? o.name,
            label: o.label ?? o.name ?? o.value,
            color: o.color ?? null,
        };
    });

    const selected = normalized.find(o => o.value === value) || null;

    // Close on outside click
    useEffect(() => {
        if (disabled) return;
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [disabled]);

    // Focus search when opening
    useEffect(() => {
        if (open && searchable && searchRef.current) {
            searchRef.current.focus();
        }
        if (!open) setQuery('');
    }, [open, searchable]);

    // Keyboard support: Esc to close
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setOpen(false);
            setQuery('');
        }
        if ((e.key === 'Enter' || e.key === ' ') && !open && !disabled) {
            e.preventDefault();
            setOpen(true);
        }
    };

    const filtered = normalized.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (o) => {
        onChange(o.value);
        setOpen(false);
        setQuery('');
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                id={id}
                aria-label={ariaLabel || placeholder}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                onKeyDown={handleKeyDown}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium text-left ${error ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary-500/30'}`}
            >
                {Icon && <Icon className="w-4 h-4 text-surface-700 shrink-0" />}
                {selected ? (
                    <>
                        {leadingDot && selected.color && (
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
                        )}
                        <span className="flex-1 truncate text-surface-900">{selected.label}</span>
                    </>
                ) : (
                    <span className="flex-1 text-surface-700">{placeholder}</span>
                )}
                <ChevronDown className={`w-4 h-4 text-surface-700 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && !disabled && (
                <div
                    role="listbox"
                    className="absolute z-30 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-primary-500/10 overflow-hidden scale-in-center"
                >
                    {searchable && (
                        <div className="p-2 border-b border-primary-500/10">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-700" />
                                <input
                                    ref={searchRef}
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-8 pr-3 py-2 rounded-lg text-xs input-dark bg-white/80"
                                />
                            </div>
                        </div>
                    )}
                    <div className="max-h-56 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-surface-700 italic">
                                {query ? `No matches for "${query}"` : 'No options available'}
                            </p>
                        ) : filtered.map(o => {
                            const active = o.value === value;
                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onClick={() => handleSelect(o)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-primary-500/5 transition-colors ${active ? 'bg-primary-500/10 font-bold text-primary-600' : 'text-surface-800'}`}
                                >
                                    {leadingDot && o.color && (
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: o.color }} />
                                    )}
                                    <span className="flex-1 truncate">{o.label}</span>
                                    {active && <Check className="w-3.5 h-3.5 text-primary-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
