export function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  if (error?.code === 11000) {
    return res.status(409).json({
      message: "Вече съществува запис със същия номер."
    });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Заявката е твърде голяма. Избери по-малка снимка или я намали преди качване."
    });
  }

  if (error?.name === "MongoServerSelectionError" || error?.name === "MongoNetworkError") {
    return res.status(503).json({
      message: "Базата данни временно не е достъпна. Провери MongoDB Atlas, мрежата и дали порт 27017 не е блокиран."
    });
  }

  return res.status(error.statusCode || error.status || 500).json({
    message: error.message || "Unexpected server error."
  });
}
