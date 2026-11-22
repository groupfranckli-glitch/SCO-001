import type { Network } from "@/lib/contact-links";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Icônes sobres en SVG intégré (aucune ressource externe). */
export function SocialIcon({ network }: { network: Network }) {
  const common = { viewBox: "0 0 24 24", width: 20, height: 20, "aria-hidden": true, focusable: false } as const;
  switch (network) {
    case "instagram":
      return (
        <svg {...common} {...stroke}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} {...stroke}>
          <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V21H14v-6.5h2.4l.6-3.5H14V8.8c0-.2.1-.3.3-.3z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} {...stroke}>
          <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 4c.3 2.3 1.9 3.9 4.5 4.1" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} {...stroke}>
          <rect x="3" y="6" width="18" height="12" rx="4" />
          <path d="M10.5 9.5v5l4.2-2.5z" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} {...stroke}>
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      );
  }
}
