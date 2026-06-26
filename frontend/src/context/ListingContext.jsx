import { createContext, useContext, useState, useCallback } from 'react';

const ListingContext = createContext(null);

/**
 * ListingContext provides global state for AI-generated listing fields
 * so they persist across the multi-step create-listing form.
 */
export function ListingProvider({ children }) {
  // AI-suggested data from the /api/ai/suggest endpoint
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Track whether AI generation has been triggered
  const [aiGenerated, setAiGenerated] = useState(false);

  // Store the suggested price separately for the Pricing page helper
  const [suggestedPrice, setSuggestedPrice] = useState(null);

  /**
   * Save AI suggestion data to global state.
   * Called after a successful /api/ai/suggest response.
   */
  const saveAiSuggestion = useCallback((data) => {
    setAiSuggestion(data);
    setSuggestedPrice(data.suggestedPrice ?? null);
    setAiGenerated(true);
  }, []);

  /**
   * Clear AI suggestion state (e.g. when starting a new listing).
   */
  const clearAiSuggestion = useCallback(() => {
    setAiSuggestion(null);
    setSuggestedPrice(null);
    setAiGenerated(false);
  }, []);

  const value = {
    aiSuggestion,
    aiGenerated,
    suggestedPrice,
    saveAiSuggestion,
    clearAiSuggestion,
  };

  return (
    <ListingContext.Provider value={value}>
      {children}
    </ListingContext.Provider>
  );
}

/**
 * Hook to access the Listing context.
 * Must be used within a ListingProvider.
 */
export function useListingContext() {
  const context = useContext(ListingContext);
  if (!context) {
    throw new Error('useListingContext must be used within a ListingProvider');
  }
  return context;
}

export default ListingContext;