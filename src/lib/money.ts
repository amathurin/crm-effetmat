const CAD = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
});

/** Formate un montant en cents vers « 1 234,56 $ ». */
export function formatCents(cents: number): string {
  return CAD.format((cents ?? 0) / 100);
}

/** Formate un montant en cents sans symbole : « 1 234,56 ». */
export function formatCentsPlain(cents: number): string {
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

/**
 * Convertit une saisie utilisateur (« 1 234,56 », « 1234.56 », « 1,234.56 $ »)
 * en cents entiers. Retourne null si non interprétable.
 */
export function parseAmountToCents(input: string): number | null {
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/[^\d.,-]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : lastDot > -1 ? "." : null;

  if (decimalSep === ",") {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const value = Number.parseFloat(s);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}
