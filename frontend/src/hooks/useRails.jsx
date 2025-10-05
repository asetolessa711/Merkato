import { useEffect, useState, useCallback } from 'react';
import { resolveRails, recordImp, recordClk, recordAtc, recordItemClk, recordItemAtc, getRailTimeRangeMetrics } from '../utils/railsStore'';

/**
 * useRails
 * Parameters: { page, slot, days=7, includeDrafts=false, autoImpression=true }
 * Returns: { rails, loading, error, refresh, metricsFor(railId), record: { imp, clk, atc, itemClk, itemAtc } }
 */
export function useRails({ page='home', slot, days=7, includeDrafts=false, autoImpression=true }={}) {
  const [rails, setRails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true); setError(null);
    try {
      const resolved = resolveRails({ page, slot, includeDrafts });
      setRails(resolved);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [page, slot, includeDrafts]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if(!autoImpression) return;
    rails.forEach(r => { recordImp(r.id); });
  }, [rails, autoImpression]);

  const metricsFor = useCallback((railId) => getRailTimeRangeMetrics(railId, days), [days]);

  const record = {
    imp: recordImp,
    clk: recordClk,
    atc: recordAtc,
    itemClk: recordItemClk,
    itemAtc: recordItemAtc,
  };

  return { rails, loading, error, refresh, metricsFor, record };
}

export default useRails;
