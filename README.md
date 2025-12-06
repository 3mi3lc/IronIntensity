# IronIntensity

![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white) ![React Native](https://img.shields.io/badge/React%20Native-61DAFB?logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white) ![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-4CAF50?logo=database&logoColor=white)

IronIntensity is a fitness tracking mobile app built with React Native (Expo), TypeScript, Supabase, and Drizzle ORM. It allows users to log workouts, track exercises, monitor progress, and sync data seamlessly between offline and online storage.

## ✨ Features

* **User Authentication** – Secure login with Supabase Auth.
* **Workout Management** – Create, edit, and log workouts and exercises.
* **Exercise Sets** – Record sets, reps, and weights.
* **Statistics Dashboard** – Visualize progress with interactive stats.
* **Offline-First Sync** – Local SQLite storage with Drizzle ORM, synced to Supabase.
* **Clean UI** – Styled using Tailwind CSS (NativeWind).
* **Modern Architecture** – Modular repositories, hooks, and services for maintainability.

## 📱 Download the App

You can download the latest release of IronIntensity directly from the [Releases](https://github.com/3mi3lc/IronIntensity/releases) page.

⚠️ **Note**: This is an Expo-managed app. If you're installing the `.apk` or `.ipa` file, make sure your device allows installation from unknown sources (for Android) or is set up for sideloading (for iOS).

## 📂 Project Structure

```plaintext
app/                  # Main app screens and layouts
  (tabs)/             # Tabbed screens (Logging, Profile, Statistics)
  auth/               # Authentication screens (login, etc.)
  workout/            # Workout-related screens (create, edit, view, etc.)
  exercise/           # Exercise creation and selection
  _layout.tsx         # App layout configuration
  index.tsx           # Main entry screen
  globals.css         # Global styles
assets/               # Fonts, icons, and images
components/           # Reusable UI components
constants/            # App-wide constants (icons, etc.)
db/                   # Local SQLite DB setup and schema
repositories/         # Data layer for accessing workouts, exercises, etc.
services/             # Business logic / API services (e.g., syncService)
contexts/             # React Contexts (e.g., UserContext)
hooks/                # Shared logic hooks (e.g., useWorkoutLogic)
utils/                # Utility files (e.g., newId, now, supabase client)
.env.local            # Environment variables
tailwind.config.js    # Tailwind / NativeWind config
tsconfig.json         # TypeScript configuration
```

## 🛠 Tech Stack

* **Frontend**: React Native (Expo) + TypeScript
* **Database**: SQLite (via `expo-sqlite`) + Drizzle ORM for local storage
* **Backend**: Supabase (Postgres + Auth + Realtime)
* **Syncing**: Custom sync service (`syncService.ts`) for bidirectional sync
* **Styling**: Tailwind CSS via NativeWind
* **Navigation**: Expo Router (file-based routing)

## 🗄 Database Schema (Local & Remote)

### Core Tables

* `users` – User profiles
* `exercises` – User-created exercises
* `workouts` – Workout sessions
* `workout_exercises` – Links workouts and exercises
* `workout_exercise_sets` – Individual sets with reps and weights
* `body_parts` – Static list of muscle groups
* `exercise_body_parts` – Many-to-many join between exercises and body parts

## 🚀 Getting Started (Development)

### 1. Clone and Install

```bash
git clone https://github.com/3mi3lc/IronIntensity.git
cd IronIntensity
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```ini
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start the app

```bash
npx expo start
```