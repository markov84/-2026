import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getSmtpDiagnostics, sendDocumentEmail, verifyMailerConnection } from "../lib/mailer.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("admin"));

router.get("/health", async (req, res, next) => {
  try {
    const diagnostics = getSmtpDiagnostics();
    const response = {
      smtp: diagnostics,
      mailerVerified: false
    };

    if (diagnostics.configured) {
      await verifyMailerConnection();
      response.mailerVerified = true;
    }

    return res.status(diagnostics.configured ? 200 : 503).json(response);
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({
      message: error?.message || "Неуспешно изпращане на имейл.",
      details: error?.details || null
    });
  }
});

router.post(
  "/test",
  [
    body("to").trim().isEmail().withMessage("Invalid recipient email."),
    body("subject").optional({ values: "falsy" }).trim().isLength({ min: 3, max: 180 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid test email payload.", errors: errors.array() });
      }

      const { to, subject } = req.body;
      await sendDocumentEmail({
        to,
        subject: subject || "SMTP тест от MARK LIGHT",
        html: "<p>SMTP тест: конфигурацията работи успешно.</p>"
      });

      return res.status(200).json({
        message: "Тестовият имейл е изпратен успешно.",
        to
      });
    } catch (error) {
      const status = Number(error?.status || 500);
      return res.status(status).json({
        message: error?.message || "Неуспешно изпращане на имейл.",
        details: error?.details || null
      });
    }
  }
);

router.post(
  "/send",
  [
    body("to").trim().isEmail().withMessage("Invalid recipient email."),
    body("subject").trim().isLength({ min: 3, max: 180 }).withMessage("Invalid email subject."),
    body("html").isString().isLength({ min: 20, max: 350000 }).withMessage("Invalid email content."),
    body("replyTo").optional({ values: "falsy" }).trim().isEmail().withMessage("Invalid reply-to email."),
    body("documentLabel").optional({ values: "falsy" }).trim().isLength({ max: 120 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid email payload.", errors: errors.array() });
      }

      const { to, subject, html, replyTo, documentLabel } = req.body;

      await sendDocumentEmail({
        to,
        subject,
        html,
        replyTo
      });

      return res.status(200).json({
        message: `Имейлът за ${documentLabel || "документа"} е изпратен успешно.`,
        to
      });
    } catch (error) {
      const status = Number(error?.status || 500);
      return res.status(status).json({
        message: error?.message || "Неуспешно изпращане на имейл.",
        details: error?.details || null
      });
    }
  }
);

export default router;
