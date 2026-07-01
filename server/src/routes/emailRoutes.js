import { Router } from "express";
import { body, validationResult } from "express-validator";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendEmail } from "../lib/mailer.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "manager", "sales", "warehouse"));

router.post(
  "/send-document",
  [
    body("to").trim().isEmail().withMessage("Невалиден имейл адрес."),
    body("subject").trim().notEmpty().isLength({ max: 200 }),
    body("text").trim().notEmpty().isLength({ max: 20000 }),
    body("html").optional({ nullable: true }).isString().isLength({ max: 40000 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Невалидни данни за изпращане на имейл.",
        errors: errors.array()
      });
    }

    try {
      const info = await sendEmail({
        to: req.body.to,
        subject: req.body.subject,
        text: req.body.text,
        html: req.body.html
      });

      return res.status(200).json({
        message: "Имейлът е изпратен успешно.",
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      });
    } catch (error) {
      return res.status(500).json({
        message: "Изпращането на имейл е неуспешно. Провери SMTP настройките.",
        details: error.message
      });
    }
  })
);

export default router;
