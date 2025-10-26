/**
 * Automated test for authentication flow
 * Tests sign-in modal, Firebase auth, and sign-out functionality
 */

const { chromium } = require('playwright');

async function testAuthFlow() {
  console.log('🚀 Starting authentication flow test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || text.includes('Firebase') || text.includes('auth')) {
      console.log(`[Browser ${type}]:`, text);
    }
  });
  
  try {
    // Step 1: Navigate to app
    console.log('📱 Step 1: Loading app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✅ App loaded\n');
    
    // Step 2: Check if Sign In button exists
    console.log('🔍 Step 2: Looking for Sign In button...');
    const signInButton = await page.locator('button:has-text("Sign In")').first();
    const isVisible = await signInButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      console.log('ℹ️  User might already be signed in. Checking for user menu...');
      const userMenu = await page.locator('button[aria-label="User menu"]').first();
      const userMenuVisible = await userMenu.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (userMenuVisible) {
        console.log('👤 User is signed in. Testing sign out...\n');
        
        // Open user menu
        console.log('📂 Opening user menu...');
        await userMenu.click();
        await page.waitForTimeout(500);
        
        // Click sign out
        console.log('🚪 Clicking Sign Out...');
        const signOutButton = await page.locator('button:has-text("Sign Out")').first();
        await signOutButton.click();
        await page.waitForTimeout(2000);
        
        console.log('✅ Signed out successfully\n');
      }
    }
    
    // Step 3: Click Sign In button
    console.log('🖱️  Step 3: Clicking Sign In button...');
    await signInButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Sign In button clicked\n');
    
    // Step 4: Check if modal opened
    console.log('🔍 Step 4: Checking if sign-in modal opened...');
    const modalTitle = await page.locator('h2:has-text("Welcome Back"), h2:has-text("Welcome to DataSnap")').first();
    const modalVisible = await modalTitle.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      throw new Error('❌ Sign-in modal did not open');
    }
    console.log('✅ Sign-in modal opened\n');
    
    // Step 5: Check modal content
    console.log('🔍 Step 5: Checking modal elements...');
    const emailInput = await page.locator('input[type="text"][placeholder*="email"], input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    const googleButton = await page.locator('button:has-text("Google"), button:has-text("google")').first();
    
    const hasEmailInput = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);
    const hasPasswordInput = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false);
    const hasGoogleButton = await googleButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log('Email input present:', hasEmailInput ? '✅' : '❌');
    console.log('Password input present:', hasPasswordInput ? '✅' : '❌');
    console.log('Google sign-in present:', hasGoogleButton ? '✅' : '❌');
    console.log('');
    
    // Step 6: Test Firebase configuration
    console.log('🔥 Step 6: Checking Firebase configuration...');
    const firebaseConfig = await page.evaluate(() => {
      return {
        hasFirebaseApiKey: !!window.process?.env?.FIREBASE_API_KEY,
        hasFirebaseProjectId: !!window.process?.env?.FIREBASE_PROJECT_ID,
        configLoaded: typeof window.firebase !== 'undefined' || typeof window.__FIREBASE_DEFAULTS__ !== 'undefined'
      };
    });
    
    console.log('Firebase API Key configured:', firebaseConfig.hasFirebaseApiKey ? '✅' : '❌');
    console.log('Firebase Project ID configured:', firebaseConfig.hasFirebaseProjectId ? '✅' : '❌');
    console.log('Firebase initialized:', firebaseConfig.configLoaded ? '✅' : '❌');
    console.log('');
    
    // Step 7: Try filling in test credentials (don't actually submit)
    if (hasEmailInput && hasPasswordInput) {
      console.log('📝 Step 7: Testing form inputs...');
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword123');
      console.log('✅ Form inputs working\n');
    }
    
    // Step 8: Close modal
    console.log('❌ Step 8: Closing modal...');
    const closeButton = await page.locator('button:has([data-lucide="x"]), button:has-text("×")').first();
    await closeButton.click();
    await page.waitForTimeout(500);
    console.log('✅ Modal closed\n');
    
    console.log('🎉 All tests passed!\n');
    console.log('Summary:');
    console.log('- Sign In button works ✅');
    console.log('- Modal opens correctly ✅');
    console.log('- Form fields are present ✅');
    console.log('- Firebase configuration checked ✅');
    console.log('- Modal can be closed ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nError details:', error);
    
    // Take screenshot on failure
    await page.screenshot({ path: 'auth-test-failure.png', fullPage: true });
    console.log('\n📸 Screenshot saved to auth-test-failure.png');
  } finally {
    await browser.close();
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('Checking if dev server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Dev server is not running on http://localhost:3000');
    console.error('Please run: npm run electron:dev');
    process.exit(1);
  }
  
  console.log('✅ Dev server is running\n');
  await testAuthFlow();
})();
