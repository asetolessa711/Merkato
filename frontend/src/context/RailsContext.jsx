import React from 'react';

// Provides rail attribution details to descendant components like ProductCard
// Shape: { railId, sku, page, slot, tactic, placement }
export const RailsContext = React.createContext(null);

export default RailsContext;
