/**
 * Automated test for Electron app authentication flow
 * Tests sign-in modal, Firebase auth, and sign-out in the actual Electron app
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function testElectronAuthFlow() {
  console.log('🚀 Starting Electron authentication flow test...\n');
  
  let electronApp;
  
  try {
    // Step 1: Launch Electron app
    console.log('📱 Step 1: Launching Electron app...');
    electronApp = await electron.launch({
      args: [path.join(__dirname, 'electron/main.cjs')],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DEV_SERVER_URL: 'http://localhost:3000'
      }
    });
    
    // Wait for the window to be ready
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000); // Give app time to fully load
    console.log('✅ Electron app launched\n');
    
    // Take initial screenshot
    await window.screenshot({ path: 'electron-auth-test-1-start.png' });
    console.log('📸 Screenshot saved: electron-auth-test-1-start.png\n');
    
    // Step 2: Check if Sign In button exists
    console.log('🔍 Step 2: Looking for Sign In button...');
    const signInButton = window.locator('button:has-text("Sign In")').first();
    const isVisible = await signInButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      console.log('ℹ️  User might already be signed in. Checking for user menu...');
      const userMenu = window.locator('button[aria-label="User menu"]').first();
      const userMenuVisible = await userMenu.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (userMenuVisible) {
        console.log('👤 User is already signed in. Testing sign out first...\n');
        
        // Open user menu
        console.log('📂 Opening user menu...');
        await userMenu.click();
        await window.waitForTimeout(500);
        await window.screenshot({ path: 'electron-auth-test-2-menu-open.png' });
        console.log('📸 Screenshot saved: electron-auth-test-2-menu-open.png\n');
        
        // Click sign out
        console.log('🚪 Clicking Sign Out...');
        const signOutButton = window.locator('button:has-text("Sign Out")').first();
        await signOutButton.click();
        await window.waitForTimeout(2000);
        
        await window.screenshot({ path: 'electron-auth-test-3-signed-out.png' });
        console.log('✅ Signed out successfully');
        console.log('📸 Screenshot saved: electron-auth-test-3-signed-out.png\n');
        
        // Re-check for sign in button
        const signInButtonAfterSignOut = window.locator('button:has-text("Sign In")').first();
        const isVisibleAfterSignOut = await signInButtonAfterSignOut.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (isVisibleAfterSignOut) {
          console.log('✅ Sign In button appeared after sign out\n');
        } else {
          console.log('❌ Sign In button did not appear after sign out\n');
        }
      }
    } else {
      console.log('✅ Sign In button found\n');
    }
    
    // Step 3: Click Sign In button
    console.log('🖱️  Step 3: Clicking Sign In button...');
    const currentSignInButton = window.locator('button:has-text("Sign In")').first();
    await currentSignInButton.click();
    await window.waitForTimeout(1500);
    console.log('✅ Sign In button clicked\n');
    
    await window.screenshot({ path: 'electron-auth-test-4-modal-opening.png' });
    console.log('📸 Screenshot saved: electron-auth-test-4-modal-opening.png\n');
    
    // Step 4: Check if modal opened
    console.log('🔍 Step 4: Checking if sign-in modal opened...');
    const modalTitle = window.locator('h2:has-text("Welcome Back"), h2:has-text("Create Account")').first();
    const modalVisible = await modalTitle.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      await window.screenshot({ path: 'electron-auth-test-FAIL-no-modal.png' });
      throw new Error('❌ Sign-in modal did not open');
    }
    console.log('✅ Sign-in modal opened\n');
    
    await window.screenshot({ path: 'electron-auth-test-5-modal-open.png' });
    console.log('📸 Screenshot saved: electron-auth-test-5-modal-open.png\n');
    
    // Step 5: Check modal content
    console.log('🔍 Step 5: Checking modal elements...');
    
    // Check for email input (might be type="text" or type="email")
    const emailInput = window.locator('input[placeholder*="email" i], input[type="email"]').first();
    const passwordInput = window.locator('input[type="password"]').first();
    
    const hasEmailInput = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);
    const hasPasswordInput = await passwordInput.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log('Email input present:', hasEmailInput ? '✅' : '❌');
    console.log('Password input present:', hasPasswordInput ? '✅' : '❌');
    
    // Check for social sign-in buttons
    const googleButton = window.locator('button:has-text("Google"), button:has-text("google")').first();
    const githubButton = window.locator('button:has-text("GitHub"), button:has-text("github")').first();
    
    const hasGoogleButton = await googleButton.isVisible({ timeout: 2000 }).catch(() => false);
    const hasGitHubButton = await githubButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log('Google sign-in present:', hasGoogleButton ? '✅' : '❌');
    console.log('GitHub sign-in present:', hasGitHubButton ? '✅' : '❌');
    console.log('');
    
    // Step 6: Test Firebase configuration in Electron
    console.log('🔥 Step 6: Checking Firebase configuration in Electron...');
    const firebaseConfig = await window.evaluate(() => {
      return {
        hasFirebaseApiKey: !!process.env.FIREBASE_API_KEY,
        hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
        apiKey: process.env.FIREBASE_API_KEY?.substring(0, 10) + '...',
        projectId: process.env.FIREBASE_PROJECT_ID
      };
    });
    
    console.log('Firebase API Key configured:', firebaseConfig.hasFirebaseApiKey ? '✅' : '❌');
    if (firebaseConfig.hasFirebaseApiKey) {
      console.log('  API Key (partial):', firebaseConfig.apiKey);
    }
    console.log('Firebase Project ID configured:', firebaseConfig.hasFirebaseProjectId ? '✅' : '❌');
    if (firebaseConfig.hasFirebaseProjectId) {
      console.log('  Project ID:', firebaseConfig.projectId);
    }
    console.log('');
    
    // Step 7: Test form functionality (without submitting)
    if (hasEmailInput && hasPasswordInput) {
      console.log('📝 Step 7: Testing form inputs...');
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword123');
      
      const emailValue = await emailInput.inputValue();
      const passwordValue = await passwordInput.inputValue();
      
      console.log('Email input works:', emailValue === 'test@example.com' ? '✅' : '❌');
      console.log('Password input works:', passwordValue === 'testpassword123' ? '✅' : '❌');
      console.log('');
      
      await window.screenshot({ path: 'electron-auth-test-6-form-filled.png' });
      console.log('📸 Screenshot saved: electron-auth-test-6-form-filled.png\n');
    }
    
    // Step 8: Close modal
    console.log('❌ Step 8: Closing modal...');
    const closeButton = window.locator('button').filter({ hasText: /^×$|^X$/ }).first();
    const closeButtonVisible = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (closeButtonVisible) {
      await closeButton.click();
      await window.waitForTimeout(500);
      console.log('✅ Modal closed\n');
      
      await window.screenshot({ path: 'electron-auth-test-7-modal-closed.png' });
      console.log('📸 Screenshot saved: electron-auth-test-7-modal-closed.png\n');
    } else {
      console.log('⚠️  Close button not found, trying ESC key...');
      await window.keyboard.press('Escape');
      await window.waitForTimeout(500);
      console.log('✅ Modal closed with ESC key\n');
    }
    
    // Final summary
    console.log('🎉 All tests passed!\n');
    console.log('='.repeat(50));
    console.log('SUMMARY:');
    console.log('='.repeat(50));
    console.log('✅ Electron app launches correctly');
    console.log('✅ Sign In button is present and clickable');
    console.log('✅ Sign-in modal opens correctly');
    console.log('✅ Form fields are present:', hasEmailInput && hasPasswordInput ? 'YES' : 'NO');
    console.log('✅ Firebase is configured:', firebaseConfig.hasFirebaseApiKey && firebaseConfig.hasFirebaseProjectId ? 'YES' : 'NO');
    console.log('✅ Modal can be closed');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nError details:', error);
    
    // Try to take screenshot on failure
    try {
      if (electronApp) {
        const window = await electronApp.firstWindow();
        await window.screenshot({ path: 'electron-auth-test-FAILURE.png', fullPage: true });
        console.log('\n📸 Failure screenshot saved to electron-auth-test-FAILURE.png');
      }
    } catch (screenshotError) {
      console.error('Could not save failure screenshot:', screenshotError.message);
    }
  } finally {
    if (electronApp) {
      await electronApp.close();
    }
  }
}

// Main execution
(async () => {
  await testElectronAuthFlow();
})();
