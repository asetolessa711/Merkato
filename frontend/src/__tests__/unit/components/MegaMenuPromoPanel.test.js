import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MegaMenuPromoPanel, { MEGA_PROMOS_KEY } from '../../../components/MegaMenuPromoPanel';

describe('MegaMenuPromoPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    localStorage.clear();
  });

  test('falls back to defaults when no promos configured', () => {
    render(<MegaMenuPromoPanel activeCategory="" activeSubcategory="" />);
    // One of the default promos should show up
    expect(screen.getByText(/New Arrivals|Top Picks|Best Sellers/i)).toBeInTheDocument();
  });

  test('subcategory match takes priority over category/global', () => {
    const promos = [
      { id: 'g1', title: 'Global Promo', text: 'G', type: 'text', enabled: true, href: '/shop' },
      { id: 'c1', title: 'Category Promo', text: 'C', type: 'text', enabled: true, categories: ['Electronics'], href: '/shop?cat=electronics' },
      { id: 's1', title: 'Subcategory Promo', text: 'S', type: 'text', enabled: true, subcategories: ['Laptops'], href: '/shop?cat=electronics&sub=laptops' },
    ];
    localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(promos));
    render(<MegaMenuPromoPanel activeCategory="Electronics" activeSubcategory="Laptops" />);
    expect(screen.getByText('Subcategory Promo')).toBeInTheDocument();
  });

  test('auto-rotates between multiple matching promos every 5s', () => {
  // Enable rotation by switching to default (non-minimal) mode
  localStorage.setItem('merkato-mega-promo-mode', 'default');
    const promos = [
      { id: 's1', title: 'Laptop Deal 1', text: 'A', type: 'text', enabled: true, subcategories: ['Laptops'], href: '/shop?a=1' },
      { id: 's2', title: 'Laptop Deal 2', text: 'B', type: 'text', enabled: true, subcategories: ['Laptops'], href: '/shop?a=2' },
    ];
    localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(promos));
    render(<MegaMenuPromoPanel activeCategory="Electronics" activeSubcategory="Laptops" />);
    expect(screen.getByText('Laptop Deal 1')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.getByText('Laptop Deal 2')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.getByText('Laptop Deal 1')).toBeInTheDocument();
  });

  test('respects scheduling (startAt/endAt)', () => {
    const now = Date.now();
    const past = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const future = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const promos = [
      { id: 'inactive', title: 'Not Active', text: 'X', type: 'text', enabled: true, startAt: future, href: '/x' },
      { id: 'active', title: 'Active', text: 'Y', type: 'text', enabled: true, startAt: past, endAt: future, href: '/y' },
    ];
    localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(promos));
    render(<MegaMenuPromoPanel activeCategory="" activeSubcategory="" />);
    expect(screen.queryByText('Not Active')).not.toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('emits SPA navigate intent for internal href on click', () => {
    const promos = [
      { id: 'p1', title: 'Click Me', text: 'Go', type: 'cta', enabled: true, href: '/shop?sort=best' },
    ];
    localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(promos));
    const navSpy = jest.fn();
    window.addEventListener('mega-promo:navigate', (e) => navSpy(e.detail?.href));
    render(<MegaMenuPromoPanel activeCategory="" activeSubcategory="" />);
    fireEvent.click(screen.getByRole('button', { name: /click me|go|shop|best/i }));
    expect(navSpy).toHaveBeenCalledWith('/shop?sort=best');
  });

  test('clicking promo navigates to hovered main category when no explicit href', () => {
    const promos = [
      { id: 'p1', title: 'Category Focus', text: 'Deals', type: 'text', enabled: true },
    ];
    localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(promos));
    const navSpy = jest.fn();
    window.addEventListener('mega-promo:navigate', (e) => navSpy(e.detail?.href));
    render(<MegaMenuPromoPanel activeCategory="Electronics" activeSubcategory="" />);
  // Click inside the card by targeting the title text (no CTA required)
  fireEvent.click(screen.getByText('Category Focus'));
    expect(navSpy).toHaveBeenCalledWith('/shop?category=electronics');
  });

  test('no tip text is rendered under the promo card', () => {
    render(<MegaMenuPromoPanel activeCategory="" activeSubcategory="" />);
    expect(screen.queryByText(/tip: hover categories/i)).not.toBeInTheDocument();
  });

  test('minimal mode tones down visuals (no image render)', () => {
    localStorage.setItem('merkato-mega-promo-mode', 'minimal');
    const promos = [
      { id: 'p1', title: 'Simple', text: 'Toned', type: 'text', enabled: true, image: 'https://example.com/x.jpg', href: '/shop' },
    ];
    localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(promos));
    const { container } = render(<MegaMenuPromoPanel activeCategory="" activeSubcategory="" />);
    // Image should not render in minimal mode
    expect(container.querySelector('img')).toBeNull();
  });

  test('off mode hides the panel entirely', () => {
    localStorage.setItem('merkato-mega-promo-mode', 'off');
    const promos = [
      { id: 'p1', title: 'Hidden', text: 'No show', type: 'text', enabled: true, href: '/shop' },
    ];
    localStorage.setItem(MEGA_PROMOS_KEY, JSON.stringify(promos));
    const { container } = render(<MegaMenuPromoPanel activeCategory="" activeSubcategory="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
