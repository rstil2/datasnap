# Firebase Manual Setup for DataSnap

Since the CLI project creation has permission restrictions, let's set up Firebase manually through the web console. This is actually easier for beginners!

## Step 1: Create Firebase Project (Via Web Console)

1. **Go to Firebase Console**: Open https://console.firebase.google.com/
2. **Click "Create a project"**
3. **Enter project details**:
   - Project name: `DataSnap Community`
   - Project ID: `datasnap-community` (or accept the auto-generated one)
   - Click "Continue"
4. **Google Analytics**: Choose "Enable" (recommended) or "Not now"
   - If enabled, select your Google Analytics account
   - Click "Create project"
5. **Wait for project creation** (takes about 30 seconds)
6. **Click "Continue"** when ready

## Step 2: Enable Authentication

1. **In your Firebase project console, click "Authentication"**
2. **Click "Get started"**
3. **Go to "Sign-in method" tab**
4. **Enable Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable" 
   - Click "Save"
5. **Enable Google Sign-in**:
   - Click on "Google"
   - Toggle "Enable"
   - Enter project support email: `craig.stillwell@gmail.com`
   - Click "Save"

## Step 3: Create Firestore Database

1. **In Firebase console, click "Firestore Database"**
2. **Click "Create database"**
3. **Choose security rules**: Select "Start in test mode"
   - This allows read/write access for 30 days (we'll secure it later)
4. **Select location**: Choose the closest to your users
   - Recommended: `us-central1` (Iowa) for North America
5. **Click "Done"**

## Step 4: Get Firebase Configuration

1. **In Firebase console, click the gear icon ⚙️ next to "Project Overview"**
2. **Select "Project settings"**
3. **Scroll down to "Your apps" section**
4. **Click the web icon `</>`** to add a web app
5. **Enter app details**:
   - App nickname: `DataSnap Web App`
   - Don't check Firebase Hosting for now
   - Click "Register app"
6. **Copy the Firebase configuration** - you'll see something like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "datasnap-community.firebaseapp.com",
     projectId: "datasnap-community",
     storageBucket: "datasnap-community.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890123456"
   };
   ```
7. **Save these values** - you'll need them in the next step

## Step 5: Update Environment Variables

Once you have your Firebase config, I'll help you update the environment files with the real values.

**After completing Steps 1-4 above, come back here and provide me with your Firebase configuration values, and I'll update the environment files for you.**

## Next Steps

After manual setup is complete, we'll:
1. Update your environment variables with real Firebase config
2. Initialize Firebase in your project
3. Test the authentication and real-time features
4. Deploy Firestore security rules

**Please complete Steps 1-4 above and then provide me with your Firebase configuration values!**