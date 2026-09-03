function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1d21;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #e3e6ea;border-radius:12px;padding:28px;">
      <h1 style="margin:0 0 16px;font-size:18px;">${esc(title)}</h1>
      ${bodyHtml}
    </div>
    <p style="margin:16px 4px 0;font-size:12px;color:#667085;">
      Ce courriel a été envoyé automatiquement par le système de réservation.
    </p>
  </div>
</body>
</html>`;
}

function rows(items: { label: string; value: string }[]): string {
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
    ${items
      .map(
        (r) => `<tr>
      <td style="padding:6px 0;color:#667085;font-size:13px;vertical-align:top;width:38%;">${esc(r.label)}</td>
      <td style="padding:6px 0;font-size:14px;">${esc(r.value)}</td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

type Email = { subject: string; html: string; text: string };

export function bookingConfirmationEmail(p: {
  clientName: string;
  businessName: string;
  packageName: string;
  whenLabel: string;
  address: string;
  confirmed: boolean;
}): Email {
  const subject = p.confirmed
    ? `Confirmation de votre séance — ${p.whenLabel}`
    : `Demande de réservation reçue — ${p.whenLabel}`;

  const intro = p.confirmed
    ? `Bonjour ${p.clientName}, votre séance est confirmée. Voici les détails :`
    : `Bonjour ${p.clientName}, votre demande a bien été reçue. Elle sera confirmée sous peu par ${p.businessName}.`;

  const detail = rows([
    { label: "Prestation", value: p.packageName },
    { label: "Date et heure", value: p.whenLabel },
    { label: "Adresse", value: p.address },
    {
      label: "Statut",
      value: p.confirmed ? "Confirmée" : "En attente de confirmation",
    },
  ]);

  const outro = p.confirmed
    ? `Un fichier d'agenda est joint à ce courriel. La facture vous sera envoyée après la séance.`
    : `Vous recevrez un second courriel dès que la séance sera confirmée.`;

  const html = layout(
    p.confirmed ? "Séance confirmée" : "Demande reçue",
    `<p style="font-size:14px;line-height:1.5;">${esc(intro)}</p>${detail}<p style="font-size:14px;line-height:1.5;color:#667085;">${esc(outro)}</p>`,
  );

  const text = [
    intro,
    "",
    `Prestation : ${p.packageName}`,
    `Date et heure : ${p.whenLabel}`,
    `Adresse : ${p.address}`,
    `Statut : ${p.confirmed ? "Confirmée" : "En attente de confirmation"}`,
    "",
    outro,
  ].join("\n");

  return { subject, html, text };
}

export function bookingReminderEmail(p: {
  clientName: string;
  businessName: string;
  packageName: string;
  whenLabel: string;
  address: string;
}): Email {
  const subject = `Rappel — séance ${p.whenLabel}`;
  const detail = rows([
    { label: "Prestation", value: p.packageName },
    { label: "Date et heure", value: p.whenLabel },
    { label: "Adresse", value: p.address },
  ]);
  const html = layout(
    "Rappel de séance",
    `<p style="font-size:14px;line-height:1.5;">Bonjour ${esc(p.clientName)}, petit rappel de votre séance avec ${esc(p.businessName)} :</p>${detail}<p style="font-size:13px;color:#667085;">Assurez-vous que la propriété soit prête (rangée, éclairée, stationnement dégagé).</p>`,
  );
  const text = [
    `Bonjour ${p.clientName}, rappel de votre séance avec ${p.businessName} :`,
    "",
    `Prestation : ${p.packageName}`,
    `Date et heure : ${p.whenLabel}`,
    `Adresse : ${p.address}`,
    "",
    "Assurez-vous que la propriété soit prête (rangée, éclairée, stationnement dégagé).",
  ].join("\n");
  return { subject, html, text };
}

export function invoiceSentEmail(p: {
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  totalLabel: string;
  dueLabel: string;
  viewUrl: string;
  payUrl: string | null;
  paymentInstructions: string;
}): Email {
  const subject = `Facture ${p.invoiceNumber} — ${p.businessName}`;

  const cta = p.payUrl
    ? `<p style="margin:16px 0;"><a href="${esc(p.payUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">Payer la facture</a></p>`
    : `<p style="font-size:14px;line-height:1.5;">${esc(p.paymentInstructions || "Les modalités de paiement vous seront communiquées séparément.")}</p>`;

  const html = layout(
    `Facture ${p.invoiceNumber}`,
    `<p style="font-size:14px;line-height:1.5;">Bonjour ${esc(p.clientName)},</p>
     <p style="font-size:14px;line-height:1.5;">Voici votre facture de ${esc(p.totalLabel)}, échéance le ${esc(p.dueLabel)}.</p>
     ${cta}
     <p style="font-size:13px;color:#667085;"><a href="${esc(p.viewUrl)}" style="color:#4f46e5;">Voir la facture en ligne</a></p>`,
  );

  const text = [
    `Bonjour ${p.clientName},`,
    "",
    `Facture ${p.invoiceNumber} — ${p.totalLabel}`,
    `Échéance : ${p.dueLabel}`,
    "",
    p.payUrl ? `Payer : ${p.payUrl}` : p.paymentInstructions,
    `Voir la facture : ${p.viewUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export function invoiceOverdueEmail(p: {
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  totalLabel: string;
  dueLabel: string;
  viewUrl: string;
  payUrl: string | null;
  paymentInstructions: string;
}): Email {
  const subject = `Rappel — facture ${p.invoiceNumber} échue`;
  const cta = p.payUrl
    ? `<p style="margin:16px 0;"><a href="${esc(p.payUrl)}" style="display:inline-block;background:#004438;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;">Payer maintenant</a></p>`
    : `<p style="font-size:14px;line-height:1.5;">${esc(p.paymentInstructions || "Merci de régler dès que possible.")}</p>`;
  const html = layout(
    `Facture ${p.invoiceNumber} échue`,
    `<p style="font-size:14px;line-height:1.5;">Bonjour ${esc(p.clientName)}, la facture ${esc(p.invoiceNumber)} de ${esc(p.totalLabel)}, échue le ${esc(p.dueLabel)}, demeure impayée.</p>${cta}<p style="font-size:13px;color:#667085;"><a href="${esc(p.viewUrl)}" style="color:#004438;">Voir la facture</a></p>`,
  );
  const text = [
    `Bonjour ${p.clientName},`,
    "",
    `Rappel : la facture ${p.invoiceNumber} (${p.totalLabel}), échue le ${p.dueLabel}, est impayée.`,
    "",
    p.payUrl ? `Payer : ${p.payUrl}` : p.paymentInstructions,
    `Voir la facture : ${p.viewUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, html, text };
}

export function paymentReceiptEmail(p: {
  clientName: string;
  businessName: string;
  invoiceNumber: string;
  totalLabel: string;
  paidLabel: string;
  viewUrl: string;
}): Email {
  const subject = `Reçu — facture ${p.invoiceNumber}`;
  const html = layout(
    "Paiement reçu",
    `<p style="font-size:14px;line-height:1.5;">Bonjour ${esc(p.clientName)}, nous confirmons la réception de votre paiement de ${esc(p.totalLabel)} pour la facture ${esc(p.invoiceNumber)} le ${esc(p.paidLabel)}. Merci !</p>
     <p style="font-size:13px;color:#667085;"><a href="${esc(p.viewUrl)}" style="color:#4f46e5;">Voir la facture</a></p>`,
  );
  const text = [
    `Bonjour ${p.clientName},`,
    "",
    `Paiement reçu : ${p.totalLabel} — facture ${p.invoiceNumber} (${p.paidLabel}).`,
    `Voir la facture : ${p.viewUrl}`,
    "",
    "Merci !",
  ].join("\n");
  return { subject, html, text };
}

export function ownerBookingNotificationEmail(p: {
  businessName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  packageName: string;
  whenLabel: string;
  address: string;
  notes: string | null;
  confirmed: boolean;
  bookingUrl: string;
}): Email {
  const subject = `${p.confirmed ? "Nouvelle réservation" : "Nouvelle demande"} — ${p.clientName}, ${p.whenLabel}`;

  const detail = rows([
    { label: "Client", value: p.clientName },
    { label: "Courriel", value: p.clientEmail },
    { label: "Téléphone", value: p.clientPhone ?? "—" },
    { label: "Prestation", value: p.packageName },
    { label: "Date et heure", value: p.whenLabel },
    { label: "Adresse", value: p.address },
    { label: "Notes", value: p.notes ?? "—" },
    {
      label: "Statut",
      value: p.confirmed ? "Confirmée automatiquement" : "À confirmer",
    },
  ]);

  const html = layout(
    p.confirmed ? "Nouvelle réservation" : "Nouvelle demande de réservation",
    `${detail}<p style="font-size:14px;"><a href="${esc(p.bookingUrl)}" style="color:#4f46e5;">Ouvrir dans le CRM →</a></p>`,
  );

  const text = [
    `${p.confirmed ? "Nouvelle réservation" : "Nouvelle demande"} via la page publique.`,
    "",
    `Client : ${p.clientName}`,
    `Courriel : ${p.clientEmail}`,
    `Téléphone : ${p.clientPhone ?? "—"}`,
    `Prestation : ${p.packageName}`,
    `Date et heure : ${p.whenLabel}`,
    `Adresse : ${p.address}`,
    `Notes : ${p.notes ?? "—"}`,
    `Statut : ${p.confirmed ? "Confirmée automatiquement" : "À confirmer"}`,
    "",
    `Ouvrir : ${p.bookingUrl}`,
  ].join("\n");

  return { subject, html, text };
}
