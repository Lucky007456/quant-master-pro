import { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

// Internal password used for the username-only system
const INTERNAL_PWD = "quant_master_pass_2024";
const googleProvider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for redirect result on page load (for mobile Google Sign-In)
    getRedirectResult(auth).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithUsername = async (username) => {
    const email = `${username.toLowerCase().trim()}@quantmaster.com`;
    try {
      // Try to login
      const cred = await signInWithEmailAndPassword(auth, email, INTERNAL_PWD);
      return cred.user;
    } catch (err) {
      // If user doesn't exist, create account automatically
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        const cred = await createUserWithEmailAndPassword(auth, email, INTERNAL_PWD);
        await updateProfile(cred.user, { displayName: username });
        return cred.user;
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Try popup first (works on desktop)
      return await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // If popup blocked (common on mobile), fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        return signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  return { user, loading, loginWithUsername, loginWithGoogle, logout };
}
