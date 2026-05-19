import { Card, CardContent, Chip, Divider, Grid2 as Grid, LinearProgress, Stack, Typography } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const pieColors = ["#0b1f33", "#d56f3e", "#1d7a46", "#c38b1a"];

function toNumber(value) {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object") {
    if ("$numberDecimal" in value) return toNumber(value.$numberDecimal);
    if ("value" in value) return toNumber(value.value);
    if (typeof value.valueOf === "function") {
      const primitive = value.valueOf();
      if (primitive !== value) return toNumber(primitive);
    }
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value, fallback = "-") {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    if ("name" in value) return toText(value.name, fallback);
    if ("label" in value) return toText(value.label, fallback);
    return fallback;
  }
  return fallback;
}

function money(value) {
  return `${toNumber(value).toFixed(2)} lv.`;
}

function InsightText({ eyebrow, title, subtitle, compact = false }) {
  return (
    <Stack spacing={0.4}>
      {eyebrow ? (
        <Typography variant="overline" sx={{ opacity: 0.72 }}>
          {eyebrow}
        </Typography>
      ) : null}
      <Typography variant={compact ? "body1" : "h4"} fontWeight={compact ? 600 : 800}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" sx={{ opacity: 0.72 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}

const chipSx = {
  bgcolor: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)"
};

export default function ExecutiveDashboardPageClean() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    api
      .get("/dashboard")
      .then((response) => setDashboard(response.data))
      .catch((error) => toast.error(error.response?.data?.message || "Неуспешно зареждане на таблото."));
  }, []);

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Оперативен обзор"
        title="Продажби, наличности и финанси в едно табло"
        subtitle="Следи представянето на магазините, складовия риск, последните поръчки и паричния поток от едно място."
      />

      <Grid container spacing={3}>
        {(dashboard?.stats || []).map((stat, index) => (
          <Grid key={`${stat.label || "stat"}-${index}`} size={{ xs: 12, sm: 6, xl: 3 }}>
            <StatCard label={toText(stat.label, "Metric")} value={toText(stat.value, "0")} trend={stat.trend} accent={stat.accent} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Card sx={{ borderRadius: 6, overflow: "hidden" }}>
            <CardContent sx={{ p: 0 }}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                justifyContent="space-between"
                spacing={2}
                sx={{
                  p: 3,
                  background: "linear-gradient(135deg, rgba(11,31,51,0.96), rgba(23,52,83,0.92))",
                  color: "#fff"
                }}
              >
                <InsightText
                  eyebrow="Нетен резултат"
                  title={money(dashboard?.totals?.netProfit)}
                  subtitle={`Приходи ${money(dashboard?.totals?.totalRevenue)} / Разходи ${money(dashboard?.totals?.totalExpenses)}`}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip icon={<TrendingUpRoundedIcon />} label={`Банка ${money(dashboard?.totals?.bankBalance)}`} sx={chipSx} />
                  <Chip
                    icon={<WarningAmberRoundedIcon />}
                    label={`${toNumber(dashboard?.totals?.lowStockCount)} предупреждения`}
                    sx={chipSx}
                  />
                </Stack>
              </Stack>
              <div style={{ width: "100%", height: 320, padding: 16 }}>
                <ResponsiveContainer>
                  <BarChart data={dashboard?.revenueSeries || []}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="#d56f3e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Card sx={{ borderRadius: 6, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" mb={0.5}>
                Продуктов микс
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Баланс по категории във веригата
              </Typography>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dashboard?.categoryShare || []} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105}>
                      {(dashboard?.categoryShare || []).map((entry, index) => (
                        <Cell key={`${entry.name || "slice"}-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ borderRadius: 6, height: "100%" }}>
            <CardContent>
              <Typography variant="h6">Ниски наличности</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Продукти най-близо до прага за презареждане
              </Typography>
              <Stack spacing={2}>
                {(dashboard?.recentLowStock || []).map((item, index) => {
                  const quantity = toNumber(item.quantity);
                  const reorderLevel = Math.max(toNumber(item.reorderLevel), 1);
                  const progress = Math.min(100, Math.round((quantity / reorderLevel) * 100));
                  return (
                    <Stack key={item.id || `${item.sku || "low"}-${index}`} spacing={1.1}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <div>
                          <Typography fontWeight={700}>{toText(item.productName)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {toText(item.storeName)} | {toText(item.sku)}
                          </Typography>
                        </div>
                        <Chip label={`Остават ${quantity}`} color={quantity <= reorderLevel ? "warning" : "success"} />
                      </Stack>
                      <LinearProgress value={progress} variant="determinate" color={progress < 100 ? "warning" : "success"} />
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ borderRadius: 6, height: "100%" }}>
            <CardContent>
              <Typography variant="h6">Поток на активността</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Последни събития в наличности, продажби и финанси
              </Typography>
              <Stack divider={<Divider flexItem />} spacing={0}>
                {(dashboard?.activity || []).map((item, index) => (
                  <Stack key={item._id || `${item.message || "activity"}-${index}`} direction={{ xs: "column", md: "row" }} spacing={1} sx={{ py: 1.5 }}>
                    <Chip
                      label={toText(item.severity)}
                      size="small"
                      color={item.severity === "critical" ? "error" : item.severity === "warning" ? "warning" : "default"}
                    />
                    <InsightText title={toText(item.message)} subtitle={`${toText(item.module)} | ${toText(item.actorName, "Система")}`} compact />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: 6 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Последни поръчки
              </Typography>
              <Stack spacing={2}>
                {(dashboard?.recentOrders || []).map((order, index) => (
                  <Card key={order._id || `${order.orderNumber || "order"}-${index}`} variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <div>
                          <Typography fontWeight={700}>{toText(order.orderNumber)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {toText(order.customer?.fullName || order.customer?.company, "Клиент на място")} | {toText(order.store?.name)}
                          </Typography>
                        </div>
                        <Typography fontWeight={700}>{money(order.totalAmount)}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: 6 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Финансов пулс
              </Typography>
              <Stack spacing={2}>
                {(dashboard?.financeEntries || []).map((entry, index) => (
                  <Card key={entry._id || `${entry.category || "finance"}-${index}`} variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <div>
                          <Typography fontWeight={700}>{toText(entry.category)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {toText(entry.description, "Без бележка")} | {toText(entry.store?.name, "Централа")}
                          </Typography>
                        </div>
                        <Typography color={entry.type === "expense" ? "error.main" : "success.main"} fontWeight={700}>
                          {entry.type === "expense" ? "-" : "+"}
                          {money(entry.amount)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
