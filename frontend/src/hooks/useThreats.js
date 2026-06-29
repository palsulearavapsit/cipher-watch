import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, onSnapshot } from "firebase/firestore";

export function useThreats(maxItems = 100) {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple collection scan — sort client-side to avoid needing a Firestore index
    const unsub = onSnapshot(
      collection(db, "threats"),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort by timestamp descending, newest first
        all.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
        setThreats(all.slice(0, maxItems));
        setLoading(false);
      },
      (err) => {
        console.error("Firestore threats error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [maxItems]);

  return { threats, loading };
}
