import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Children, cloneElement, isValidElement } from "react";

export default function ResponsiveTable({ children }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tableChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (!("rows" in child.props) || !("columns" in child.props)) return child;

    return cloneElement(child, {
      autoHeight: false,
      rowHeight: child.props.rowHeight ?? 60,
      columnHeaderHeight: child.props.columnHeaderHeight ?? 46,
      initialState: {
        ...child.props.initialState,
        pagination: {
          ...child.props.initialState?.pagination,
          paginationModel: {
            pageSize: 10,
            page: 0,
            ...child.props.initialState?.pagination?.paginationModel
          }
        }
      },
      pageSizeOptions: child.props.pageSizeOptions ?? [10, 20, 50]
    });
  });

  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        borderRadius: 4,
        bgcolor: isDark ? "#05070a" : "transparent",
        "& .MuiDataGrid-main": {
          minWidth: 0
        },
        "& .MuiDataGrid-root": {
          minWidth: { xs: 560, sm: 640, md: 0 },
          border: "none",
          backgroundColor: isDark ? "#05070a" : "rgba(255,255,255,0.68)",
          color: isDark ? "#ffffff" : "inherit"
        },
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: isDark ? "#0a0f14" : "rgba(36,66,74,0.06)",
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(40,53,64,0.08)",
          color: "#ffffff"
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 800,
          color: isDark ? "#ffffff" : "inherit",
          lineHeight: 1.15,
          whiteSpace: "normal"
        },
        "& .MuiDataGrid-cell": {
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(40,53,64,0.07)",
          color: isDark ? "#ffffff" : "inherit",
          px: { xs: 0.5, md: 1 }
        },
        "& .MuiDataGrid-row": {
          backgroundColor: isDark ? "#05070a" : "rgba(255,255,255,0.24)",
          color: isDark ? "#ffffff" : "inherit"
        },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: isDark ? alpha("#ffffff", 0.04) : "rgba(200,139,58,0.08)"
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(40,53,64,0.08)",
          backgroundColor: isDark ? "#05070a" : "transparent"
        },
        "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": {
          py: { xs: 0.45, md: 0.85 }
        },
        "& .MuiDataGrid-columnHeaderTitle, & .MuiDataGrid-cellContent": {
          fontSize: { xs: "0.74rem", sm: "0.8rem", md: "0.95rem" },
          color: isDark ? "#ffffff" : "inherit"
        },
        "& .MuiDataGrid-columnHeader": {
          px: { xs: 0.5, md: 1 }
        },
        "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": {
          fontSize: { xs: "0.75rem", md: "0.875rem" },
          color: isDark ? "#ffffff" : "inherit"
        }
      }}
    >
      <Box sx={{ height: { xs: 500, sm: 560, md: 720 }, minHeight: { xs: 500, sm: 560, md: 620 } }}>
        {tableChildren}
      </Box>
    </Box>
  );
}
