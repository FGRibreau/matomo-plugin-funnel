/**
 * Generate realistic funnel tracking data using Matomo Tracking API
 * This creates visits that follow the E-commerce Checkout funnel steps
 */

const MATOMO_URL = process.env.MATOMO_URL || 'http://localhost:8080';
const SITE_ID = 1;

// Funnel steps URLs
const FUNNEL_STEPS = [
  '/',                    // Homepage
  '/product/awesome-widget', // Product Page
  '/cart',                // Cart
  '/checkout',            // Checkout
  '/order-complete'       // Order Complete
];

// Helper to make tracking requests
async function track(params) {
  const url = new URL(`${MATOMO_URL}/matomo.php`);

  // Required params
  url.searchParams.set('idsite', SITE_ID);
  url.searchParams.set('rec', '1');
  url.searchParams.set('apiv', '1');

  // Add custom params
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  return response.ok;
}

// Generate a random visitor ID (16 hex chars)
function generateVisitorId() {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Simulate a single visit through the funnel
async function simulateVisit(visitorId, stepsToComplete, baseTime) {
  console.log(`  Visitor ${visitorId.substring(0, 8)}... completing ${stepsToComplete} steps`);

  let currentTime = new Date(baseTime);

  for (let i = 0; i < stepsToComplete && i < FUNNEL_STEPS.length; i++) {
    const pageUrl = `https://example.com${FUNNEL_STEPS[i]}`;
    const pageTitle = getPageTitle(FUNNEL_STEPS[i]);

    // Add some random time between actions (10-120 seconds)
    currentTime = new Date(currentTime.getTime() + (10 + Math.random() * 110) * 1000);

    const cdt = currentTime.toISOString().replace('T', ' ').substring(0, 19);

    await track({
      _id: visitorId,
      url: pageUrl,
      action_name: pageTitle,
      cdt: cdt,
      // Random additional data
      res: '1920x1080',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      lang: 'en-US',
      _idts: Math.floor(baseTime.getTime() / 1000),
      _viewts: Math.floor(currentTime.getTime() / 1000),
    });
  }
}

function getPageTitle(path) {
  const titles = {
    '/': 'Home - Example Store',
    '/product/awesome-widget': 'Awesome Widget - Example Store',
    '/cart': 'Shopping Cart - Example Store',
    '/checkout': 'Checkout - Example Store',
    '/order-complete': 'Order Complete - Thank You!'
  };
  return titles[path] || 'Example Store';
}

async function main() {
  console.log('Generating funnel tracking data...');
  console.log(`Target: ${MATOMO_URL}`);

  // Generate visits over the past few days
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);

  // Distribution: simulate realistic drop-off (smaller numbers for faster generation)
  // 100 start -> 80 view product -> 50 add to cart -> 30 checkout -> 15 complete
  const visitDistribution = [
    { steps: 1, count: 20 },   // Only homepage
    { steps: 2, count: 30 },   // Homepage + Product
    { steps: 3, count: 20 },   // + Cart
    { steps: 4, count: 15 },   // + Checkout
    { steps: 5, count: 15 },   // Complete purchase
  ];

  let totalVisits = 0;

  for (const { steps, count } of visitDistribution) {
    console.log(`\nGenerating ${count} visits with ${steps} step(s)...`);

    for (let i = 0; i < count; i++) {
      const visitorId = generateVisitorId();
      // Spread visits throughout the day
      const visitTime = new Date(yesterday.getTime() + Math.random() * 12 * 60 * 60 * 1000);

      await simulateVisit(visitorId, steps, visitTime);
      totalVisits++;

      // Show progress every 50 visits
      if (totalVisits % 50 === 0) {
        console.log(`  Progress: ${totalVisits} visits generated`);
      }
    }
  }

  console.log(`\n✓ Generated ${totalVisits} total visits`);
  console.log('\nExpected funnel metrics:');
  console.log('  Step 1 (Homepage): ~1000 entries');
  console.log('  Step 2 (Product): ~800 visits');
  console.log('  Step 3 (Cart): ~500 visits');
  console.log('  Step 4 (Checkout): ~300 visits');
  console.log('  Step 5 (Complete): ~150 conversions');
  console.log('  Conversion Rate: ~15%');

  console.log('\nNow run the archiver to process the data:');
  console.log('  docker compose exec matomo php console core:archive --force-all-websites');
}

main().catch(err => {
  console.error('Error generating data:', err);
  process.exit(1);
});
