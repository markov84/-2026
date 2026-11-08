export function calculateLighting({
  length,
  width,
  illuminance,
  lumensPerFixture,
  utilizationFactor,
  maintenanceFactor
}) {
  const values = {
    length: Number(length),
    width: Number(width),
    illuminance: Number(illuminance),
    lumensPerFixture: Number(lumensPerFixture),
    utilizationFactor: Number(utilizationFactor),
    maintenanceFactor: Number(maintenanceFactor)
  };

  if (Object.values(values).some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("Всички стойности трябва да бъдат положителни числа.");
  }

  if (values.utilizationFactor > 1 || values.maintenanceFactor > 1) {
    throw new RangeError("Коефициентите трябва да бъдат между 0 и 1.");
  }

  const area = values.length * values.width;
  const requiredLumens =
    (area * values.illuminance) / (values.utilizationFactor * values.maintenanceFactor);
  const fixtureCount = Math.ceil(requiredLumens / values.lumensPerFixture);
  const installedLumens = fixtureCount * values.lumensPerFixture;
  const estimatedIlluminance =
    (installedLumens * values.utilizationFactor * values.maintenanceFactor) / area;

  return {
    area,
    requiredLumens,
    fixtureCount,
    installedLumens,
    estimatedIlluminance
  };
}
