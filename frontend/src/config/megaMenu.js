// Central mega menu configuration. Keep display groupings here to avoid duplication.
// Each column has a title, optional icon or thumbnail, and a list of links (each link may also carry an icon).

import { LinkBuilder } from './routes'';

export const MEGA_MENU = [
  // Fashion
  {
    title: 'Fashion',
    icon: '👗',
    links: [
  { label: "Women's Clothing", to: LinkBuilder.toSubcategory('fashion', 'women', { sort: 'best' }) },
  { label: "Men's Clothing", to: LinkBuilder.toSubcategory('fashion', 'men', { sort: 'best' }) },
  { label: 'Shoes', to: LinkBuilder.toSubcategory('fashion', 'shoes', { sort: 'best' }) },
  { label: 'Bags & Accessories', to: LinkBuilder.toSubcategory('fashion', 'bags', { sort: 'best' }) },
  { label: 'Jewelry', to: LinkBuilder.toSubcategory('fashion', 'jewelry', { sort: 'best' }) },
    ],
  },
  // Electronics
  {
    title: 'Electronics',
    icon: '📱',
    links: [
  { label: 'Mobile Phones', to: LinkBuilder.toSubcategory('electronics', 'mobile-phones', { sort: 'best' }) },
  { label: 'Laptops', to: LinkBuilder.toSubcategory('electronics', 'laptops', { sort: 'best' }) },
  { label: 'Smart Watches', to: LinkBuilder.toSubcategory('electronics', 'smart-watches', { sort: 'best' }) },
  { label: 'Audio Devices', to: LinkBuilder.toSubcategory('electronics', 'audio', { sort: 'best' }) },
  { label: 'Accessories', to: LinkBuilder.toSubcategory('electronics', 'accessories', { sort: 'best' }) },
    ],
  },
  // Home & Kitchen
  {
    title: 'Home & Kitchen',
    icon: '🏠',
    links: [
  { label: 'Furniture', to: LinkBuilder.toSubcategory('home', 'furniture', { sort: 'best' }) },
  { label: 'Decor', to: LinkBuilder.toSubcategory('home', 'decor', { sort: 'best' }) },
  { label: 'Kitchen Tools', to: LinkBuilder.toSubcategory('home', 'kitchen-tools', { sort: 'best' }) },
  { label: 'Storage', to: LinkBuilder.toSubcategory('home', 'storage', { sort: 'best' }) },
  { label: 'Bedding', to: LinkBuilder.toSubcategory('home', 'bedding', { sort: 'best' }) },
    ],
  },
  // Beauty & Health
  {
    title: 'Beauty & Health',
    icon: '💄',
    links: [
  { label: 'Skincare', to: LinkBuilder.toSubcategory('beauty', 'skincare', { sort: 'best' }) },
  { label: 'Haircare', to: LinkBuilder.toSubcategory('beauty', 'haircare', { sort: 'best' }) },
  { label: 'Makeup', to: LinkBuilder.toSubcategory('beauty', 'makeup', { sort: 'best' }) },
  { label: 'Personal Care', to: LinkBuilder.toSubcategory('beauty', 'personal-care', { sort: 'best' }) },
  { label: 'Supplements', to: LinkBuilder.toSubcategory('beauty', 'supplements', { sort: 'best' }) },
    ],
  },
  // Sports & Outdoors
  {
    title: 'Sports & Outdoors',
    icon: '🏕️',
    links: [
  { label: 'Fitness Equipment', to: LinkBuilder.toSubcategory('sports', 'fitness', { sort: 'best' }) },
  { label: 'Outdoor Gear', to: LinkBuilder.toSubcategory('sports', 'outdoor-gear', { sort: 'best' }) },
  { label: 'Activewear', to: LinkBuilder.toSubcategory('sports', 'activewear', { sort: 'best' }) },
  { label: 'Camping', to: LinkBuilder.toSubcategory('sports', 'camping', { sort: 'best' }) },
    ],
  },
  // Automotive
  {
    title: 'Automotive',
    icon: '🚗',
    links: [
  { label: 'Car Accessories', to: LinkBuilder.toSubcategory('automotive', 'car-accessories', { sort: 'best' }) },
  { label: 'Tools', to: LinkBuilder.toSubcategory('automotive', 'tools', { sort: 'best' }) },
  { label: 'Motorcycle Gear', to: LinkBuilder.toSubcategory('automotive', 'motorcycle-gear', { sort: 'best' }) },
  { label: 'Electronics', to: LinkBuilder.toSubcategory('automotive', 'electronics', { sort: 'best' }) },
    ],
  },
  // Toys & Hobbies
  {
    title: 'Toys & Hobbies',
    icon: '🧸',
    links: [
  { label: 'Educational Toys', to: LinkBuilder.toSubcategory('toys', 'educational-toys', { sort: 'best' }) },
  { label: 'RC Models', to: LinkBuilder.toSubcategory('toys', 'rc-models', { sort: 'best' }) },
  { label: 'Crafts', to: LinkBuilder.toSubcategory('toys', 'crafts', { sort: 'best' }) },
  { label: 'Collectibles', to: LinkBuilder.toSubcategory('toys', 'collectibles', { sort: 'best' }) },
    ],
  },
  // Office & School
  {
    title: 'Office & School',
    icon: '📚',
    links: [
  { label: 'Stationery', to: LinkBuilder.toSubcategory('office', 'stationery', { sort: 'best' }) },
  { label: 'Office Furniture', to: LinkBuilder.toSubcategory('office', 'office-furniture', { sort: 'best' }) },
  { label: 'Supplies', to: LinkBuilder.toSubcategory('office', 'supplies', { sort: 'best' }) },
  { label: 'Tech', to: LinkBuilder.toSubcategory('office', 'tech', { sort: 'best' }) },
    ],
  },
  // Baby & Kids
  {
    title: 'Baby & Kids',
    icon: '👶',
    links: [
  { label: 'Clothing', to: LinkBuilder.toSubcategory('baby', 'clothing', { sort: 'best' }) },
  { label: 'Toys', to: LinkBuilder.toSubcategory('baby', 'toys', { sort: 'best' }) },
  { label: 'Feeding', to: LinkBuilder.toSubcategory('baby', 'feeding', { sort: 'best' }) },
  { label: 'Nursery', to: LinkBuilder.toSubcategory('baby', 'nursery', { sort: 'best' }) },
    ],
  },
  // Entertainment
  {
    title: 'Entertainment',
    icon: '🎮',
    links: [
  { label: 'Books', to: LinkBuilder.toSubcategory('entertainment', 'books', { sort: 'best' }) },
  { label: 'Music', to: LinkBuilder.toSubcategory('entertainment', 'music', { sort: 'best' }) },
  { label: 'Instruments', to: LinkBuilder.toSubcategory('entertainment', 'instruments', { sort: 'best' }) },
  { label: 'Games', to: LinkBuilder.toSubcategory('entertainment', 'games', { sort: 'best' }) },
    ],
  },
  // Deals & Promotions
  {
    title: 'Deals & Promotions',
    icon: '💸',
    links: [
  { label: 'Flash Deals', to: LinkBuilder.toDeal('percent-off-30') },
  { label: 'Clearance', to: LinkBuilder.toDeal('clearance') },
  { label: 'Coupons', to: '/discover' },
  { label: 'Seasonal Offers', to: LinkBuilder.toDeal('percent-off-20') },
    ],
  },
];

export default MEGA_MENU;

