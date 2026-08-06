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
  | "guest";

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
