import { Avatar, Box, Chip, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function openImageInNewWindow(imageUrl, title = "Product image") {
  if (!imageUrl || typeof window === "undefined") return;

  const imageWindow = window.open("", "_blank");
  if (!imageWindow) return;

  imageWindow.opener = null;
  imageWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtmlAttribute(title)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          html,
          body {
            margin: 0;
            min-height: 100%;
            background: #111827;
          }

          body {
            display: grid;
            place-items: center;
            padding: 24px;
            box-sizing: border-box;
          }

          img {
            max-width: 100%;
            max-height: calc(100vh - 48px);
            object-fit: contain;
            background: #ffffff;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
          }
        </style>
      </head>
      <body>
        <img src="${escapeHtmlAttribute(imageUrl)}" alt="${escapeHtmlAttribute(title)}" />
      </body>
    </html>
  `);
  imageWindow.document.close();
}

function useProductImage(product) {
  const [loadedImageUrl, setLoadedImageUrl] = useState("");

  useEffect(() => {
    let active = true;
    setLoadedImageUrl("");

    if (!product?._id || product.imageUrl) return undefined;

    api
      .get(`/products/${product._id}/image`)
      .then((response) => {
        if (active) setLoadedImageUrl(response.data.imageUrl || "");
      })
      .catch(() => {
        if (active) setLoadedImageUrl("");
      });

    return () => {
      active = false;
    };
  }, [product?._id, product?.imageUrl]);

  return product?.imageUrl || loadedImageUrl || "";
}

export function ProductIdentity({ product, compact = false, showSku = true, onImageClick }) {
  const imageUrl = useProductImage(product);
  const imageSize = compact ? 42 : 52;
  const canOpenImage = Boolean(imageUrl);

  if (!product) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar variant="rounded" sx={{ width: imageSize, height: imageSize, borderRadius: 1.25 }}>
          ?
        </Avatar>
        <Typography variant="body2" color="text.secondary">
          Няма продукт
        </Typography>
      </Stack>
    );
  }

  const secondaryCode = product.sku ? `SKU: ${product.sku}` : product.barcode ? `Баркод: ${product.barcode}` : "";

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, width: "100%", py: 0.25 }}>
      <Avatar
        src={imageUrl || undefined}
        alt={product.name}
        variant="rounded"
        onClick={(event) => {
          if (!canOpenImage) return;
          event.stopPropagation();
          if (onImageClick) {
            onImageClick(product, imageUrl);
            return;
          }
          openImageInNewWindow(imageUrl, product.name);
        }}
        onKeyDown={(event) => {
          if (!canOpenImage || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          event.stopPropagation();
          if (onImageClick) {
            onImageClick(product, imageUrl);
            return;
          }
          openImageInNewWindow(imageUrl, product.name);
        }}
        role={canOpenImage ? "button" : undefined}
        tabIndex={canOpenImage ? 0 : undefined}
        sx={{
          width: imageSize,
          height: imageSize,
          borderRadius: 1.25,
          bgcolor: "rgba(39,86,107,0.08)",
          cursor: canOpenImage ? "pointer" : "default"
        }}
      >
        {product.name?.[0] || "P"}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap" sx={{ minWidth: 0 }}>
          <Tooltip title={product.name || ""}>
            <Typography variant="body2" fontWeight={800} noWrap sx={{ lineHeight: 1.15, maxWidth: compact ? 180 : 260 }}>
              {product.name}
            </Typography>
          </Tooltip>
          {product.productNumber ? (
            <Chip
              size="small"
              label={`№ ${product.productNumber}`}
              sx={{
                height: 20,
                fontWeight: 800,
                bgcolor: "rgba(39,86,107,0.14)",
                border: "1px solid rgba(39,86,107,0.28)"
              }}
            />
          ) : null}
        </Stack>
        {showSku ? (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", lineHeight: 1.15 }}>
            {secondaryCode || "Без код"}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

export function ProductPreviewCard({ product }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const imageUrl = useProductImage(product);
  const canOpenImage = Boolean(imageUrl);

  if (!product) {
    return (
      <Box
        sx={{
          border: isDark ? "1px dashed rgba(255,255,255,0.16)" : "1px dashed rgba(39,86,107,0.18)",
          borderRadius: 3,
          p: 2,
          bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)"
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Избери продукт, за да видиш снимка, цена и основни детайли.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        p: 2,
        border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(39,86,107,0.12)",
        borderRadius: 3,
        bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.72)"
      }}
    >
      <Avatar
        src={imageUrl || undefined}
        alt={product.name}
        variant="rounded"
        onClick={() => openImageInNewWindow(imageUrl, product.name)}
        onKeyDown={(event) => {
          if (!canOpenImage || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          openImageInNewWindow(imageUrl, product.name);
        }}
        role={canOpenImage ? "button" : undefined}
        tabIndex={canOpenImage ? 0 : undefined}
        sx={{
          width: 144,
          height: 144,
          borderRadius: 3,
          bgcolor: "rgba(39,86,107,0.08)",
          cursor: canOpenImage ? "pointer" : "default"
        }}
      >
        {product.name?.[0] || "P"}
      </Avatar>
      <Stack spacing={0.8} sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          {product.name}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {product.productNumber ? <Chip size="small" label={`№ ${product.productNumber}`} /> : null}
          {product.sku ? <Chip size="small" label={`SKU: ${product.sku}`} /> : null}
          {!product.sku && product.barcode ? <Chip size="small" label={`Баркод: ${product.barcode}`} /> : null}
          {product.category ? <Chip size="small" label={product.category} variant="outlined" /> : null}
          {product.brand ? <Chip size="small" label={product.brand} variant="outlined" /> : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Каталожна цена: {formatCurrencyEUR(product.price)}
        </Typography>
        {product.description ? (
          <Typography variant="body2" color="text.secondary">
            {product.description}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
