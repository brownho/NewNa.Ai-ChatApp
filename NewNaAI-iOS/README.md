# NewNa.AI iOS App

Native iOS app for NewNa.AI chat application, built with React Native and Expo.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Expo CLI**: `npm install -g expo-cli`
3. **EAS CLI** (for building): `npm install -g eas-cli`
4. **Apple Developer Account** (for App Store deployment)
5. **Xcode** (for iOS development)

## Setup

1. Install dependencies:
```bash
cd NewNaAI-iOS
npm install
```

2. Configure your server URL in `src/config/constants.ts`:
```typescript
export const API_BASE_URL = 'http://your-server-url:3000';
```

## Development

### Running on iOS Simulator

```bash
npm run ios
```

### Running on Physical Device

1. Install Expo Go app on your iPhone
2. Run: `npm start`
3. Scan the QR code with Expo Go

## Building for App Store

### 1. Configure EAS

```bash
eas build:configure
```

### 2. Update app.json

Update the following in `app.json`:
- `expo.owner`: Your Expo username
- `expo.ios.bundleIdentifier`: Your unique bundle ID
- `expo.extra.eas.projectId`: Your EAS project ID

### 3. Build for iOS

```bash
# Development build
eas build --platform ios --profile development

# Preview build (for TestFlight)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

### 4. Submit to App Store

```bash
eas submit --platform ios
```

## App Features

- User authentication (login/register)
- Guest access with limited messages
- Real-time chat with Ollama models
- Model selection
- Markdown rendering with syntax highlighting
- Dark theme optimized for iOS
- Offline support (cached UI)
- Settings management
- Secure token storage

## Project Structure

```
NewNaAI-iOS/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── assets/                # Images and icons
├── src/
│   ├── screens/          # Screen components
│   ├── components/       # Reusable components
│   ├── services/         # API services
│   ├── contexts/         # React contexts
│   ├── config/           # Configuration
│   └── utils/            # Utility functions
```

## Configuration

### Server Requirements

The app expects your backend server to have:
- Authentication endpoints (`/api/auth/login`, `/api/auth/register`)
- Chat endpoints (`/api/chat`, `/api/guest/chat`)
- Model listing endpoint (`/api/models`)
- Session management endpoints

### Environment Variables

For production builds, you may want to use environment variables:

```bash
# .env
API_BASE_URL=https://api.newna.ai
```

## Testing

### Local Testing
1. Ensure your backend server is running
2. Update `API_BASE_URL` to your local IP (not localhost)
3. Run the app on simulator or device

### TestFlight Testing
1. Build with preview profile
2. Upload to App Store Connect
3. Distribute via TestFlight

## App Store Submission

### Required Assets
- App icon (1024x1024)
- Screenshots for different iPhone sizes
- App description
- Privacy policy URL
- Support URL

### App Store Guidelines
- Ensure compliance with Apple's guidelines
- Implement proper error handling
- Add offline functionality
- Include privacy policy for data collection

## Troubleshooting

### Common Issues

1. **Can't connect to server**
   - Check `API_BASE_URL` is correct
   - Ensure server allows connections from mobile
   - Check firewall settings

2. **Build failures**
   - Clear cache: `expo start -c`
   - Delete node_modules and reinstall
   - Update Expo SDK version

3. **Authentication issues**
   - Verify server CORS settings
   - Check token storage/retrieval
   - Ensure secure store is working

## Support

For issues or questions:
- GitHub: https://github.com/brownho/NewNa.Ai-ChatApp
- Email: stephen@newna.ai