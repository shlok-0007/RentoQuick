import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDebounce — returns a debounced version of a value.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 300);
 *   // debouncedQuery updates 300ms after searchQuery stops changing
 *
 * @param {*} value       — The value to debounce (string, number, object, etc.)
 * @param {number} delay  — Delay in milliseconds (default 300ms)
 * @returns {*}           — The debounced value
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * useDebouncedCallback — returns a debounced callback function.
 *
 * Usage:
 *   const debouncedSearch = useDebouncedCallback((query) => {
 *       fetchResults(query);
 *   }, 300);
 *
 *   <input onChange={(e) => debouncedSearch(e.target.value)} />
 *
 * @param {Function} callback  — The function to debounce
 * @param {number}   delay     — Delay in milliseconds (default 300ms)
 * @returns {Function}         — The debounced function (stable reference)
 */
export function useDebouncedCallback(callback, delay = 300) {
    const timerRef = useRef(null);
    const callbackRef = useRef(callback);

    // Keep the callback ref in sync (avoids stale closures)
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const debouncedFn = useCallback((...args) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);

    // Allow manual flush (e.g. on unmount or form submit)
    debouncedFn.cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    return debouncedFn;
}