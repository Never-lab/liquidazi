import type { SVGProps } from "react";

export type IconName =
  | "play"
  | "resume"
  | "save"
  | "trophy"
  | "book"
  | "bug"
  | "spark"
  | "login"
  | "logout"
  | "user"
  | "chevron"
  | "feedback"
  | "guest"
  | "calendar"
  | "receipt"
  | "wallet"
  | "ops"
  | "chart"
  | "bank"
  | "growth"
  | "ledger"
  | "tax"
  | "home"
  | "check";

type Props = {
  name: IconName;
  size?: number;
  className?: string;
};

const pathProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Glyph = ({ name }: { name: IconName }) => {
  switch (name) {
    case "play":
      return <path d="M8 6.5v11l9-5.5-9-5.5z" {...pathProps} />;
    case "resume":
      return (
        <>
          <path d="M8 6.5v11l9-5.5-9-5.5z" {...pathProps} />
          <path d="M5 6.5v11" {...pathProps} />
        </>
      );
    case "save":
      return (
        <>
          <path d="M5 4h11l3 3v13H5V4z" {...pathProps} />
          <path d="M8 4v5h7V4M8 20v-6h8v6" {...pathProps} />
        </>
      );
    case "trophy":
      return (
        <>
          <path d="M8 5h8v3a4 4 0 0 1-8 0V5z" {...pathProps} />
          <path d="M8 5H5a2 2 0 0 0 2 4M16 5h3a2 2 0 0 1-2 4M10 16h4v3H10zM9 21h6" {...pathProps} />
        </>
      );
    case "book":
      return (
        <>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5z" {...pathProps} />
          <path d="M5 5.5H19" {...pathProps} />
        </>
      );
    case "bug":
      return (
        <>
          <path d="M9 9a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V9z" {...pathProps} />
          <path d="M9 12H5M19 12h-4M8 7l-2-2M16 7l2-2M8 17l-2 2M16 17l2 2" {...pathProps} />
        </>
      );
    case "spark":
      return <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" {...pathProps} />;
    case "login":
      return (
        <>
          <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" {...pathProps} />
          <path d="M14 12H4M14 12l4-4M14 12l4 4" {...pathProps} />
        </>
      );
    case "logout":
      return (
        <>
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" {...pathProps} />
          <path d="M10 12h10M10 12l-4-4M10 12l-4 4" {...pathProps} />
        </>
      );
    case "user":
      return (
        <>
          <circle cx="12" cy="9" r="3.2" {...pathProps} />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" {...pathProps} />
        </>
      );
    case "guest":
      return (
        <>
          <circle cx="12" cy="9" r="3.2" {...pathProps} />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0M16 7l2-2" {...pathProps} />
        </>
      );
    case "chevron":
      return <path d="M9 6l6 6-6 6" {...pathProps} />;
    case "feedback":
      return (
        <>
          <path d="M5 6h14v10H9l-4 3V6z" {...pathProps} />
          <path d="M9 11h6M9 14h4" {...pathProps} />
        </>
      );
    case "calendar":
      return (
        <>
          <path d="M5 6h14v14H5V6z" {...pathProps} />
          <path d="M5 10h14M9 4v4M15 4v4" {...pathProps} />
        </>
      );
    case "receipt":
      return (
        <>
          <path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5V3z" {...pathProps} />
          <path d="M10 8h4M10 12h4M10 16h3" {...pathProps} />
        </>
      );
    case "wallet":
      return (
        <>
          <path d="M4 7h16v12H4V7z" {...pathProps} />
          <path d="M4 10h16M16 14h2" {...pathProps} />
        </>
      );
    case "ops":
      return (
        <>
          <path d="M5 5h6v6H5V5zM13 5h6v6h-6V5zM5 13h6v6H5v-6zM13 13h6v6h-6v-6z" {...pathProps} />
        </>
      );
    case "chart":
      return (
        <>
          <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" {...pathProps} />
        </>
      );
    case "bank":
      return (
        <>
          <path d="M4 10h16v10H4V10z" {...pathProps} />
          <path d="M3 10l9-6 9 6M8 14v3M12 14v3M16 14v3" {...pathProps} />
        </>
      );
    case "growth":
      return (
        <>
          <path d="M4 18l6-6 3 3 7-8" {...pathProps} />
          <path d="M15 7h5v5" {...pathProps} />
        </>
      );
    case "ledger":
      return (
        <>
          <path d="M6 4h12v16H6V4z" {...pathProps} />
          <path d="M9 8h6M9 12h6M9 16h4" {...pathProps} />
        </>
      );
    case "tax":
      return (
        <>
          <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" {...pathProps} />
          <path d="M9 12h6M12 9v6" {...pathProps} />
        </>
      );
    case "home":
      return (
        <>
          <path d="M4 11l8-7 8 7v9H4v-9z" {...pathProps} />
          <path d="M10 20v-6h4v6" {...pathProps} />
        </>
      );
    case "check":
      return <path d="M5 12l5 5 9-10" {...pathProps} />;
    default:
      return null;
  }
};

export const Icon = ({ name, size = 20, className }: Props) => {
  const svgProps: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": true,
    focusable: false,
  };
  return (
    <svg {...svgProps}>
      <Glyph name={name} />
    </svg>
  );
};
