import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ORDER = ["/", "/activity", "/settings"];

export function useSwipeNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      const t = e.target as HTMLElement | null;
      active = !t?.closest("input, textarea, select, .sheet, [data-no-swipe]");
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const i = Math.max(0, ORDER.indexOf(pathname));
      const next = dx < 0 ? i + 1 : i - 1;
      if (next >= 0 && next < ORDER.length) navigate(ORDER[next]);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pathname, navigate]);
}
