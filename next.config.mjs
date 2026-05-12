/** @type {import('next').NextConfig} */

const exactDomains = [
  'quickcartapp.in',
  'via.placeholder.com',
  'lh3.googleusercontent.com',
  'firebasestorage.googleapis.com',
  'ibb.co',
  'unsplash.com'
];

const wildcardDomains = [
  '**.unsplash.com',
  '**.ibb.co',
  '**.bbassets.com',
  '**.dotpe.in',
  '**.unibicfoods.com',
  '**.grofers.com',
  '**.zepto.com',
  '**.instamart.in',
  '**.bigbasket.com',
  '**.price.tools',
  '**.imimg.com',
  '**.quickcartapp.in',
  '**.shopify.com',
  '**.flixcart.com',
  '**.amazon.com',
  '**.media-amazon.com',
  '**.gstatic.com',
  '**.cloudfront.net',
  '**.jiomart.com',
  '**.swiggy.com',
  '**.wp.com',
  '**.mamaearth.in',
  '**.wixstatic.com',
  '**.apollo247.in',
  '**.ppl-media.com',
  '**.clevup.in',
  '**.funcorp.in',
  '**.firebasestorage.app'
];

const nextConfig = {
  images: {
    remotePatterns: [
      ...exactDomains.map(domain => ({
        protocol: 'https',
        hostname: domain,
      })),
      ...wildcardDomains.map(domain => ({
        protocol: 'https',
        hostname: domain,
      })),
      // HTTP Fallbacks for specific known mixed-content domains
      { protocol: 'http', hostname: 'ibb.co' },
      { protocol: 'http', hostname: '**.ibb.co' },
      { protocol: 'http', hostname: 'unsplash.com' },
      { protocol: 'http', hostname: '**.unsplash.com' },
    ],
  },
};

export default nextConfig;