import React from 'react';

function CustomerGuide() {
  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>How to Use Merkato (Customer Guide)</h2>

      <ol>
        <li>
          <strong>Browse Products:</strong>  
          Go to <code>/</code> and explore all listings. Use filters for category, language, and price.
        </li>
        <li>
          <strong>Save Favorites:</strong>  
          Click the ♥ button to save products. View them later in your account.
        </li>
        <li>
          <strong>Switch Currency & Language:</strong>  
          Use the top-right selectors to shop in your preferred settings.
        </li>
        <li>
          <strong>Submit Feedback or Report Issues:</strong>  
          Use the floating ✉️ button to contact the Merkato team directly.
        </li>
        <li>
          <strong>Questions?</strong>  
          Visit <code>/support</code> and fill out the contact form.
        </li>
      </ol>
    </div>
  );
}

export default CustomerGuide;