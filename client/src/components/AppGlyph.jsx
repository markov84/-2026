import { Box } from "@mui/material";

const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

export default function AppGlyph({ name, size = 22, ...props }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: size, height: size, display: "block" }} aria-hidden="true" {...props}>
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
      {name === "close" ? <path {...common} d="M5 5l14 14M19 5L5 19" /> : null}
      {name === "delete" ? (
        <>
          <path {...common} d="M6 7h12M10 7V5h4v2M8 7l1 12h6l1-12" />
          <path {...common} d="M10 11v5M14 11v5" />
        </>
      ) : null}
      {name === "save" ? (
        <>
          <path {...common} d="M5 5h11l3 3v11H5z" />
          <path {...common} d="M8 5v5h7V5" />
          <path {...common} d="M8 14h8" />
        </>
      ) : null}
      {name === "print" ? (
        <>
          <path {...common} d="M7 8V4h10v4" />
          <rect x="5" y="9" width="14" height="7" rx="2" fill="currentColor" opacity="0.18" />
          <path {...common} d="M7 14h10v6H7z" />
        </>
      ) : null}
      {name === "edit" ? (
        <>
          <path {...common} d="M5 19h4l9-9a1.5 1.5 0 00-4-4L5 15v4z" />
          <path {...common} d="M12 7l5 5" />
        </>
      ) : null}
      {name === "search" || name === "manage-search" ? (
        <>
          <circle cx="11" cy="11" r="5" fill="currentColor" opacity="0.18" />
          <path {...common} d="M16 16l4 4" />
          {name === "manage-search" ? <path {...common} d="M9 11h4M11 9v4" /> : null}
        </>
      ) : null}
      {name === "add-box" ? (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.18" />
          <path {...common} d="M12 8v8M8 12h8" />
        </>
      ) : null}
      {name === "add-business" ? (
        <>
          <path {...common} d="M5 19V9l7-3 7 3v10" />
          <path {...common} d="M8 19v-5h8v5" />
          <path {...common} d="M16 7v4M14 9h4" />
        </>
      ) : null}
      {name === "shopping-cart" ? (
        <>
          <path {...common} d="M6 6h14l-1.5 8H8L6 6z" />
          <circle cx="10" cy="19" r="1.4" fill="currentColor" />
          <circle cx="17" cy="19" r="1.4" fill="currentColor" />
        </>
      ) : null}
      {name === "badge" || name === "person" ? (
        <>
          <circle cx="12" cy="8.5" r="2.7" fill="currentColor" opacity="0.28" />
          <path {...common} d="M5 19c.9-3 3.2-4.7 7-4.7s6.1 1.7 7 4.7" />
          {name === "badge" ? <path {...common} d="M17 6v5M14.5 8.5h5" /> : null}
        </>
      ) : null}
      {name === "business" ? (
        <>
          <path {...common} d="M4 19V8h6v11" />
          <path {...common} d="M14 19V5h6v14" />
          <path {...common} d="M4 19h16" />
        </>
      ) : null}
      {name === "assignment" || name === "description" ? (
        <>
          <path {...common} d="M7 4h10l2 2v14H7z" />
          <path {...common} d="M9 10h6M9 14h6M9 18h4" />
          {name === "assignment" ? <path {...common} d="M9 7h5" /> : null}
        </>
      ) : null}
      {name === "compare-arrows" ? (
        <>
          <path {...common} d="M7 7h10l-3-3M17 7l-3 3" />
          <path {...common} d="M17 17H7l3-3M7 17l3 3" />
        </>
      ) : null}
        {name === "swap-horiz" ? (
          <>
            <path {...common} d="M7 8h10l-3-3M17 8l-3 3" />
            <path {...common} d="M17 16H7l3-3M7 16l3 3" />
          </>
        ) : null}
        {name === "warehouse" || name === "store-mall" ? (
          <>
            <path {...common} d="M5 10l7-4 7 4v10H5z" />
            <path {...common} d="M9 20v-6h6v6" />
            <path {...common} d="M7 10h10" />
          </>
        ) : null}
        {name === "inventory2" ? (
          <>
            <path {...common} d="M5 8l7-4 7 4-7 4-7-4z" />
            <path {...common} d="M5 12l7 4 7-4" />
            <path {...common} d="M5 16l7 4 7-4" />
          </>
        ) : null}
        {name === "account-balance-wallet" ? (
          <>
            <path {...common} d="M4 8h16v10H6a2 2 0 01-2-2V8z" />
            <path {...common} d="M13 11h7v4h-7a2 2 0 110-4z" />
          </>
        ) : null}
        {name === "account-balance" ? (
          <>
            <path {...common} d="M4 20h16" />
            <path {...common} d="M6 8h12M7 8v9M11 8v9M15 8v9" />
            <path {...common} d="M4 20l2-2h12l2 2" />
          </>
        ) : null}
        {name === "add-card" ? (
          <>
            <rect x="4" y="6" width="16" height="12" rx="2" fill="currentColor" opacity="0.18" />
            <path {...common} d="M12 9v6M9 12h6" />
          </>
        ) : null}
        {name === "upload" ? (
          <>
            <path {...common} d="M12 16V6M8 10l4-4 4 4" />
            <path {...common} d="M5 18h14v2H5z" />
          </>
        ) : null}
        {name === "check-circle" ? (
          <>
            <circle cx="12" cy="12" r="7" fill="currentColor" opacity="0.18" />
            <path {...common} d="M9 12l2 2 4-5" />
          </>
        ) : null}
        {name === "expand-more" ? <path {...common} d="M7 10l5 5 5-5" /> : null}
        {name === "playlist-add-check" ? (
          <>
            <path {...common} d="M6 7h8M6 12h5M6 17h5" />
            <path {...common} d="M16 8v4M14 10h4" />
            <path {...common} d="M15 17l1.5 1.5L20 15" />
          </>
        ) : null}
        {name === "scanner" || name === "qr-code-scanner" ? (
          <>
            <path {...common} d="M5 8V5h3M19 8V5h-3M5 16v3h3M19 16v3h-3" />
            <path {...common} d="M9 9h6v6H9z" />
            <path {...common} d="M11 11h2v2h-2z" />
          </>
        ) : null}
        {name === "shopping-cart-checkout" ? (
          <>
            <path {...common} d="M6 6h12l-1.2 7H8L6 6z" />
            <path {...common} d="M9 18h8M13 15l2 2 4-4" />
            <circle cx="9.5" cy="19.5" r="1.2" fill="currentColor" />
            <circle cx="16.5" cy="19.5" r="1.2" fill="currentColor" />
          </>
        ) : null}
        {name === "note-add" ? (
          <>
            <path {...common} d="M7 4h8l4 4v12H7z" />
            <path {...common} d="M11 11v4M9 13h4" />
            <path {...common} d="M9 8h5" />
          </>
        ) : null}
        {name === "fact-check" ? (
          <>
            <rect x="5" y="4" width="14" height="16" rx="2" fill="currentColor" opacity="0.18" />
            <path {...common} d="M9 9h5M9 13h3M12 16l1.5 1.5L17 13" />
          </>
        ) : null}
        {name === "assessment" ? (
          <>
            <path {...common} d="M5 19h14" />
            <path {...common} d="M7 15l3-4 3 2 4-6" />
            <path {...common} d="M17 7h0" />
          </>
        ) : null}
        {name === "euro" ? (
          <>
            <path {...common} d="M18 7a6 6 0 10-1 10" />
            <path {...common} d="M7 11h8M7 14h8" />
          </>
        ) : null}
        {name === "local-shipping" ? (
          <>
            <path {...common} d="M4 8h10v8H4z" />
            <path {...common} d="M14 10h3l3 3v3h-6z" />
            <circle cx="7.5" cy="18" r="1.3" fill="currentColor" />
            <circle cx="17.5" cy="18" r="1.3" fill="currentColor" />
          </>
        ) : null}
      {name === "circle" ? <circle cx="12" cy="12" r="4" fill="currentColor" /> : null}
    </Box>
  );
}
