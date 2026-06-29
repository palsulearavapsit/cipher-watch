import { useState, useEffect } from "react";
import { WalletActivity } from "../types";

import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export const useWalletActivity = () => {
  const [activity, setActivity] = useState<WalletActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "walletActivity"),
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => doc.data() as WalletActivity
        );

        setActivity(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { activity, loading };
};