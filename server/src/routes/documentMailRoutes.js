import { Router } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { sendDocumentEmail } from "../lib/mailer.js";

const router = Router();

router.use(requireAuth);

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
      return next(error);
    }
  }
);

export default router;
