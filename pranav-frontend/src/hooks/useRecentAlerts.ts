import { useEffect, useState } from "react";
import { Alert } from "../types";

import { db } from "../firebase";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
} from "firebase/firestore";

export const useRecentAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const alertsQuery = query(
      collection(db, "alerts"),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        const data = snapshot.docs.map(
          doc => doc.data() as Alert
        );

        setAlerts(data);
      }
    );

    return () => unsubscribe();
  }, []);

  return { alerts };
};