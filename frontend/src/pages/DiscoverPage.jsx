import React from 'react';
import { Link } from 'react-router-dom';
import { LinkBuilder } from '../config/routes'';
import PromoLinkCard from '../components/PromoLinkCard/PromoLinkCard'';
import SeoHead from '../components/SeoHead'';
import './HomePage.css';

export default function DiscoverPage() {
  return (
    <main className="homepage-outer" role="main">
      <SeoHead title={`Discover • Merkato`} canonical={`${window.location.origin}/discover`} />
      <h1
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(1px,1px,1px,1px)',
          whiteSpace: 'nowrap'
        }}
      >
        Discover
      </h1>

      {/* Intro band so this page is visually distinct */}
      <div className="shelf-band-bleed" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <section className="u-container">
          <nav aria-label="Breadcrumbs" style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            <Link to="/">Home</Link>
            <span> › </span>
            <span>Discover</span>
          </nav>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12 }}>
            <h2 style={{ margin: 0 }}>Discover</h2>
            <div style={{ color:'#64748b', fontSize:13 }}>Curated shortcuts to Tech, Deals, and Accessories</div>
          </div>
        </section>
      </div>

      {/* Three modules of card moved from Home – Tech, Deals, Accessories */}
      <div className="shelf-band-bleed">
        <section className="u-container home-row">
          <div className="promo-grid">
            <PromoLinkCard
              variant="category"
              title="See all tech"
              subtitle="Phones, laptops, audio, and more"
              href={LinkBuilder.toCategory('electronics', { sort: 'best' })}
              icon={<span role="img" aria-label="chip">💻</span>}
            />
            <PromoLinkCard
              variant="deals"
              title="See all deals"
              subtitle="Daily markdowns across categories"
              href={LinkBuilder.toDeal('under-25')}
              icon={<span role="img" aria-label="sale">🏷️</span>}
            />
            <PromoLinkCard
              variant="collection"
              title="See accessories"
              subtitle="Cables, chargers, cases, and more"
              href={LinkBuilder.toCategory('accessories', { sort: 'best' })}
              icon={<span role="img" aria-label="plug">🔌</span>}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
