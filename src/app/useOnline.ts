import { useEffect, useState } from "react";

/**
 * Connectivity hint for the offline banner.
 *
 * Starts optimistic and only reacts to real `offline`/`online` events: some
 * webviews keep `navigator.onLine` stuck at `false` even with a working
 * connection, and Firestore already reports unsynchronised writes. This never
 * blocks a write; it only explains what is happening.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);

    window.addEventListener("online", up);
    window.addEventListener("offline", down);

    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
