import type { ReactNode } from "react";

export type IconName =
  | "home"
  | "list"
  | "sliders"
  | "plus"
  | "arrowDown"
  | "copy"
  | "check"
  | "chevron";

const paths: Record<IconName, ReactNode> = {
  home: (
    <path d="M4 10.4 12 4l8 6.4V19a1.6 1.6 0 0 1-1.6 1.6h-3.6v-6h-5.6v6H5.6A1.6 1.6 0 0 1 4 19z" />
  ),
  list: (
    <>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <path d="M4.2 6.5h.01M4.2 12h.01M4.2 17.5h.01" strokeWidth="2.4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h9M18.5 7.5H20M4 16.5h5.5M12 16.5h8" />
      <circle cx="15.75" cy="7.5" r="2.25" />
      <circle cx="9.25" cy="16.5" r="2.25" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  arrowDown: <path d="M12 4.5v14M6.5 13l5.5 5.5L17.5 13" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 7" />,
  chevron: <path d="M9.5 6l6 6-6 6" />,
};

export function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
