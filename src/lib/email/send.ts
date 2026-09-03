import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "CRM Studio <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

export type EmailAttachment = { filename: string; content: string };

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult = { sent: boolean; error?: string };

/**
 * Envoie un email via Resend. Sans `RESEND_API_KEY`, l'email est simplement
 * affiché dans la console (mode développement) — l'appelant ne doit jamais
 * échouer à cause de l'email.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!resend) {
    console.info(
      [
        "",
        "─── EMAIL (mode console — RESEND_API_KEY absent) ───",
        `À        : ${Array.isArray(input.to) ? input.to.join(", ") : input.to}`,
        `Sujet    : ${input.subject}`,
        input.replyTo ? `Répondre : ${input.replyTo}` : null,
        input.attachments?.length
          ? `Pièces   : ${input.attachments.map((a) => a.filename).join(", ")}`
          : null,
        "",
        input.text,
        "───────────────────────────────────────────────────",
        "",
      ]
        .filter((l) => l !== null)
        .join("\n"),
    );
    return { sent: false };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      attachments: input.attachments,
    });
    if (error) {
      console.error("Resend error:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("Resend threw:", err);
    return { sent: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
