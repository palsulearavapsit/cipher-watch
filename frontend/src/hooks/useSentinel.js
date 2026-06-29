import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectStream, fetchEntities, injectAttack } from "../lib/api.js";

const FEED_CAP = 60;
const SERIES_CAP = 48;
const THREAT_LINGER_MS = 6000;

// Holds all live state from the websocket stream: the rolling feed, per-entity
// risk time-series, the current active threat (with a linger so the banner does
// not flicker), and the entity/attack catalog for the controls.
export function useSentinel() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [seriesByEntity, setSeriesByEntity] = useState({});
  const [activeThreat, setActiveThreat] = useState(null);
  const [focusEntity, setFocusEntity] = useState(null);
  const [entities, setEntities] = useState([]);
  const [attacks, setAttacks] = useState([]);
  const [counts, setCounts] = useState({ events: 0, alerts: 0 });

  const idRef = useRef(0);
  const tickRef = useRef(0);
  const threatTimer = useRef(null);

  useEffect(() => {
    fetchEntities()
      .then((d) => {
        setEntities(d.entities ?? []);
        setAttacks(d.attacks ?? []);
        setFocusEntity((cur) => cur ?? d.entities?.[0] ?? null);
      })
      .catch(() => {});
  }, []);

  const onMessage = useCallback((msg) => {
    const p = msg.payload ?? {};
    const isAlert = msg.type === "alert";
    const id = idRef.current++;
    const t = tickRef.current++;

    setEvents((prev) => [{ id, ...p, isAlert }, ...prev].slice(0, FEED_CAP));
    setCounts((c) => ({
      events: c.events + 1,
      alerts: c.alerts + (isAlert ? 1 : 0),
    }));
    setSeriesByEntity((prev) => {
      const series = prev[p.entity_id] ?? [];
      const next = [...series, { t, risk: p.risk_score ?? 0 }].slice(-SERIES_CAP);
      return { ...prev, [p.entity_id]: next };
    });

    if (isAlert) {
      setActiveThreat({ ...p, at: Date.now() });
      setFocusEntity(p.entity_id); // chart follows the attack
      clearTimeout(threatTimer.current);
      threatTimer.current = setTimeout(() => setActiveThreat(null), THREAT_LINGER_MS);
    }
  }, []);

  useEffect(() => {
    const disconnect = connectStream(onMessage, setConnected);
    return () => {
      disconnect();
      clearTimeout(threatTimer.current);
    };
  }, [onMessage]);

  const inject = useCallback((kind, entityId, burst) => {
    return injectAttack(kind, entityId, burst).catch((e) => {
      console.error("inject failed:", e.message);
      throw e;
    });
  }, []);

  const focusSeries = useMemo(
    () => seriesByEntity[focusEntity] ?? [],
    [seriesByEntity, focusEntity]
  );

  return {
    connected,
    events,
    activeThreat,
    focusEntity,
    setFocusEntity,
    focusSeries,
    entities,
    attacks,
    counts,
    inject,
  };
}
