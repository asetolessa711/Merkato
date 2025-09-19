// Central mega menu configuration. Keep display groupings here to avoid duplication.
// Each column has a title, optional icon or thumbnail, and a list of links (each link may also carry an icon).

export const MEGA_MENU = [
  // Fashion
  {
    title: 'Fashion',
    icon: '👗',
    links: [
      { label: "Women's Clothing", to: '/shop?cat=women' },
      { label: "Men's Clothing", to: '/shop?cat=men' },
      { label: 'Shoes', to: '/shop?cat=shoes' },
      { label: 'Bags & Accessories', to: '/shop?cat=bags' },
      { label: 'Jewelry', to: '/shop?cat=jewelry' },
    ],
  },
  // Electronics
  {
    title: 'Electronics',
    icon: '📱',
    links: [
      { label: 'Mobile Phones', to: '/shop?search=mobile%20phone&category=electronics' },
      { label: 'Laptops', to: '/shop?search=laptop&category=electronics' },
      { label: 'Smart Watches', to: '/shop?search=smartwatch&category=electronics' },
      { label: 'Audio Devices', to: '/shop?search=headphones&category=electronics' },
      { label: 'Accessories', to: '/shop?search=accessories&category=electronics' },
    ],
  },
  // Home & Kitchen
  {
    title: 'Home & Kitchen',
    icon: '🏠',
    links: [
      { label: 'Furniture', to: '/shop?search=furniture&category=home' },
      { label: 'Decor', to: '/shop?search=decor&category=home' },
      { label: 'Kitchen Tools', to: '/shop?search=kitchen%20tools&category=home' },
      { label: 'Storage', to: '/shop?search=storage&category=home' },
      { label: 'Bedding', to: '/shop?search=bedding&category=home' },
    ],
  },
  // Beauty & Health
  {
    title: 'Beauty & Health',
    icon: '💄',
    links: [
      { label: 'Skincare', to: '/shop?search=skincare&category=beauty' },
      { label: 'Haircare', to: '/shop?search=haircare&category=beauty' },
      { label: 'Makeup', to: '/shop?search=makeup&category=beauty' },
      { label: 'Personal Care', to: '/shop?search=personal%20care&category=beauty' },
      { label: 'Supplements', to: '/shop?search=supplements&category=beauty' },
    ],
  },
  // Sports & Outdoors
  {
    title: 'Sports & Outdoors',
    icon: '🏕️',
    links: [
      { label: 'Fitness Equipment', to: '/shop?search=fitness&category=sports' },
      { label: 'Outdoor Gear', to: '/shop?search=outdoor%20gear&category=sports' },
      { label: 'Activewear', to: '/shop?search=activewear&category=sports' },
      { label: 'Camping', to: '/shop?search=camping&category=sports' },
    ],
  },
  // Automotive
  {
    title: 'Automotive',
    icon: '🚗',
    links: [
      { label: 'Car Accessories', to: '/shop?search=car%20accessories&category=automotive' },
      { label: 'Tools', to: '/shop?search=tools&category=automotive' },
      { label: 'Motorcycle Gear', to: '/shop?search=motorcycle%20gear&category=automotive' },
      { label: 'Electronics', to: '/shop?search=car%20electronics&category=automotive' },
    ],
  },
  // Toys & Hobbies
  {
    title: 'Toys & Hobbies',
    icon: '🧸',
    links: [
      { label: 'Educational Toys', to: '/shop?search=educational%20toys&category=toys' },
      { label: 'RC Models', to: '/shop?search=rc%20models&category=toys' },
      { label: 'Crafts', to: '/shop?search=crafts&category=toys' },
      { label: 'Collectibles', to: '/shop?search=collectibles&category=toys' },
    ],
  },
  // Office & School
  {
    title: 'Office & School',
    icon: '📚',
    links: [
      { label: 'Stationery', to: '/shop?search=stationery&category=office' },
      { label: 'Office Furniture', to: '/shop?search=office%20furniture&category=office' },
      { label: 'Supplies', to: '/shop?search=supplies&category=office' },
      { label: 'Tech', to: '/shop?search=office%20tech&category=office' },
    ],
  },
  // Baby & Kids
  {
    title: 'Baby & Kids',
    icon: '👶',
    links: [
      { label: 'Clothing', to: '/shop?search=baby%20clothing&category=baby' },
      { label: 'Toys', to: '/shop?search=baby%20toys&category=baby' },
      { label: 'Feeding', to: '/shop?search=feeding&category=baby' },
      { label: 'Nursery', to: '/shop?search=nursery&category=baby' },
    ],
  },
  // Entertainment
  {
    title: 'Entertainment',
    icon: '🎮',
    links: [
      { label: 'Books', to: '/shop?search=books&category=entertainment' },
      { label: 'Music', to: '/shop?search=music&category=entertainment' },
      { label: 'Instruments', to: '/shop?search=instrument&category=entertainment' },
      { label: 'Games', to: '/shop?search=games&category=entertainment' },
    ],
  },
  // Deals & Promotions
  {
    title: 'Deals & Promotions',
    icon: '💸',
    links: [
      { label: 'Flash Deals', to: '/shop?search=flash%20deals' },
      { label: 'Clearance', to: '/shop?search=clearance' },
      { label: 'Coupons', to: '/shop?search=coupons' },
      { label: 'Seasonal Offers', to: '/shop?search=seasonal%20offers' },
    ],
  },
];

export default MEGA_MENU;

