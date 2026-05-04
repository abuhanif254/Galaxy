import { create } from 'zustand';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserProfile {
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: number;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Sync user profile
      const userDocRef = doc(db, 'users', result.user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const newProfile = {
            displayName: result.user.displayName || 'Anonymous',
            username: result.user.email?.split('@')[0] || `user_${result.user.uid.slice(0, 5)}`,
            avatarUrl: result.user.photoURL || '',
            bio: '',
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newProfile);
          // Also set private info
          await setDoc(doc(db, `users/${result.user.uid}/private/info`), {
            email: result.user.email,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${result.user.uid}`);
      }
    } catch (error) {
      console.error("Sign-in failed:", error);
    }
  },
  logOut: async () => {
    await signOut(auth);
  }
}));

if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const userDoc = await getDoc(userDocRef);
        useAuthStore.setState({ user, profile: userDoc.exists() ? userDoc.data() as UserProfile : null, loading: false });
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        useAuthStore.setState({ user, profile: null, loading: false });
      }
    } else {
      useAuthStore.setState({ user: null, profile: null, loading: false });
    }
  });
}
