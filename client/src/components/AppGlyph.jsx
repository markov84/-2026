import { Box } from "@mui/material";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

export default function AppGlyph({ name, size = 22 }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: size, height: size, display: "block" }} aria-hidden="true">
      {name === "menu" ? <path {...common} d="M4 7h16M4 12h16M4 17h16" /> : null}
      {name === "logout" ? (
        <>
          <path {...common} d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4" />
          <path {...common} d="M14 8l4 4-4 4" />
          <path {...common} d="M9 12h9" />
        </>
      ) : null}
      {name === "dark" ? (
        <>
          <path {...common} d="M21 12.8A8.5 8.5 0 1111.2 3 7 7 0 0021 12.8z" />
        </>
      ) : null}
      {name === "light" ? (
        <>
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.24" />
          <path {...common} d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : null}
      {name === "scan" ? (
        <>
          <path {...common} d="M7 3H4v3M17 3h3v3M7 21H4v-3M20 18v3h-3" />
          <path {...common} d="M8 8h8M8 12h8M8 16h8" />
        </>
      ) : null}
      {name === "dashboard" ? (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.25" />
          <rect x="13" y="4" width="7" height="4" rx="1.2" fill="currentColor" opacity="0.35" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
          <path {...common} d="M13 20c1.5-4 3.2-6.3 7-8" />
        </>
      ) : null}
      {name === "products" ? (
        <>
          <path {...common} d="M4 8l8-4 8 4-8 4-8-4z" />
          <path {...common} d="M4 12l8 4 8-4" />
          <path {...common} d="M4 16l8 4 8-4" />
        </>
      ) : null}
      {name === "customers" ? (
        <>
          <circle cx="12" cy="9" r="3" fill="currentColor" opacity="0.28" />
          <path {...common} d="M5 19c1-3 3.3-4.8 7-4.8s6 1.8 7 4.8" />
        </>
      ) : null}
      {name === "orders" ? (
        <>
          <path {...common} d="M4 6h3l1.6 9h9.8l1.6-6H8" />
          <circle cx="10" cy="19" r="1.5" fill="currentColor" />
          <circle cx="17" cy="19" r="1.5" fill="currentColor" />
        </>
      ) : null}
      {name === "finance" ? (
        <>
          <rect x="3" y="6" width="18" height="12" rx="2.5" fill="currentColor" opacity="0.2" />
          <path {...common} d="M3 10h18M7 14h4" />
        </>
      ) : null}
      {name === "add" ? (
        <>
          <path {...common} d="M12 5v14M5 12h14" />
        </>
      ) : null}
      {name === "person-add" ? (
        <>
          <circle cx="10" cy="8.5" r="2.6" fill="currentColor" opacity="0.3" />
          <path {...common} d="M4.8 18c.7-2.6 2.4-4 5.2-4s4.5 1.4 5.2 4" />
          <path {...common} d="M18 8v5M15.5 10.5h5" />
        </>
      ) : null}
      {name === "receipt" ? (
        <>
          <path {...common} d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1V3z" />
          <path {...common} d="M9 8h6M9 12h6M9 16h4" />
        </>
      ) : null}
      {name === "trend" ? (
        <>
          <path {...common} d="M4 16l5-5 4 3 7-7" />
          <path {...common} d="M14 7h6v6" />
        </>
      ) : null}
      {name === "warning" ? (
        <>
          <path {...common} d="M12 3l9 16H3l9-16z" />
          <path {...common} d="M12 9v4" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
        </>
      ) : null}
      {name === "savings" ? (
        <>
          <rect x="4" y="6" width="16" height="12" rx="3" fill="currentColor" opacity="0.2" />
          <path {...common} d="M4 10h16M9 14h3" />
          <circle cx="15.5" cy="14.5" r="2" fill="currentColor" opacity="0.4" />
        </>
      ) : null}
      {name === "store" ? (
        <>
          <path {...common} d="M4 9h16l-1.5-4h-13z" />
          <path {...common} d="M5 9v10h14V9" />
          <path {...common} d="M9 19v-5h6v5" />
        </>
      ) : null}
      {name === "fact" ? (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.2" />
          <path {...common} d="M8 9h8M8 13h5M13 15l2 2 3-4" />
        </>
      ) : null}
      {name === "shopping" ? (
        <>
          <path {...common} d="M6 8h12l-1.2 10H7.2L6 8z" />
          <path {...common} d="M9 8a3 3 0 016 0" />
        </>
      ) : null}
      {name === "eye" ? (
        <>
          <path {...common} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" opacity="0.35" />
        </>
      ) : null}
      {name === "eye-off" ? (
        <>
          <path {...common} d="M3 3l18 18" />
          <path {...common} d="M2.5 12s3.5-6 9.5-6c2.1 0 4 .7 5.5 1.6M21.5 12s-3.5 6-9.5 6c-2.1 0-4-.7-5.5-1.6" />
        </>
      ) : null}
    </Box>
  );
}
