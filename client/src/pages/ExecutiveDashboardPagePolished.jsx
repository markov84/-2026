import { Alert, Card, CardActionArea, CardContent, Chip, CircularProgress, Divider, Grid2 as Grid, LinearProgress, Stack, Typography } from "@mui/material";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import api from "../lib/api";
import { formatCurrencyEUR } from "../lib/currency";
import { useAuth } from "../providers/AuthProviderStable";

const pieColors = ["#28566a", "#b66a3c", "#4a7a64", "#d1a34f"];
const severityColorMap = {
  critical: "error",
  warning: "warning",
  info: "default"
};
const statLinks = ["/products", "/stores", "/customers", "/inventory"];
const statIcons = [
  <Inventory2RoundedIcon key="products" />,
  <StoreRoundedIcon key="stores" />,
  <PeopleAltRoundedIcon key="customers" />,
  <WarningAmberRoundedIcon key="inventory" />
];

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
    return 0;
  }
  return 0;
}

function toText(value, fallback = "-") {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if ("name" in value) return toText(value.name, fallback);
    if ("label" in value) return toText(value.label, fallback);
  }
  return fallback;
}

function money(value) {
  return formatCurrencyEUR(toNumber(value));
}

function MetricPanel({ title, value, helper, icon, onClick }) {
  return (
    <Card sx={{ height: "100%", borderRadius: 5 }}>
      <CardActionArea
        onClick={onClick}
        disabled={!onClick}
        sx={{
          height: "100%",
          borderRadius: 5,
          cursor: onClick ? "pointer" : "default",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          "&:hover": onClick
            ? {
                transform: "translateY(-2px)",
                boxShadow: "0 16px 34px rgba(39,86,107,0.14)"
              }
            : undefined
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {value}
              </Typography>
              {helper ? (
                <Typography variant="body2" color="text.secondary">
                        {helper}
                </Typography>
              ) : null}
            </Stack>
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{
                width: 42,
                height: 42,
                borderRadius: 3,
                bgcolor: "rgba(39,86,107,0.08)",
                color: "primary.main"
              }}
            >
              {icon}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function ExecutiveDashboardPagePolished() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const canViewProfit = Boolean(dashboard?.permissions?.canViewProfit ?? (user?.role === "admin"));

  useEffect(() => {
    setLoading(true);
    setLoadError("");

    api
      .get("/dashboard")
      .then((response) => setDashboard(response.data))
      .catch((error) => {
        const message = error.response?.data?.message || "Неуспешно зареждане на таблото.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading && !dashboard) {
    return (
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Оперативен обзор"
          title="Продажби, наличности и финанси в едно табло"
          subtitle="Зареждаме данните от сървъра. При първо отваряне е възможно да има кратко забавяне."
          icon={<DashboardRoundedIcon />}
        />

        <Card sx={{ borderRadius: 5 }}>
          <CardContent sx={{ py: 6 }}>
            <Stack spacing={2} alignItems="center" textAlign="center">
              <CircularProgress />
              <Typography variant="h6">Подготвям данните за таблото</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                Ако отваряш приложението от ново устройство, backend сървърът може да се събуди за няколко секунди.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Оперативен обзор"
        title="Продажби, наличности и финанси в едно табло"
        subtitle="Ясен преглед на мрежата с по-компактен layout, по-малко шум и по-лесно четене на най-важните показатели."
        icon={<DashboardRoundedIcon />}
      />

      {loadError ? <Alert severity="warning">{loadError}</Alert> : null}

      <Grid container spacing={2.5}>
        {(dashboard?.stats || []).map((stat, index) => (
          <Grid key={`${stat.label || "stat"}-${index}`} size={{ xs: 12, sm: 6, xl: 3 }}>
            <StatCard
              label={toText(stat.label, "Показател")}
              value={toText(stat.value, "0")}
              trend={stat.trend}
              accent={stat.accent}
              icon={statIcons[index]}
              onClick={() => navigate(statLinks[index] || "/")}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {canViewProfit ? (
          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <MetricPanel
              title="Печалба"
              value={money(dashboard?.totals?.netProfit)}
              helper={`Приходи ${money(dashboard?.totals?.totalRevenue)}`}
              icon={<TrendingUpRoundedIcon />}
              onClick={() => navigate("/finance")}
            />
          </Grid>
        ) : null}
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricPanel
            title="Дневен оборот"
            value={money(dashboard?.totals?.dailyTurnover)}
            helper="Оборот за днешния ден"
            icon={<TrendingUpRoundedIcon />}
            onClick={() => navigate(canViewProfit ? "/finance" : "/orders")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricPanel
            title="Месечен оборот"
            value={money(dashboard?.totals?.monthlyTurnover)}
            helper="Оборот за текущия месец"
            icon={<TrendingUpRoundedIcon />}
            onClick={() => navigate(canViewProfit ? "/finance" : "/orders")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricPanel
            title="Банкова наличност"
            value={money(dashboard?.totals?.bankBalance)}
            helper={canViewProfit ? `Разходи ${money(dashboard?.totals?.totalExpenses)}` : undefined}
            icon={<SavingsRoundedIcon />}
            onClick={() => navigate("/finance")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricPanel
            title="Продажби"
            value={String((dashboard?.recentOrders || []).length)}
            helper="Последни активни документи"
            icon={<ShoppingBagRoundedIcon />}
            onClick={() => navigate("/orders")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricPanel
            title="Магазини"
            value={String(toNumber(dashboard?.totals?.storeCount || dashboard?.storesCount))}
            helper="Свързани обекти в мрежата"
            icon={<StoreRoundedIcon />}
            onClick={() => navigate("/stores")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, xl: 3 }}>
          <MetricPanel
            title="Точност ревизии"
            value={`${toNumber(dashboard?.totals?.avgAuditAccuracy).toFixed(1)}%`}
              helper={`Активни ${toNumber(dashboard?.totals?.activeAudits)} | Повторни броения ${toNumber(dashboard?.totals?.pendingRecount)}`}
            icon={<FactCheckRoundedIcon />}
            onClick={() => navigate("/inventory-audits")}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <Card sx={{ borderRadius: 5, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                spacing={1.5}
                mb={2}
              >
                <Stack spacing={0.5}>
                  <Typography variant="h6">Оборот по периоди</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Сравни текущия темп на приходите между обектите.
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip icon={<TrendingUpRoundedIcon />} label={`Банка ${money(dashboard?.totals?.bankBalance)}`} />
                  <Chip icon={<WarningAmberRoundedIcon />} label={`${toNumber(dashboard?.totals?.lowStockCount)} предупреждения`} color="error" />
                </Stack>
              </Stack>

              <BoxChart>
                <BarChart data={dashboard?.revenueSeries || []}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={42} />
                  <Tooltip />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#b66a3c" />
                </BarChart>
              </BoxChart>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, xl: 5 }}>
          <Card sx={{ borderRadius: 5, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography variant="h6">Продуктов микс</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Дял на категориите в продажбите.
              </Typography>

              <BoxChart height={260}>
                <PieChart>
                  <Pie data={dashboard?.categoryShare || []} dataKey="value" nameKey="name" innerRadius={52} outerRadius={90}>
                    {(dashboard?.categoryShare || []).map((entry, index) => (
                      <Cell key={`${entry.name || "slice"}-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </BoxChart>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ borderRadius: 5, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography variant="h6">Ниски наличности</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Артикули близо до прага за презареждане.
              </Typography>
              <Stack spacing={1.75}>
                {(dashboard?.recentLowStock || []).map((item, index) => {
                  const quantity = toNumber(item.quantity);
                  const reorderLevel = Math.max(toNumber(item.reorderLevel), 1);
                  const progress = Math.min(100, Math.round((quantity / reorderLevel) * 100));

                  return (
                    <Stack key={item.id || `${item.sku || "stock"}-${index}`} spacing={0.9}>
                      <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>
                            {toText(item.productName)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {toText(item.storeName)} | {toText(item.sku)}
                          </Typography>
                        </Stack>
                        <Chip label={`${quantity} бр.`} color={quantity <= reorderLevel ? "error" : "success"} size="small" />
                      </Stack>
                      <LinearProgress value={progress} variant="determinate" color={progress < 100 ? "error" : "success"} />
                    </Stack>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ borderRadius: 5, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Typography variant="h6">Поток на активността</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Последни промени в продажби, наличности и финанси.
              </Typography>
              <Stack divider={<Divider flexItem />} spacing={0}>
                {(dashboard?.activity || []).map((item, index) => (
                  <Stack
                    key={item._id || `${item.message || "activity"}-${index}`}
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.25}
                    sx={{ py: 1.25 }}
                  >
                    <Chip
                      label={toText(item.severityLabel, "Информация")}
                      size="small"
                      color={severityColorMap[item.severity] || "default"}
                    />
                    <Stack spacing={0.25}>
                      <Typography fontWeight={700}>{toText(item.message)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {toText(item.module)} | {toText(item.actorName, "Система")}
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

function BoxChart({ children, height = 280 }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}
