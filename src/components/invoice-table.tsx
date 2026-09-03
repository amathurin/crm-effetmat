import { formatCents } from "@/lib/money";

type Line = {
  id: string;
  description: string;
  quantity: number;
  unitCents: number;
  amountCents: number;
};

export function InvoiceTable({
  lineItems,
  subtotalCents,
  gstCents,
  qstCents,
  totalCents,
  gstRate,
  qstRate,
  showTaxes,
  action,
}: {
  lineItems: Line[];
  subtotalCents: number;
  gstCents: number;
  qstCents: number;
  totalCents: number;
  gstRate: number;
  qstRate: number;
  showTaxes: boolean;
  /** Rendu optionnel d'une action par ligne (ex. supprimer). */
  action?: (line: Line) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-muted">
            <th className="py-2 pr-2 font-medium">Description</th>
            <th className="py-2 px-2 text-right font-medium">Qté</th>
            <th className="py-2 px-2 text-right font-medium">Prix</th>
            <th className="py-2 pl-2 text-right font-medium">Montant</th>
            {action ? <th className="w-8" /> : null}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((l) => (
            <tr key={l.id} className="border-b border-border">
              <td className="py-2 pr-2 text-text">{l.description}</td>
              <td className="py-2 px-2 text-right text-text-muted">
                {l.quantity}
              </td>
              <td className="py-2 px-2 text-right text-text-muted">
                {formatCents(l.unitCents)}
              </td>
              <td className="py-2 pl-2 text-right text-text">
                {formatCents(l.amountCents)}
              </td>
              {action ? (
                <td className="py-2 pl-2 text-right">{action(l)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 pr-2 text-right text-text-muted">
              Sous-total
            </td>
            <td className="py-2 pl-2 text-right text-text">
              {formatCents(subtotalCents)}
            </td>
            {action ? <td /> : null}
          </tr>
          {showTaxes ? (
            <>
              <tr>
                <td colSpan={3} className="py-1 pr-2 text-right text-text-muted">
                  TPS ({gstRate} %)
                </td>
                <td className="py-1 pl-2 text-right text-text">
                  {formatCents(gstCents)}
                </td>
                {action ? <td /> : null}
              </tr>
              <tr>
                <td colSpan={3} className="py-1 pr-2 text-right text-text-muted">
                  TVQ ({qstRate} %)
                </td>
                <td className="py-1 pl-2 text-right text-text">
                  {formatCents(qstCents)}
                </td>
                {action ? <td /> : null}
              </tr>
            </>
          ) : null}
          <tr className="border-t border-border">
            <td colSpan={3} className="py-2 pr-2 text-right font-semibold text-text">
              Total
            </td>
            <td className="py-2 pl-2 text-right font-semibold text-text">
              {formatCents(totalCents)}
            </td>
            {action ? <td /> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
