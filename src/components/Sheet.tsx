import { useEffect, useRef, type ReactNode } from "react";

interface SheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ title, subtitle, onClose, children }: SheetProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    const onBack = () => closeRef.current();

    window.addEventListener("keydown", onKey);
    window.addEventListener("mmt:close-sheet", onBack);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mmt:close-sheet", onBack);
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          {subtitle ? <span className="sheet-sub">{subtitle}</span> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
