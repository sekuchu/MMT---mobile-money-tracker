import { useI18n } from "../lib/i18n";

export function OfflineBanner({ pending }: { pending: number }) {
  const { t } = useI18n();
  return (
    <div className="banner" role="status">
      <span className="banner-dot" aria-hidden="true" />
      <span>
        {t("offline.text")}
        {pending > 0 ? ` ${t("offline.pending", { count: pending })}` : ""}
      </span>
    </div>
  );
}
