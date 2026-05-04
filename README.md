# Circled

Circled is a modern, real-time social media application built with Next.js, Firebase, and Tailwind CSS. It features a polished, fluid user interface inspired by native iOS apps, utilizing Framer Motion for buttery-smooth animations and transitions.

## 🌟 Key Features

- **Fluid UI & Animations:** Seamless page transitions and bouncy micro-interactions (e.g., double-tap to like with a pop effect).
- **Real-Time Chat & Messaging:** Connect directly with friends using instant messaging powered by Firestore.
- **Masonry Profile Grid:** A high-end, visually dynamic profile layout that respects original photo aspect ratios.
- **Nested Comments & Mentions:** Threaded replies and `@username` tagging that trigger real-time alerts.
- **Circles (Groups):** Create or join specialized groups and share content with specific communities.
- **Instant Notifications:** Stay up-to-date with alerts for likes, friend requests, event invites, and mentions.

## 🛠 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend:** [Firebase](https://firebase.google.com/) (Firestore database, Firebase Authentication)
- **Animations:** [Motion](https://motion.dev/) (Framer Motion)
- **Icons:** [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   Using the AI Studio platform? Ensure your project is integrated via the `set_up_firebase` tool or ensure your configurations are correctly populated in `firebase-applet-config.json`.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to explore the app.

## 📂 Project Structure

- `app/`: Core route entry and layout definitions (Next.js App Router).
- `app/components/`: Modular UI units including `Feed`, `PostCard`, `Messages`, `Profile`, and `Groups`.
- `lib/`: Configuration logic for the Firebase client (`firebase.ts`) and global state management (`auth-store.ts`).
- `firestore.rules`: Comprehensive, secure access control rules restricting interactions based on zero-trust principles.

## 🔐 Security & Access

The Firestore configuration utilizes **Attribute-Based Access Control (ABAC)**. Read, write, schema validations, and relational logic checks are executed directly at the database level to ensure that state manipulation is strongly guarded against anomalies or unauthorized exploitation.
