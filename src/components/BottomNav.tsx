import { NavLink } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { Icon, type IconName } from "./Icon";

const items: { to: string; label: "nav.home" | "nav.activity" | "nav.settings"; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "nav.home", icon: "home", end: true },
  { to: "/activity", label: "nav.activity", icon: "list" },
  { to: "/settings", label: "nav.settings", icon: "sliders" },
];

export function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="nav" aria-label={t("a11y.main")}>
      <div className="nav-inner">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? "nav-item is-active" : "nav-item"
            }
          >
            <Icon name={item.icon} size={19} />
            <span>{t(item.label)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
