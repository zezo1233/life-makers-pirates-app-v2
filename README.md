# Life Makers Pirates Training Management System

A comprehensive mobile training management system built with React Native and Expo, designed specifically for Life Makers Pirates training programs.

## 🚀 Features

### Core Features
- **Interactive Calendar System** with role-based views and drag-and-drop scheduling
- **7-Stage Training Request Workflow** with sequential approval process
- **Real-time Chat System** with direct messaging and group chats
- **User Profile Management** with role-based access control
- **Bilingual Support** (Arabic RTL + English LTR)
- **Push Notifications** for real-time updates

### User Roles Hierarchy
1. **Provincial Development Officer (DV)** - مسؤول تنمية المحافظة
2. **Development Management Officer (CC)** - مسؤول إدارة التنمية
3. **Trainer Preparation Project Manager (PM)** - مسؤول مشروع إعداد المدربين
4. **Program Supervisors (SV)** - المتابعون
5. **Trainers (TR)** - المدربون
6. **Board Member (MB)** - عضو مجلس الإدارة

## 🛠 Tech Stack

### Frontend
- **React Native** with Expo (managed workflow)
- **TypeScript** for type safety
- **Zustand** for state management
- **React Navigation v6** for navigation
- **React Native Calendars** for calendar functionality
- **NativeWind/TailwindCSS** for styling
- **React i18next** for internationalization

### Backend & Database
- **Supabase** (PostgreSQL with Row Level Security)
- **Supabase Auth** with email OTP + custom roles
- **Supabase Realtime** for WebSocket connections
- **Supabase Storage** for file management

### Additional Features
- **SQLite + MMKV** for offline support
- **Expo Notifications** for push notifications
- **Hugging Face AI** integration via Google Colab
- **Jest + React Native Testing Library** for testing

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Android Studio (for Android development)
- Xcode (for iOS development - macOS only)
- Supabase account

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/zezo1233/life-makers-pirates-training.git
cd life-makers-pirates-training
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://dkijutqfdhaviyymulvs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraWp1dHFmZGhhdml5eW11bHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTI5MTIsImV4cCI6MjA2NTAyODkxMn0.822_M3TXP6RZWBf0YtZHh9jtFhlUojSj5UozM2ty2Kc
```

### 4. Test Users

You can test the application with these pre-configured users:

| Role | Email | Password | Name |
|------|-------|----------|------|
| DV | dv@lifemakers.com | password123 | fares ahmed |
| PM | pm@lifemakers.com | password123 | زياد محمد زكي عبدالحميد |
| TR | tr1@lifemakers.com | password123 | ابراهيم رجب محمد زيدان |

### 5. Run the Application

#### Development
```bash
# Start the Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on Web
npm run web
```

#### Production Build
```bash
# Build for Android
expo build:android

# Build for iOS
expo build:ios
```

## 📱 App Structure

```
src/
├── components/          # Reusable UI components
├── config/             # Configuration files
│   └── supabase.ts     # Supabase client configuration
├── i18n/               # Internationalization
│   ├── index.ts        # i18n configuration
│   └── locales/        # Translation files
├── navigation/         # Navigation configuration
├── screens/            # Screen components
│   ├── auth/           # Authentication screens
│   ├── calendar/       # Calendar screens
│   ├── chat/           # Chat screens
│   ├── main/           # Main app screens
│   └── profile/        # Profile screens
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🔐 Authentication & Security

### Authentication Flow
1. Email/Password authentication via Supabase Auth
2. Email OTP verification
3. Role-based access control
4. JWT session management

### Security Features
- Row Level Security (RLS) policies in Supabase
- AES-256 encryption for sensitive data
- Role-based data access
- Secure file storage with Supabase Storage

## 📊 Database Schema

The application uses a PostgreSQL database with the following main tables:
- `users` - User profiles and roles
- `training_requests` - Training request management
- `approval_steps` - Approval workflow tracking
- `trainer_availability` - Trainer scheduling
- `calendar_events` - Calendar and event management
- `chat_rooms` & `chat_messages` - Real-time messaging
- `notifications` - Push notification management

## 🌐 Internationalization

The app supports:
- **Arabic (RTL)** - العربية
- **English (LTR)** - English

Language switching is available in the settings, with automatic detection of device locale.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Building for Production

### Android
```bash
# Generate APK
expo build:android -t apk

# Generate AAB (recommended for Play Store)
expo build:android -t app-bundle
```

### iOS
```bash
# Generate IPA
expo build:ios
```

## 🚀 Deployment

### Expo Application Services (EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for production
eas build --platform all
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core features
  - Authentication system
  - Calendar management
  - Training request workflow
  - Real-time chat
  - Bilingual support

## 🎯 Roadmap

### Phase 2 Features
- [ ] Advanced AI trainer recommendations
- [ ] Video call integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app store deployment
- [ ] Web admin panel
- [ ] Advanced reporting system

### Phase 3 Features
- [ ] Integration with external calendar systems
- [ ] Advanced notification system
- [ ] Multi-tenant support
- [ ] Advanced role permissions
- [ ] API for third-party integrations

---

**Built with ❤️ for Life Makers Pirates Training Program**
