# DivYield Mobile (Android React Native Expo)

Fast, lightweight native mobile portfolio & dividend tracker for Trading 212, designed with **Material Design 3** for Android.

## Features

- **Material Design 3 Native UI**: Android-optimized typography, elevation, ripple feedback, bottom navigation bar, and top app bar.
- **On-Device SQLite**: Local database powered by `expo-sqlite` storing holdings, order history, cash transactions, and dividend events directly on your phone.
- **Hardware-Backed Encryption**: Trading 212 API credentials encrypted in Android Keystore via `expo-secure-store`.
- **Live Sync Progress Bar**: Multi-step animated progress bar displaying real-time synchronization stages.
- **Strict Read-Only Guarantee**: Communicates directly with Trading 212's read-only endpoints; orders and execution capabilities are completely absent.
- **5 Core Views**:
  - **Overview (Dashboard)**: Total portfolio value, PnL return indicators, metric cards, monthly dividend bar chart, recent payouts.
  - **Holdings**: Searchable and sortable holdings list with stock logos, average cost, current price, and unrealized gain/loss badges.
  - **Calendar**: Interactive 31-day visual monthly dividend calendar with bottom-sheet payout inspector.
  - **Analytics**: Diversification score (0–100), HHI concentration index, and top income-producing stock ranking.
  - **Settings**: Trading 212 API key configuration, connection testing, read-only permissions guide, and database controls.

## Development & Run Commands

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android emulator / device
npx expo start --android

# Typecheck with TypeScript
npx tsc --noEmit

# Export standalone Android bundle
npx expo export --platform android
```
