// Phase 5 - ACH Remittance Parser

export interface ACHPayment {
  amount: number;
  postedDate: string;
  memo?: string;
  ref?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawRow?: any;
}

export interface ACHParseResult {
  payments: ACHPayment[];
  errors: string[];
}

/**
 * Simple CSV parser (no external dependencies)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse ACH CSV file
 * Supports common banking formats:
 * - Amount, Date, Description/Memo, Reference
 * - Flexible column detection
 */
export async function parseAchCSVorXLSX(fileContent: string): Promise<ACHParseResult> {
  const errors: string[] = [];
  const payments: ACHPayment[] = [];

  try {
    const rows = parseCSV(fileContent);

    for (const row of rows) {
      try {
        // Detect amount column
        const amountKey =
          Object.keys(row).find((k) => k.includes('amount') || k.includes('total')) ||
          'amount';
        const amountStr = row[amountKey]?.toString().replace(/[$,]/g, '') || '0';
        const amount = parseFloat(amountStr);

        // Detect date column
        const dateKey =
          Object.keys(row).find((k) => k.includes('date') || k.includes('posted')) ||
          'date';
        const postedDate = row[dateKey] || new Date().toISOString();

        // Detect memo column
        const memoKey =
          Object.keys(row).find(
            (k) => k.includes('memo') || k.includes('description') || k.includes('desc')
          ) || 'memo';
        const memo = row[memoKey] || '';

        // Detect reference column
        const refKey =
          Object.keys(row).find((k) => k.includes('ref') || k.includes('transaction')) || 'ref';
        const ref = row[refKey] || '';

        if (amount > 0) {
          payments.push({
            amount,
            postedDate: new Date(postedDate).toISOString(),
            memo,
            ref,
            rawRow: row,
          });
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (rowError: any) {
        errors.push(`Error parsing row: ${rowError.message}`);
      }
    }

    return { payments, errors };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { payments: [], errors: [error.message] };
  }
}

/**
 * Match ACH payment to CRM jobs
 * Fuzzy matching by claim number, address, insured name in memo
 */
export interface JobMatchCandidate {
  jobId: string;
  score: number;
  matchReason: string;
  job: {
    id: string;
    claimNumber?: string | null;
    insured_name?: string | null;
    propertyAddress?: string | null;
  };
}

export function matchCandidates(
  payment: ACHPayment,
  jobs: Array<{
    id: string;
    claimNumber?: string | null;
    insured_name?: string | null;
    propertyAddress?: string | null;
  }>
): JobMatchCandidate[] {
  const memo = (payment.memo || '').toLowerCase();
  const candidates: JobMatchCandidate[] = [];

  for (const job of jobs) {
    let score = 0;
    const reasons: string[] = [];

    // Match claim number (highest priority)
    if (job.claimNumber && memo.includes(job.claimNumber.toLowerCase())) {
      score += 100;
      reasons.push(`Claim #${job.claimNumber}`);
    }

    // Match insured name
    if (job.insured_name) {
      const nameParts = job.insured_name.toLowerCase().split(' ');
      for (const part of nameParts) {
        if (part.length > 2 && memo.includes(part)) {
          score += 50;
          reasons.push(`Name: ${part}`);
          break;
        }
      }
    }

    // Match property address
    if (job.propertyAddress) {
      const addressParts = job.propertyAddress.toLowerCase().split(/[\s,]+/);
      for (const part of addressParts) {
        if (part.length > 3 && memo.includes(part)) {
          score += 30;
          reasons.push(`Address: ${part}`);
          break;
        }
      }
    }

    if (score > 0) {
      candidates.push({
        jobId: job.id,
        score,
        matchReason: reasons.join(', '),
        job,
      });
    }
  }

  // Sort by score descending
  return candidates.sort((a, b) => b.score - a.score);
}
