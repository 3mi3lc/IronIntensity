# IronIntensity

![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![WatermelonDB](https://img.shields.io/badge/WatermelonDB-FF5A5F?logo=databricks&logoColor=white)

**IronIntensity** is a **fitness tracking mobile app** built with **React Native (Expo)**, **TypeScript**, **Supabase**, and **WatermelonDB**.  
It allows users to log workouts, track exercises, monitor progress, and sync data seamlessly between offline and online storage.

---

## ✨ Features

- **User Authentication** – Secure login with Supabase Auth.
- **Workout Management** – Create, edit, and log workouts and exercises.
- **Exercise Sets** – Record sets, reps, and weights.
- **Statistics Dashboard** – Visualize progress with interactive stats.
- **Offline-First Sync** – WatermelonDB stores data locally and syncs with Supabase.
- **Clean UI** – Styled using **Tailwind CSS (NativeWind)**.
- **Diagrams & Documentation** – UML diagrams (state & use-case) for architecture.

---

## 📂 Project Structure

```plaintext
app/                  # Main app screens and layouts
  (tabs)/             # Tabbed screens (Logging, Profile, Statistics)
  auth/               # Authentication screens (login, etc.)
  _layout.tsx         # App layout configuration
  index.tsx           # Main entry screen
  globals.css         # Global styles
assets/               # Fonts, icons, and images
components/           # Reusable UI components
constants/            # App-wide constants (icons, etc.)
docs/diagrams/        # UML diagrams (state, use-case)
model/                # WatermelonDB models, schema, migrations
repositories/         # Data layer for accessing workouts, exercises, etc.
services/             # Business logic / API services
supabase/             # Supabase configs
utils/                # Utility files (e.g., supabase.ts)
.env.local            # Environment variables
tailwind.config.js    # Tailwind / NativeWind config
tsconfig.json         # TypeScript configuration
```
---

## 🛠 Tech Stack

- **Frontend:** React Native (Expo) + TypeScript
- **Database:** WatermelonDB (offline-first) + Supabase (Postgres)
- **Styling:** Tailwind CSS via NativeWind
- **Authentication:** Supabase Auth
- **Documentation:** PlantUML diagrams for state & use cases

---

## 🗄 Database Schema

### Backend (Supabase)
- `users` – User profiles
- `workouts` – Workout sessions
- `exercises` – Exercises per user
- `workout_exercises` – Links workouts & exercises
- `workout_exercise_sets` – Sets with reps & weights

### Local (WatermelonDB)
Mirrors this structure for offline syncing.

---

## 🚀 Getting Started

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