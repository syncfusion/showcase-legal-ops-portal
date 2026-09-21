// Invoice row types shared by Matters and Invoices tabs.

import type { InvoiceSummary, LineItemRow } from '../../models/api';

export type { LineItemRow };

export interface InvoiceRow extends InvoiceSummary {
  id: string;
  firmName: string;
  displayStatus: string;
  currency: string;
  lineItems: LineItemRow[];
}