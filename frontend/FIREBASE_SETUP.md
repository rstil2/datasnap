# Firebase Setup Guide for DataSnap

This guide will help you set up Firebase for DataSnap's community features, including real-time story sharing, user authentication, and cloud storage.

## Prerequisites

1. A Google account
2. Node.js and npm installed
3. DataSnap development environment set up

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., `datasnap-dev` for development, `datasnap-prod` for production)
4. Enable Google Analytics (optional but recommended)
5. Choose or create a Google Analytics account
6. Click "Create project"

## Step 2: Set up Authentication

1. In your Firebase project console, go to **Authentication** > **Get started**
2. Go to the **Sign-in method** tab
3. Enable the following sign-in providers:
   - **Email/Password**: Click and toggle "Enable"
   - **Google**: Click, toggle "Enable", and configure:
     - Project support email: Your email
     - Click "Save"
   - **GitHub** (optional): Click, toggle "Enable", and configure:
     - Client ID: Get from GitHub OAuth app
     - Client secret: Get from GitHub OAuth app
     - Click "Save"

## Step 3: Set up Firestore Database

1. In the Firebase console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development) or **Start in production mode** (for production)
4. Select a location for your database (choose the one closest to your users)
5. Click **Done**

### Firestore Security Rules

For development, you can start with test rules, but for production, update the rules:

```javascript
// Development rules (for testing)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2024, 12, 31);
    }
  }
}

// Production rules (more secure)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Stories collection
    match /stories/{storyId} {
      allow read: if true; // Public stories can be read by anyone
      allow create: if request.auth != null && request.auth.uid == resource.data.authorId;
      allow update: if request.auth != null && request.auth.uid == resource.data.authorId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    // Story likes collection
    match /story_likes/{likeId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == resource.data.userId;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Other collections
    match /story_views/{viewId} {
      allow read, write: if true; // Views can be public
    }
    
    match /story_comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
  }
}
```

## Step 4: Get Firebase Configuration

1. In the Firebase console, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to the "Your apps" section
4. Click **Add app** and select the **Web** platform `</>`
5. Enter your app nickname (e.g., "DataSnap Web App")
6. Check "Also set up Firebase Hosting" if you plan to use Firebase Hosting
7. Click **Register app**
8. Copy the Firebase configuration object

## Step 5: Configure Environment Variables

1. Open your `.env.development` file
2. Replace the Firebase placeholder values with your actual configuration:

```env
# Firebase Configuration (Development)
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_USE_EMULATORS=false
```

3. For production, update `.env.production` with your production Firebase project credentials

## Step 6: Set up Firebase Emulators (Optional for Development)

For local development without connecting to live Firebase services:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select "Emulators" and "Firestore"
   - Choose your Firebase project
   - Use default settings for Firestore rules and indexes
   - Choose ports for emulators (default: Auth 9099, Firestore 8080)

4. Update your `.env.development`:
   ```env
   VITE_FIREBASE_USE_EMULATORS=true
   ```

5. Start emulators:
   ```bash
   firebase emulators:start --only auth,firestore
   ```

## Step 7: Test Firebase Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app and test:
   - Sign in with email/password or Google
   - Publish a story to the community
   - Like and view stories
   - Check that real-time updates work across different browser windows

## Step 8: Deploy to Production

### Option 1: Firebase Hosting

1. Build your app:
   ```bash
   npm run build:prod
   ```

2. Initialize Firebase Hosting:
   ```bash
   firebase init hosting
   ```

3. Deploy:
   ```bash
   firebase deploy
   ```

### Option 2: Other Hosting Providers

1. Build your app with production environment:
   ```bash
   npm run build:prod
   ```

2. Deploy the `dist` folder to your hosting provider
3. Make sure to configure environment variables on your hosting platform

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your domain is added to Firebase Authentication's authorized domains
2. **Permission Denied**: Check your Firestore security rules
3. **Network Errors**: Verify your Firebase configuration and API keys
4. **Build Errors**: Ensure all Firebase environment variables are set

### Debugging Tips

1. Check the browser console for detailed error messages
2. Use Firebase console to monitor database activity
3. Enable debug mode in development:
   ```env
   VITE_DEVELOPMENT_MODE=true
   ```

## Security Considerations

1. **Never expose Firebase config in client code** - The config object is safe to expose as it only contains project identifiers
2. **Use proper Firestore security rules** - Don't leave your database in test mode for production
3. **Implement proper authentication checks** - Verify user permissions on both client and server side
4. **Monitor usage** - Set up billing alerts and usage monitoring

## Next Steps

- Set up Firebase Analytics for user behavior insights
- Configure Firebase Cloud Functions for server-side logic
- Set up Firebase Storage for file uploads
- Implement push notifications with Firebase Cloud Messaging

For more information, visit the [Firebase Documentation](https://firebase.google.com/docs).