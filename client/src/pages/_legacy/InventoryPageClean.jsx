import { Chip, Stack } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import DataSection from "../components/DataSection";
import PageHeader from "../components/PageHeader";
import ResponsiveTable from "../components/ResponsiveTable";
import { useFetch } from "../hooks/useFetch";

export default function InventoryPageClean() {
  const { data, loading } = useFetch("/inventory/summary");

  return (
    <Stack spacing={3}>
      <PageHeader eyebrow="Наличности" title="Складови нива и контрол на презареждане" subtitle="Следи количествата по магазини и откривай рискове преди да повлияят на продажбите." />
      <DataSection title="Наличности по обекти" subtitle="Правила за ниски наличности според праговете за презареждане">
        <ResponsiveTable>
          <DataGrid
            autoHeight
            loading={loading}
            rows={data}
            getRowId={(row) => row._id}
            columns={[
              { field: "productName", headerName: "Продукт", flex: 1.3, minWidth: 170, valueGetter: (_, row) => row.product?.name },
              { field: "sku", headerName: "SKU", flex: 0.9, minWidth: 120, valueGetter: (_, row) => row.product?.sku },
              { field: "storeName", headerName: "Магазин", flex: 1, minWidth: 140, valueGetter: (_, row) => row.store?.name },
              { field: "quantity", headerName: "Количество", flex: 0.7, minWidth: 100 },
              { field: "reserved", headerName: "Резервирани", flex: 0.7, minWidth: 100 },
              { field: "reorderLevel", headerName: "Праг", flex: 0.7, minWidth: 100 },
              { field: "status", headerName: "Статус", flex: 0.9, minWidth: 130, renderCell: (params) => <Chip label={params?.row?.isLowStock ? "Ниска наличност" : "Нормално"} color={params?.row?.isLowStock ? "warning" : "success"} size="small" /> }
            ]}
            disableRowSelectionOnClick
          />
        </ResponsiveTable>
      </DataSection>
    </Stack>
  );
}
