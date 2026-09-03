export type TaxConfig = {
  enabled: boolean;
  /** Taux TPS en pourcentage, ex. 5 */
  gstRate: number;
  /** Taux TVQ en pourcentage, ex. 9.975 */
  qstRate: number;
};

export type TaxBreakdown = {
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
};

/**
 * Calcule TPS et TVQ sur un sous-total. Au Québec, la TVQ s'applique sur le
 * prix de vente (elle n'est pas calculée sur la TPS).
 */
export function computeTaxes(
  subtotalCents: number,
  config: TaxConfig,
): TaxBreakdown {
  if (!config.enabled) {
    return {
      subtotalCents,
      gstCents: 0,
      qstCents: 0,
      totalCents: subtotalCents,
    };
  }

  const gstCents = Math.round((subtotalCents * config.gstRate) / 100);
  const qstCents = Math.round((subtotalCents * config.qstRate) / 100);

  return {
    subtotalCents,
    gstCents,
    qstCents,
    totalCents: subtotalCents + gstCents + qstCents,
  };
}
