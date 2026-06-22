import { Box } from "@mui/material";
import { Children, cloneElement, isValidElement } from "react";

export default function ResponsiveTable({ children }) {
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
        "& .MuiDataGrid-main": {
          minWidth: 0
        },
        "& .MuiDataGrid-root": {
          minWidth: { xs: 720, md: 0 },
          border: "none",
          backgroundColor: "rgba(255,255,255,0.68)"
        },
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "rgba(36,66,74,0.06)",
          borderBottom: "1px solid rgba(40,53,64,0.08)"
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 800
        },
        "& .MuiDataGrid-cell": {
          borderColor: "rgba(40,53,64,0.07)"
        },
        "& .MuiDataGrid-row": {
          backgroundColor: "rgba(255,255,255,0.24)"
        },
        "& .MuiDataGrid-row:hover": {
          backgroundColor: "rgba(200,139,58,0.08)"
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: "1px solid rgba(40,53,64,0.08)"
        },
        "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": {
          py: { xs: 0.7, md: 0.85 }
        },
        "& .MuiDataGrid-columnHeaderTitle, & .MuiDataGrid-cellContent": {
          fontSize: { xs: "0.82rem", md: "0.95rem" }
        },
        "& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel": {
          fontSize: { xs: "0.75rem", md: "0.875rem" }
        }
      }}
    >
      <Box sx={{ height: { xs: 620, md: 720 }, minHeight: 620 }}>
        {tableChildren}
      </Box>
    </Box>
  );
}
