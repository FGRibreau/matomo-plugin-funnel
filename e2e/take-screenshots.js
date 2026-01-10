const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const MATOMO_URL = process.env.MATOMO_URL || 'http://localhost:8080';
const MATOMO_USER = process.env.MATOMO_USER || 'admin';
const MATOMO_PASSWORD = process.env.MATOMO_PASSWORD || 'adminpassword123';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function verifyScreenshot(page, filename, expectedContent, forbiddenContent = ['error occurred', 'sign in to continue', 'forgot your password']) {
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });

  // Verify screenshot is not a login/error page
  const url = page.url();
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());

  console.log(`\n--- Screenshot: ${filename} ---`);
  console.log(`URL: ${url}`);
  console.log(`Title: ${title}`);

  // Check for forbidden content (login page, error pages)
  for (const forbidden of forbiddenContent) {
    if (bodyText.includes(forbidden.toLowerCase())) {
      console.error(`ERROR: Screenshot ${filename} contains forbidden content: "${forbidden}"`);
      console.log(`Body preview: ${bodyText.substring(0, 300)}`);
      return false;
    }
  }

  // Check for login page indicators
  const isLoginPage =
    url.includes('module=Login') ||
    url.includes('action=login');

  if (isLoginPage) {
    console.error(`ERROR: Screenshot ${filename} shows login page`);
    return false;
  }

  // Check for error page
  if (title.toLowerCase().includes('error')) {
    console.error(`ERROR: Screenshot ${filename} shows error page - Title: ${title}`);
    console.log(`Body preview: ${bodyText.substring(0, 300)}`);
    return false;
  }

  // Check for expected content
  if (expectedContent && !bodyText.includes(expectedContent.toLowerCase())) {
    console.warn(`WARNING: Expected content "${expectedContent}" not found in page`);
  }

  console.log(`SUCCESS: Screenshot saved to ${filepath}`);
  return true;
}

async function main() {
  console.log('Starting Matomo screenshot capture...');
  console.log(`Matomo URL: ${MATOMO_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    locale: 'en-US'
  });

  const page = await context.newPage();
  let allScreenshotsValid = true;

  // Step 1: Login to Matomo
  console.log('\n=== Step 1: Logging in to Matomo ===');
  await page.goto(`${MATOMO_URL}/index.php?module=Login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[name="form_login"]', MATOMO_USER);
  await page.fill('input[name="form_password"]', MATOMO_PASSWORD);
  await page.click('input[type="submit"]');

  // Wait for redirect after login
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Verify login was successful
  const loginUrl = page.url();
  if (loginUrl.includes('module=Login')) {
    console.error('ERROR: Login failed - still on login page');
    console.log('Current URL:', loginUrl);
    await browser.close();
    process.exit(1);
  }
  console.log('Login successful!');

  // Step 2: Funnel Index/Overview (list of funnels with reports)
  console.log('\n=== Step 2: Funnel Overview (index) ===');
  await page.goto(`${MATOMO_URL}/index.php?module=FunnelInsights&action=index&idSite=1&period=day&date=yesterday`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  if (!await verifyScreenshot(page, '01-funnel-overview.png', 'funnel')) {
    allScreenshotsValid = false;
  }

  // Step 3: Manage Funnels page (admin)
  console.log('\n=== Step 3: Manage Funnels ===');
  await page.goto(`${MATOMO_URL}/index.php?module=FunnelInsights&action=manage&idSite=1&period=day&date=yesterday`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  if (!await verifyScreenshot(page, '02-manage-funnels.png', 'manage funnel')) {
    allScreenshotsValid = false;
  }

  // Step 4: Create/Edit Funnel dialog (edit existing funnel to show form with data)
  console.log('\n=== Step 4: Create/Edit Funnel Form ===');
  await page.goto(`${MATOMO_URL}/index.php?module=FunnelInsights&action=edit&idSite=1&period=day&date=yesterday&idFunnel=1`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  if (!await verifyScreenshot(page, '03-create-funnel.png', 'funnel')) {
    allScreenshotsValid = false;
  }

  // Step 5: View a specific funnel report (the main visualization)
  // Use specific date where we have archive data
  console.log('\n=== Step 5: View Funnel Report ===');
  await page.goto(`${MATOMO_URL}/index.php?module=FunnelInsights&action=viewFunnel&idSite=1&period=day&date=2026-01-09&idFunnel=1`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  if (!await verifyScreenshot(page, '04-view-funnel.png', 'funnel')) {
    allScreenshotsValid = false;
  }

  await browser.close();

  // Final summary
  console.log('\n=== Screenshot Summary ===');
  const screenshotFiles = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
  console.log(`Screenshots captured: ${screenshotFiles.length}`);
  screenshotFiles.forEach(f => console.log(`  - ${f}`));

  if (allScreenshotsValid) {
    console.log('\nAll screenshots captured and verified successfully!');
    process.exit(0);
  } else {
    console.error('\nSome screenshots failed verification!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
