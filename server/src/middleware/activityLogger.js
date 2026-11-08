import { ActivityLog } from "../models/ActivityLog.js";

const methodActions = {
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete"
};

const excludedFields = new Set(["password", "currentPassword", "newPassword", "token"]);

export function activityLogger(req, res, next) {
  const action = methodActions[req.method];
  if (!action) return next();

  const originalJson = res.json;
  res.json = function captureCreatedRecordId(body) {
    const recordId = body?._id || body?.id;
    if (recordId) res.locals.activityResourceId = String(recordId);
    return originalJson.call(this, body);
  };

  res.once("finish", () => {
    if (res.statusCode >= 400 || !req.user?._id) return;

    const segments = String(req.originalUrl || "")
      .split("?")[0]
      .split("/")
      .filter(Boolean);
    const apiIndex = segments.indexOf("api");
    const resource = segments[apiIndex + 1];
    if (!resource || resource === "auth") return;

    const changedFields = Object.keys(req.body || {})
      .filter((field) => !excludedFields.has(field))
      .slice(0, 40);
    const resourceIdParam = Object.entries(req.params || {}).find(([key]) =>
      key.toLocaleLowerCase().endsWith("id")
    )?.[1];

    ActivityLog.create({
      actorUser: req.user._id,
      actorName: req.user.fullName || req.user.username || "Потребител",
      actorRole: req.user.role || "unknown",
      action,
      resource,
      resourceId: resourceIdParam ? String(resourceIdParam) : res.locals.activityResourceId,
      changedFields
    }).catch((error) => {
      console.error("Неуспешен запис в журнала на промените:", error);
    });
  });

  return next();
}
