import { useState, useEffect } from "react";
import { Threat } from "../types";

import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export const useThreats = () => {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "threats"),
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => doc.data() as Threat
        );

        setThreats(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { threats, loading };
};