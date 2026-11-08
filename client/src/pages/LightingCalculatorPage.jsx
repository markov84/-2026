import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import CalculateRoundedIcon from "@mui/icons-material/CalculateRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader";
import { useFetch } from "../hooks/useFetch";
import { calculateLighting } from "../lib/lightingCalculator";

const SAVED_ROOMS_KEY = "marklight.savedLightingRooms";

function readSavedRooms() {
  if (typeof window === "undefined") return [];

  try {
    const savedRooms = JSON.parse(window.localStorage.getItem(SAVED_ROOMS_KEY) || "[]");
    return Array.isArray(savedRooms) ? savedRooms : [];
  } catch (error) {
    toast.error("Неуспешно зареждане на запазените помещения.");
    return [];
  }
}

const roomTypes = [
  { value: "bedroom", label: "Спалня", illuminance: 150 },
  { value: "living", label: "Дневна", illuminance: 200 },
  { value: "bathroom", label: "Баня", illuminance: 200 },
  { value: "kitchen", label: "Кухня", illuminance: 300 },
  { value: "office", label: "Работен кабинет", illuminance: 500 },
  { value: "hallway", label: "Коридор", illuminance: 100 },
  { value: "custom", label: "Друго / по избор", illuminance: null }
];

const initialValues = {
  roomType: "living",
  length: "4",
  width: "5",
  illuminance: "200",
  lumensPerFixture: "1000",
  utilizationFactor: "0.6",
  maintenanceFactor: "0.8"
};

const numberFields = [
  { key: "length", label: "Дължина", unit: "м", step: "0.1" },
  { key: "width", label: "Ширина", unit: "м", step: "0.1" },
  { key: "illuminance", label: "Целева осветеност", unit: "lx", step: "10" },
  { key: "lumensPerFixture", label: "Светлинен поток на едно тяло", unit: "lm", step: "100" },
  { key: "utilizationFactor", label: "Коефициент на използване", unit: "0–1", step: "0.05" },
  { key: "maintenanceFactor", label: "Коефициент на поддръжка", unit: "0–1", step: "0.05" }
];

function ResultCard({ label, value, unit, highlight = false }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: highlight ? "primary.main" : "divider",
        background: highlight ? "linear-gradient(145deg, rgba(60,98,123,0.12), rgba(60,98,123,0.03))" : "background.paper"
      }}
    >
      <CardContent>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ mt: 1 }}>
          <Typography variant="h4" fontWeight={800} color={highlight ? "primary.main" : "text.primary"}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">{unit}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function LightingCalculatorPage() {
  const { data: products } = useFetch("/products");
  const [values, setValues] = useState(initialValues);
  const [calculation, setCalculation] = useState(() => calculateLighting({
    length: initialValues.length,
    width: initialValues.width,
    illuminance: initialValues.illuminance,
    lumensPerFixture: initialValues.lumensPerFixture,
    utilizationFactor: initialValues.utilizationFactor,
    maintenanceFactor: initialValues.maintenanceFactor
  }));
  const [validationMessage, setValidationMessage] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [savedRooms, setSavedRooms] = useState(readSavedRooms);
  const [roomName, setRoomName] = useState("");
  const [selectedSavedRoomId, setSelectedSavedRoomId] = useState("");

  const lightingProducts = products.filter(
    (product) => product?.isActive !== false && Number(product?.luminousFlux) > 0
  );

  function updateField(key, value) {
    const nextValues = { ...values, [key]: value };

    if (key === "roomType") {
      const selectedRoom = roomTypes.find((room) => room.value === value);
      if (selectedRoom?.illuminance) nextValues.illuminance = String(selectedRoom.illuminance);
    }
    setValues(nextValues);

    try {
      const result = calculateLighting({
        length: nextValues.length,
        width: nextValues.width,
        illuminance: nextValues.illuminance,
        lumensPerFixture: nextValues.lumensPerFixture,
        utilizationFactor: nextValues.utilizationFactor,
        maintenanceFactor: nextValues.maintenanceFactor
      });
      setCalculation(result);
      setValidationMessage("");
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setCalculation(null);
      setValidationMessage(error.message);
    }
  }

  function persistSavedRooms(nextRooms) {
    try {
      window.localStorage.setItem(SAVED_ROOMS_KEY, JSON.stringify(nextRooms));
      setSavedRooms(nextRooms);
    } catch (error) {
      toast.error("Неуспешно запазване. Провери свободното място в браузъра.");
      return false;
    }
    return true;
  }

  function saveRoom() {
    const name = roomName.trim();
    if (!name) {
      toast.error("Въведи име на помещението или проекта.");
      return;
    }
    if (!calculation) {
      toast.error("Поправи параметрите преди запазване.");
      return;
    }

    const savedRoom = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      values,
      selectedProductId,
      updatedAt: new Date().toISOString()
    };
    const nextRooms = [
      savedRoom,
      ...savedRooms.filter((room) => room.name.toLocaleLowerCase() !== name.toLocaleLowerCase())
    ].slice(0, 30);

    if (persistSavedRooms(nextRooms)) {
      setSelectedSavedRoomId(savedRoom.id);
      toast.success("Изчислението е запазено на това устройство.");
    }
  }

  function loadRoom(roomId) {
    const room = savedRooms.find((item) => item.id === roomId);
    if (!room) return;
    setSelectedProductId(room.selectedProductId || "");
    setSelectedSavedRoomId(room.id);
    setRoomName(room.name);
    setValues(room.values);
    try {
      setCalculation(calculateLighting({
        length: room.values.length,
        width: room.values.width,
        illuminance: room.values.illuminance,
        lumensPerFixture: room.values.lumensPerFixture,
        utilizationFactor: room.values.utilizationFactor,
        maintenanceFactor: room.values.maintenanceFactor
      }));
      setValidationMessage("");
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setCalculation(null);
      setValidationMessage(error.message);
    }
    toast.success(`Заредено помещение „${room.name}“.`);
  }

  function deleteRoom(roomId) {
    const nextRooms = savedRooms.filter((room) => room.id !== roomId);
    if (persistSavedRooms(nextRooms)) toast.success("Запазеното помещение е изтрито.");
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 3 } }}>
      <PageHeader
        eyebrow="ПЛАНИРАНЕ НА ОСВЕТЛЕНИЕ"
        title="Калкулатор за осветление"
        subtitle="Оцени ориентировъчния брой осветителни тела според размера на помещението и желаната осветеност."
        icon={<CalculateRoundedIcon />}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.1fr) minmax(320px, 0.9fr)" },
          gap: 2.5,
          alignItems: "start"
        }}
      >
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LightbulbOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={750}>Параметри на помещението</Typography>
              </Stack>

              <TextField
                select
                fullWidth
                label="Тип помещение"
                value={values.roomType}
                onChange={(event) => updateField("roomType", event.target.value)}
              >
                {roomTypes.map((room) => (
                  <MenuItem key={room.value} value={room.value}>{room.label}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Осветително тяло от каталога"
                value={selectedProductId}
                onChange={(event) => {
                  const productId = event.target.value;
                  setSelectedProductId(productId);
                  if (productId) {
                    const product = lightingProducts.find((item) => item._id === productId);
                    if (product) updateField("lumensPerFixture", String(product.luminousFlux));
                  }
                }}
                helperText={lightingProducts.length
                  ? "Изборът попълва светлинния поток от продуктовия каталог."
                  : "Добави светлинен поток (lm) в продукта или въведи стойност ръчно."}
              >
                <MenuItem value="">Ръчно въвеждане</MenuItem>
                {lightingProducts.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} — {Number(product.luminousFlux).toLocaleString("bg-BG")} lm
                  </MenuItem>
                ))}
              </TextField>

              {savedRooms.length > 0 ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "minmax(0, 1fr) auto" }, gap: 1, alignItems: "center" }}>
                  <TextField
                    select
                    fullWidth
                    label="Запазени помещения"
                    value={selectedSavedRoomId}
                    onChange={(event) => loadRoom(event.target.value)}
                  >
                    <MenuItem value="">Избери помещение</MenuItem>
                    {savedRooms.map((room) => (
                      <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>
                    ))}
                  </TextField>
                  <IconButton
                    aria-label="Изтрий избраното помещение"
                    title="Изтрий избраното помещение"
                    disabled={!selectedSavedRoomId}
                    onClick={() => {
                      deleteRoom(selectedSavedRoomId);
                      setSelectedSavedRoomId("");
                    }}
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </Box>
              ) : null}

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                {numberFields.map((field) => (
                  <TextField
                    key={field.key}
                    type="number"
                    label={field.label}
                    value={values[field.key]}
                    onChange={(event) => {
                      if (field.key === "lumensPerFixture") setSelectedProductId("");
                      updateField(field.key, event.target.value);
                    }}
                    inputProps={{ min: field.key.endsWith("Factor") ? 0.01 : 0.1, step: field.step }}
                    InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">{field.unit}</Typography> }}
                    fullWidth
                  />
                ))}
              </Box>

              {validationMessage ? <Alert severity="warning">{validationMessage}</Alert> : null}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  fullWidth
                  label="Име на помещение / проект"
                  placeholder="Например: Дневна — апартамент"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                />
                <Button
                  variant="outlined"
                  startIcon={<SaveRoundedIcon />}
                  onClick={saveRoom}
                  sx={{ flexShrink: 0 }}
                >
                  Запази
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Запазените помещения се съхраняват локално в този браузър и не се споделят между устройства.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2}>
          <Card
            sx={{
              color: "#fff",
              background: "linear-gradient(135deg, #24485f 0%, #3c627b 58%, #557f91 100%)"
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.78)" }}>
                Ориентировъчен брой осветителни тела
              </Typography>
              <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1 }}>
                <Typography variant="h2" fontWeight={850} lineHeight={1}>
                  {calculation?.fixtureCount ?? "—"}
                </Typography>
                <Typography variant="body1">бр.</Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 1.5, color: "rgba(255,255,255,0.84)" }}>
                за помещение с площ {calculation ? `${calculation.area.toLocaleString("bg-BG")} м²` : "—"}
              </Typography>
            </CardContent>
          </Card>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, minmax(0, 1fr))", md: "1fr" }, gap: 1.5 }}>
            <ResultCard
              label="Необходим светлинен поток"
              value={calculation ? Math.ceil(calculation.requiredLumens).toLocaleString("bg-BG") : "—"}
              unit="lm"
            />
            <ResultCard
              label="Общ поток на избраните тела"
              value={calculation ? Math.ceil(calculation.installedLumens).toLocaleString("bg-BG") : "—"}
              unit="lm"
            />
            <ResultCard
              label="Очаквана осветеност"
              value={calculation ? Math.round(calculation.estimatedIlluminance).toLocaleString("bg-BG") : "—"}
              unit="lx"
              highlight
            />
          </Box>
        </Stack>
      </Box>

      <Alert severity="info" sx={{ mt: 2.5 }}>
        Резултатът е ориентировъчен: реалната осветеност зависи и от височината и разположението на телата,
        оптиката, цветовете на повърхностите и други характеристики на помещението. За проектно решение
        направи фотометрично изчисление с конкретния модел осветител.
      </Alert>
    </Box>
  );
}
