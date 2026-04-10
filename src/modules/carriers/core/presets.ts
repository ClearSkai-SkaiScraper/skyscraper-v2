// Phase 5 - Carrier Profiles & Presets

export interface CarrierTerminology {
  depreciation?: string;
  supplement?: string;
  acv?: string;
  rcv?: string;
  deductible?: string;
  holdback?: string;
}

export interface CarrierEmailPhrasing {
  depreciationSubject?: string;
  depreciationBody?: string;
  supplementSubject?: string;
  supplementBody?: string;
}

export interface CarrierPreset {
  id: string;
  name: string;
  terminology: CarrierTerminology;
  emailPhrasing: CarrierEmailPhrasing;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signatureFormat?: any;
}

/**
 * Built-in carrier presets
 */
export const BUILT_IN_CARRIERS: CarrierPreset[] = [
  {
    id: 'state-farm',
    name: 'State Farm',
    terminology: {
      depreciation: 'Recoverable Depreciation',
      supplement: 'Supplement',
      acv: 'ACV',
      rcv: 'RCV',
      deductible: 'Deductible',
      holdback: 'Depreciation Holdback',
    },
    emailPhrasing: {
      depreciationSubject: 'Depreciation Release Request - Claim #[CLAIM_NUMBER]',
      depreciationBody:
        'We have completed the repairs and respectfully request release of the recoverable depreciation.',
      supplementSubject: 'Supplement Request - Claim #[CLAIM_NUMBER]',
      supplementBody:
        'Additional work was required beyond the original scope. Please review the attached supplement.',
    },
  },
  {
    id: 'aaa',
    name: 'AAA',
    terminology: {
      depreciation: 'Holdback',
      supplement: 'Additional Allowance',
      acv: 'Actual Cash Value',
      rcv: 'Replacement Cost Value',
      deductible: 'Deductible',
      holdback: 'Depreciation Holdback',
    },
    emailPhrasing: {
      depreciationSubject: 'Holdback Release Request - Claim #[CLAIM_NUMBER]',
      depreciationBody:
        'Work is complete. Please release the depreciation holdback at your earliest convenience.',
      supplementSubject: 'Additional Allowance Request - Claim #[CLAIM_NUMBER]',
      supplementBody:
        'Unforeseen conditions required additional work. Please review the attached documentation.',
    },
  },
  {
    id: 'farmers',
    name: 'Farmers Insurance',
    terminology: {
      depreciation: 'Depreciation',
      supplement: 'Additional Payment',
      acv: 'ACV',
      rcv: 'Replacement Cost',
      deductible: 'Policy Deductible',
      holdback: 'Withheld Depreciation',
    },
    emailPhrasing: {
      depreciationSubject: 'Depreciation Payment Request - Claim #[CLAIM_NUMBER]',
      depreciationBody: 'Repairs completed. Requesting release of withheld depreciation.',
      supplementSubject: 'Additional Payment Request - Claim #[CLAIM_NUMBER]',
      supplementBody: 'Supplemental work completed. Please review attached estimate.',
    },
  },
  {
    id: 'allstate',
    name: 'Allstate',
    terminology: {
      depreciation: 'Depreciation',
      supplement: 'Supplemental Estimate',
      acv: 'Actual Cash Value',
      rcv: 'Replacement Cost Value',
      deductible: 'Deductible',
      holdback: 'Depreciation Holdback',
    },
    emailPhrasing: {
      depreciationSubject: 'RCV Release Request - Claim #[CLAIM_NUMBER]',
      depreciationBody: 'Work completed to code. Requesting RCV payment release.',
      supplementSubject: 'Supplemental Estimate - Claim #[CLAIM_NUMBER]',
      supplementBody: 'Additional scope identified. Please review supplemental estimate.',
    },
  },
  {
    id: 'usaa',
    name: 'USAA',
    terminology: {
      depreciation: 'Recoverable Depreciation',
      supplement: 'Supplement',
      acv: 'ACV',
      rcv: 'Replacement Cost',
      deductible: 'Deductible',
      holdback: 'Depreciation',
    },
    emailPhrasing: {
      depreciationSubject: 'Depreciation Release - Claim [CLAIM_NUMBER]',
      depreciationBody: 'Repairs are complete. Requesting depreciation payment.',
      supplementSubject: 'Supplement - Claim [CLAIM_NUMBER]',
      supplementBody: 'Supplemental work required. Please review attached documentation.',
    },
  },
];

/**
 * Get carrier preset by ID
 */
export function getCarrierPreset(carrierId: string): CarrierPreset | undefined {
  return BUILT_IN_CARRIERS.find((c) => c.id === carrierId);
}

/**
 * Apply carrier terminology to text
 */
export function applyCarrierTerminology(
  text: string,
  preset: CarrierPreset,
  tokens: Record<string, string> = {}
): string {
  let result = text;

  // Apply terminology replacements
  if (preset.terminology.depreciation) {
    result = result.replace(/\[DEPRECIATION\]/gi, preset.terminology.depreciation);
  }
  if (preset.terminology.supplement) {
    result = result.replace(/\[SUPPLEMENT\]/gi, preset.terminology.supplement);
  }

  // Apply dynamic tokens
  Object.entries(tokens).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
  });

  return result;
}
