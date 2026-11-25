import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

export function useBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = CapApp.addListener("backButton", () => {
      if (document.querySelector(".sheet")) {
        window.dispatchEvent(new Event("mmt:close-sheet"));
        return;
      }
      if (pathname !== "/") {
        navigate("/", { replace: true });
        return;
      }
      CapApp.exitApp();
    });

    return () => {
      handle.then((h) => h.remove());
    };
  }, [pathname, navigate]);
}
