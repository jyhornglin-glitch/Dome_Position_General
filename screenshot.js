const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureScreenshots(port, outputDir) {
  console.log(`=== Starting screenshot capture for port ${port} ===`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
  
  console.log(`Navigating to http://localhost:${port}...`);
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 1. Screenshot 1: Search active
  console.log("Creating Screenshot 1: Main Search Interface...");
  await page.focus('#searchInput');
  await page.keyboard.type('4-50');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outputDir, 'screenshot_p1.png') });
  console.log("Screenshot 1 saved.");
  
  // 2. Select performer
  console.log("Selecting performer from dropdown...");
  const firstItem = await page.$('.autocomplete-item');
  if (firstItem) {
    await firstItem.click();
    console.log("Performer selected.");
  } else {
    await page.keyboard.press('Enter');
    console.log("Pressed Enter to search.");
  }
  await new Promise(r => setTimeout(r, 1000));
  
  // Interaction
  console.log("Interacting with map zoom and rotation...");
  const zoomInBtn = await page.$('#zoomInBtn');
  const rotateCwBtn = await page.$('#rotateCwBtn');
  if (zoomInBtn) {
    await zoomInBtn.click();
    await new Promise(r => setTimeout(r, 200));
    await zoomInBtn.click();
    await new Promise(r => setTimeout(r, 200));
  }
  if (rotateCwBtn) {
    await rotateCwBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log("Creating Screenshot 2: Relative Grid Map...");
  await page.screenshot({ path: path.join(outputDir, 'screenshot_p2.png') });
  console.log("Screenshot 2 saved.");
  
  // 3. Walkthrough tab
  console.log("Switching to Walkthrough tab...");
  const tabBtn = await page.$('.mobile-tab-btn[data-tab="walkthrough"]');
  if (tabBtn) {
    await tabBtn.click();
    await new Promise(r => setTimeout(r, 800));
  }
  
  console.log("Creating Screenshot 3: Walkthrough list...");
  await page.screenshot({ path: path.join(outputDir, 'screenshot_p3.png') });
  console.log("Screenshot 3 saved.");
  
  await browser.close();
  console.log(`=== Finished screenshots for port ${port} ===\n`);
}

(async () => {
  try {
    // 1. Original version (port 8000) -> /Users/franklin/Documents/大巨蛋演繹跑位查詢/images
    const origDir = path.join(__dirname, 'images');
    await captureScreenshots('8000', origDir);
    
    // 2. Universal version (port 8001) -> /Users/franklin/Documents/大巨蛋演繹跑位查詢＿通用場次/images
    const univDir = path.resolve(__dirname, '..', '大巨蛋演繹跑位查詢＿通用場次', 'images');
    await captureScreenshots('8001', univDir);
    
    console.log("All screenshots captured successfully!");
  } catch (err) {
    console.error("Error during screenshot capturing:", err);
  }
})();
