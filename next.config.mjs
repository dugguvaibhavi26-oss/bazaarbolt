const IMAGE_DOMAINS = [
  // Core App & Storage
  'quickcartapp.in',
  'firebasestorage.googleapis.com',
  'firebasestorage.app',
  
  // AWS S3 (Global Support)
  's3.amazonaws.com',
  's3.ap-south-1.amazonaws.com',
  
  // E-commerce CDNs (India & Global)
  'bbassets.com',   // BigBasket
  'dotpe.in',       // DotPe
  'grofers.com',    // Blinkit
  'zepto.com',      // Zepto
  'zepio.io',       // Zepto CDN
  'instamart.in',   // Swiggy Instamart
  'bigbasket.com',  // BigBasket
  'jiomart.com',    // JioMart
  'swiggy.com',     // Swiggy
  'shopify.com',    // Shopify
  'flixcart.com',   // Flipkart
  'amazon.com',     // Amazon
  'media-amazon.com',
  'ppl-media.com',  // Purplle
  'clevup.in',      // Clevup
  'imimg.com',      // IndiaMART
  'wp.com',         // WordPress/Jetpack
  'wixstatic.com',  // Wix
  'mamaearth.in',   // Mamaearth
  'apollo247.in',   // Apollo
  'funcorp.in',     // FunCorp
  'unibicfoods.com',// Unibic
  'price.tools',    // Price.tools
  
  // Generic Media CDNs
  'unsplash.com',
  'ibb.co',
  'gstatic.com',
  'googleusercontent.com',
  'cloudfront.net',
  'flaticon.com',
  'cloudinary.com',
  'imgur.com',
  'fastly.net',
  'placehold.co',
  'placeholder.com'
];

const nextConfig = {
  images: {
    // Permanent Fix: Allow all remote patterns via wildcard.
    // This prevents "Invalid src prop" crashes when new vendors/CDNs are added.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Optimization: Unoptimized for faster dev build if needed
    // unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    // Turbopack specific experimental features can go here
  },
  // Ensure webpack fallback for older modules if any
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;