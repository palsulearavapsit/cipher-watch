import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const triggerLockdown = () => {
    setIsLocked(true);
  };

  const unlockSystem = (passphrase) => {
    if (passphrase === "cipherlock2026") {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  useEffect(() => {
    // 1. Check local storage first (for local fallback / remember me session)
    const localUser = localStorage.getItem("cw_auth_user");
    if (localUser) {
      try {
        setUser(JSON.parse(localUser));
        setLoading(false);
        // Continue monitoring Firebase Auth in the background but allow instant render
      } catch (e) {
        localStorage.removeItem("cw_auth_user");
      }
    }

    // 2. Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const u = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split("@")[0],
          isDemo: firebaseUser.email === "demo@cipherwatch.ai",
        };
        setUser(u);
        // Sync local storage if remember me or demo user is active
        localStorage.setItem("cw_auth_user", JSON.stringify(u));
      } else {
        // Only clear if we don't have a local fallback active, or if Firebase explicitly reports signed out
        // and we are not using the offline local fallback.
        const cached = localStorage.getItem("cw_auth_user");
        if (cached) {
          const cachedUser = JSON.parse(cached);
          // If the cached user is a mock local-only user (e.g. uid: "demo-user-id"), keep it
          if (cachedUser.uid === "demo-user-id") {
            setUser(cachedUser);
            setLoading(false);
            return;
          }
        }
        setUser(null);
        localStorage.removeItem("cw_auth_user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const u = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email.split("@")[0],
        isDemo: firebaseUser.email === "demo@cipherwatch.ai",
      };
      setUser(u);
      localStorage.setItem("cw_auth_user", JSON.stringify(u));
      return u;
    } catch (error) {
      // If it is the demo user credentials or if Firebase returns configuration-not-found,
      // fallback to mock local session.
      if (
        (email === "demo@cipherwatch.ai" && password === "cipherwatch2026") ||
        error.code === "auth/configuration-not-found"
      ) {
        const u = {
          uid: "demo-user-id",
          email: email,
          displayName: email.split("@")[0],
          isDemo: email === "demo@cipherwatch.ai",
        };
        setUser(u);
        localStorage.setItem("cw_auth_user", JSON.stringify(u));
        return u;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, displayName) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName });
      const u = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName,
        isDemo: false,
      };
      setUser(u);
      localStorage.setItem("cw_auth_user", JSON.stringify(u));
      return u;
    } catch (error) {
      if (error.code === "auth/configuration-not-found") {
        const u = {
          uid: "local-user-" + Math.random().toString(36).substr(2, 9),
          email: email,
          displayName: displayName,
          isDemo: false,
        };
        setUser(u);
        localStorage.setItem("cw_auth_user", JSON.stringify(u));
        return u;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signout error:", e);
    }
    setUser(null);
    localStorage.removeItem("cw_auth_user");
    setLoading(false);
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      if (error.code === "auth/configuration-not-found") {
        console.warn("Firebase Auth unconfigured for password reset. Simulating success.");
        return;
      }
      throw error;
    }
  };

  const loginDemo = async () => {
    return login("demo@cipherwatch.ai", "cipherwatch2026", true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        resetPassword,
        loginDemo,
        isLocked,
        triggerLockdown,
        unlockSystem,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
