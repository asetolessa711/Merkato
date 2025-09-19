import React from 'react';
import { useLocation, Link } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const SearchPage = () => {
  const q = useQuery().get('q') || '';
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 12 }}>Search</h1>
      <p style={{ color: '#555' }}>Query: <strong>{q}</strong></p>
      <p>
        This is a placeholder for the new search results page. Try <Link to="/shop">Shop</Link> while we wire this up.
      </p>
    </div>
  );
};

export default SearchPage;
