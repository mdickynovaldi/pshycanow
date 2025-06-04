const puppeteer = require('puppeteer');

async function testFrontendPage() {
  let browser;
  try {
    console.log('🌐 Testing Frontend Page...\n');
    
    const studentId = 'cmbdo3fr7000pog148rbebp6k';
    const quizId = 'cmas2h35k0006ogtx87895ex3';
    const url = `http://localhost:3000/teacher/quizzes/${quizId}/students/${studentId}/submissions`;
    
    console.log(`📌 URL: ${url}\n`);
    
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Listen for console logs
    page.on('console', msg => {
      console.log('Browser Console:', msg.text());
    });
    
    // Listen for network requests
    page.on('response', response => {
      if (response.url().includes('/api/teacher/quiz-submissions')) {
        console.log(`API Response: ${response.status()}`);
      }
    });
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check if submissions are displayed
    const submissionCards = await page.$$('[data-testid="submission-card"], .space-y-6 > div > .relative');
    console.log(`📊 Found ${submissionCards.length} submission cards`);
    
    // Get the page title and content
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`📝 Page Title: ${title}`);
    
    // Check for loading state
    const loadingElement = await page.$('text=Memuat data submission');
    if (loadingElement) {
      console.log('⏳ Page is still loading');
    }
    
    // Check for error messages
    const errorElements = await page.$$('text=Gagal memuat');
    if (errorElements.length > 0) {
      console.log('❌ Found error messages on page');
    }
    
    // Get submissions data from the page
    const submissionsText = await page.evaluate(() => {
      const summaryCards = document.querySelectorAll('.text-2xl.font-bold');
      return Array.from(summaryCards).map(card => card.textContent);
    });
    
    console.log('📊 Summary Stats:', submissionsText);
    
  } catch (error) {
    console.error('❌ Error testing frontend:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testFrontendPage(); 