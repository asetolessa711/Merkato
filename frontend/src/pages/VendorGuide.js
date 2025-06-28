import React from 'react';
import MerkatoFooter from '../components/MerkatoFooter';

function VendorGuide() {
  return (
    <div style={{ 
      padding: 20, 
      maxWidth: 800, 
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Poppins, sans-serif'
    }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ color: '#00B894', marginBottom: '1.5rem' }}>📚 Vendor Onboarding Guide</h2>

        <ol style={{ lineHeight: 1.6 }}>
          <li>
            <strong>Register as a Vendor:</strong>  
            <p>Go to <code>/register?role=vendor</code> and create your account.</p>
          </li>
          
          <li>
            <strong>Onboarding Checklist:</strong>  
            <p>After login, follow steps at <code>/vendor/onboarding</code> to:</p>
            <ul style={{ marginLeft: '20px' }}>
              <li>Complete store info</li>
              <li>Upload your first product</li>
              <li>Read vendor guidelines</li>
              <li>Join WhatsApp group (optional)</li>
            </ul>
          </li>
          
          <li>
            <strong>Upload Products:</strong>  
            <p>Click "Upload" in the nav bar. Add name, price, image, language, currency, and stock.</p>
          </li>
          
          <li>
            <strong>Manage Inventory:</strong>  
            <p>Go to <code>/vendor</code> to edit or delete your products and track revenue.</p>
          </li>
          
          <li>
            <strong>Need Help?</strong>  
            <p>Use the ✉️ floating button or visit <code>/support</code> to ask questions or give feedback.</p>
          </li>

          <li>
            <strong>Marketing Tools:</strong>
            <p>Create and manage promotional campaigns at <code>/vendor/marketing</code> to boost your sales.</p>
          </li>

          <li>
            <strong>Track Performance:</strong>
            <p>Monitor your sales, revenue, and analytics at <code>/vendor/analytics</code>.</p>
          </li>
        </ol>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#00B894', marginBottom: '1rem' }}>💡 Pro Tips</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>✅ Keep your inventory updated regularly</li>
            <li>✅ Respond to customer inquiries promptly</li>
            <li>✅ Use high-quality images for products</li>
            <li>✅ Price competitively but profitably</li>
            <li>✅ Maintain accurate product descriptions</li>
          </ul>
        </div>
      </div>
      <MerkatoFooter />
    </div>
  );
}

export default VendorGuide;