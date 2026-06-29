import { useState, useEffect } from "react";
import { Alert } from "../types";

import { db } from "../firebase";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
} from "firebase/firestore";

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const alertsQuery = query(
      collection(db, "alerts"),
      orderBy("timestamp", "desc"),
      limit(3)
    );

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => doc.data() as Alert
        );

        setAlerts(data);
      },
      (error) => {
        console.error("Firestore Error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) =>
      prev.filter((alert) => alert.id !== id)
    );
  };

  return {
    alerts,
    dismissAlert
  };
};