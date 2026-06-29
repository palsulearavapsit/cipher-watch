import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, onSnapshot } from "firebase/firestore";

export function useWalletActivity(maxItems = 50) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "walletActivity"),
      (snap) => {
        setActivity(snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, maxItems));
        setLoading(false);
      },
      (err) => {
        console.error("Firestore walletActivity error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [maxItems]);

  return { activity, loading };
}
