import api from "./api";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function prependMessageToDocumentHtml(documentHtml, message) {
  const trimmedMessage = String(message || "").trim();
  if (!trimmedMessage) return documentHtml;

  const messageHtml = `
    <section style="max-width:980px;margin:0 auto;padding:20px 32px 0;color:#111827;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px 16px;background:#f9fafb;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Съобщение</div>
        <div style="white-space:pre-wrap;line-height:1.45;">${escapeHtml(trimmedMessage)}</div>
      </div>
    </section>
  `;

  if (documentHtml.includes("<body>")) {
    return documentHtml.replace("<body>", `<body>${messageHtml}`);
  }

  return `${messageHtml}${documentHtml}`;
}

export async function sendDocumentByEmail({ to, subject, html, documentLabel, message, replyTo }) {
  const enrichedHtml = prependMessageToDocumentHtml(html, message);

  const response = await api.post("/document-mail/send", {
    to,
    subject,
    html: enrichedHtml,
    documentLabel,
    ...(replyTo ? { replyTo } : {})
  });

  return response.data;
}
