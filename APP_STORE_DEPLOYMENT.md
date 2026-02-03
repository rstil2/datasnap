# DataSnap - Apple App Store Deployment Guide

## 🍎 App Store Deployment Checklist

### Prerequisites

1. **Apple Developer Account**
   - Enroll in Apple Developer Program ($99/year)
   - Create App ID: `com.datasnap.app`
   - Configure App Store Connect listing

2. **Code Signing Certificates**
   - Download "Mac App Distribution" certificate from Apple Developer
   - Install in Keychain Access
   - Configure electron-builder to use certificate

3. **App Store Connect Setup**
   - Create new app in App Store Connect
   - Configure app metadata, screenshots, descriptions
   - Set pricing and availability

### Build Configuration

#### 1. Update Package.json
```bash
# Build for Mac App Store
npm run electron:build:mas

# Or create distribution build
npm run electron:dist:mas
```

#### 2. Code Signing

The app uses entitlements configured for App Store:
- **Sandbox enabled**: Required for App Store
- **Network access**: Allowed for API calls
- **File access**: User-selected and Downloads folder

#### 3. Entitlements

Three entitlement files are configured:
- `build/entitlements.mac.plist` - For direct distribution (DMG)
- `build/entitlements.mas.plist` - For App Store (sandboxed)
- `build/entitlements.mas.inherit.plist` - Inherited entitlements

### API Configuration for Electron

The app is configured to use:
1. **Bundled Backend** (default): Local Python backend runs on `http://localhost:8000`
2. **Remote API** (optional): Set `VITE_API_URL` environment variable

#### For App Store:
- Backend is bundled with the app in `extraResources`
- Backend starts automatically when app launches
- API calls use `http://localhost:8000` (Electron detects environment)

### Building for App Store

#### Step 1: Clean Build
```bash
cd frontend
rm -rf dist release node_modules/.cache
npm install
```

#### Step 2: Build Production Bundle
```bash
npm run build:prod
```

#### Step 3: Build Mac App Store Package
```bash
npm run electron:build:mas
```

This creates:
- `release/mas/DataSnap-1.0.0.pkg` - App Store package

#### Step 4: Validate Package
```bash
xcrun altool --validate-app \
  --file release/mas/DataSnap-1.0.0.pkg \
  --type macos \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

#### Step 5: Upload to App Store
```bash
xcrun altool --upload-app \
  --file release/mas/DataSnap-1.0.0.pkg \
  --type macos \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

Or upload via App Store Connect web interface.

### Environment Variables

For App Store builds, set these in your build environment:

```bash
# Required for code signing
CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
CSC_LINK="path/to/certificate.p12"
CSC_KEY_PASSWORD="certificate_password"

# Optional: Use remote API instead of bundled backend
VITE_API_URL="https://api.datasnap.io"
```

### Backend Bundling

The Python backend is bundled with the Electron app:
- Backend files are included in `extraResources`
- Python runtime must be bundled separately (PyInstaller or similar)
- Or use a remote API server

**Option 1: Bundle Python Runtime**
- Use PyInstaller to create standalone executable
- Include in `extraResources`
- Start from Electron main process

**Option 2: Remote API** (Recommended for App Store)
- Deploy backend to cloud (AWS, GCP, Azure)
- Update `VITE_API_URL` to point to production API
- Removes need to bundle Python

### App Store Requirements

✅ **Sandbox Compliance**
- App is configured with App Sandbox entitlements
- Network access for API calls
- File access for user-selected files only

✅ **Privacy**
- No camera/microphone access requested
- No location tracking
- User data handled securely

✅ **Notarization**
- Required for macOS 10.15+
- Handled automatically by electron-builder
- Requires valid Apple Developer certificate

✅ **Code Signing**
- App signed with "Mac App Distribution" certificate
- Entitlements properly configured
- Hardened Runtime enabled (for DMG, disabled for MAS)

### Testing App Store Build

1. **Test Sandbox Behavior**
   ```bash
   # Build MAS target
   npm run electron:build:mas
   
   # Install and test
   sudo installer -pkg release/mas/DataSnap-1.0.0.pkg -target /
   ```

2. **Test API Connectivity**
   - Verify backend starts correctly
   - Test file upload functionality
   - Verify authentication flow

3. **Test StoreKit Integration**
   - Verify in-app purchases work
   - Test purchase restoration
   - Verify subscription management

### Common Issues

#### Issue: "App is damaged" on first launch
**Solution**: Users need to remove quarantine attribute:
```bash
xattr -cr /Applications/DataSnap.app
```

#### Issue: Backend not starting
**Solution**: 
- Ensure Python is bundled correctly
- Check file permissions in `extraResources`
- Verify backend path in Electron main process

#### Issue: Network requests failing
**Solution**:
- Verify entitlements allow network client access
- Check firewall settings
- Verify API URL configuration

### Version Management

Update version in:
1. `package.json` - `version` field
2. `electron-builder.json` - No version needed (uses package.json)
3. App Store Connect - Submit new version

### Distribution Options

**Mac App Store (MAS)**
- Sandboxed, Apple-approved
- Automatic updates via App Store
- Requires Apple Developer account

**Direct Distribution (DMG)**
- Not sandboxed
- Manual distribution
- Better for enterprise/internal use

Build both:
```bash
npm run electron:build  # Builds both MAS and DMG
```

---

## 📝 Submission Checklist

Before submitting to App Store:

- [ ] Version number updated in package.json
- [ ] Build number incremented
- [ ] Screenshots prepared (1280x800 minimum)
- [ ] App description and metadata ready
- [ ] Privacy policy URL provided
- [ ] Support URL configured
- [ ] App tested on macOS 10.15+ and 11.0+
- [ ] Code signed and notarized
- [ ] MAS build validated
- [ ] All entitlements verified
- [ ] Backend functionality tested
- [ ] StoreKit purchases tested

---

**Ready for App Store submission!** 🚀

