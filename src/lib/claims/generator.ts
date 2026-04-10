// ============================================================================
// CLAIMS PACKET GENERATOR - PDF & DOCX CREATION
// ============================================================================
// Generates professional insurance claims packets with auto-photo layout
// ============================================================================

import * as Sentry from "@sentry/nextjs";
import {
  AlignmentType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  convertInchesToTwip,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { logger } from "@/lib/logger";

import { ClaimPacketData, PACKET_FOOTERS,PACKET_HEADERS, PacketVersion } from "./templates";

export interface GeneratePacketOptions {
  data: ClaimPacketData;
  version: PacketVersion;
  format: "pdf" | "docx";
  includeWeatherPage?: boolean; // Optional for retail
}

export async function generateClaimPacket(options: GeneratePacketOptions): Promise<Blob> {
  const { data, version, format, includeWeatherPage = true } = options;

  try {
    logger.info(`[CLAIM_PACKET] Generating ${version} packet in ${format} format`);

    if (format === "docx") {
      return await generateDOCX(data, version, includeWeatherPage);
    } else {
      return await generatePDF(data, version, includeWeatherPage);
    }
  } catch (error) {
    logger.error("[CLAIM_PACKET] Generation failed:", error);
    Sentry.captureException(error, {
      tags: { component: "claim-packet", format, version },
      extra: { insured_name: data.insured_name, propertyAddress: data.propertyAddress },
    });
    throw error;
  }
}

// ============================================================================
// HELPER: Fetch image and convert to buffer for DOCX
// ============================================================================
async function fetchImageBuffer(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    logger.error(`[CLAIM_PACKET] Failed to fetch image ${url}:`, error);
    throw error;
  }
}

async function generateDOCX(
  data: ClaimPacketData,
  version: PacketVersion,
  includeWeather: boolean
): Promise<Blob> {
  if (version === "retail") {
    return generateRetailDOCX(data, includeWeather);
  }

  return generateInsuranceDOCX(data, includeWeather);
}

// ========== INSURANCE VERSION (Original) ==========
async function generateInsuranceDOCX(
  data: ClaimPacketData,
  includeWeather: boolean
): Promise<Blob> {
  const sections: Paragraph[] = [];

  // Page 1: Cover Sheet
  sections.push(
    new Paragraph({
      text: PACKET_HEADERS.insurance,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "CONFIDENTIAL – FOR CLAIMS USE ONLY",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Insured Name: ", bold: true }),
        new TextRun(data.insured_name),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Property Address: ", bold: true }),
        new TextRun(data.propertyAddress),
      ],
    })
  );

  // Insurance-only fields
  if (data.carrier) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Carrier: ", bold: true }), new TextRun(data.carrier)],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Claim Number: ", bold: true }),
          new TextRun(data.claimNumber || ""),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Policy Number: ", bold: true }),
          new TextRun(data.policyNumber || ""),
        ],
      })
    );
  }

  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "Date of Loss: ", bold: true }), new TextRun(data.dateOfLoss)],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Cause of Loss: ", bold: true }),
        new TextRun(data.reportedCause),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Inspection Date: ", bold: true }),
        new TextRun(data.inspectionDate),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: "Prepared By: ", bold: true }), new TextRun(data.preparedBy)],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Phone / Email: ", bold: true }),
        new TextRun(`${data.preparedPhone} / ${data.preparedEmail}`),
      ],
      spacing: { after: 400 },
    })
  );

  // Page 2: Weather Summary (conditional)
  if (includeWeather) {
    sections.push(
      new Paragraph({
        text: "WEATHER & EVENT SUMMARY",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Event Type: ", bold: true }),
          new TextRun(data.eventType.toUpperCase()),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Date of Loss: ", bold: true }),
          new TextRun(data.dateOfLoss),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Weather Sources: ", bold: true }),
          new TextRun(data.weatherSource.join(", ")),
        ],
      })
    );

    if (data.maxHailSize) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Max Hail Size: ", bold: true }),
            new TextRun(`${data.maxHailSize} in`),
          ],
        })
      );
    }

    if (data.maxWindSpeed) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Max Wind Speed: ", bold: true }),
            new TextRun(`${data.maxWindSpeed} mph`),
          ],
        })
      );
    }
  }

  // Page 3: Field Inspection
  sections.push(
    new Paragraph({
      text: "FIELD INSPECTION FINDINGS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Roof System Type: ", bold: true }),
        new TextRun(data.roofType.toUpperCase()),
      ],
    }),
    new Paragraph({
      text: "Observed Damage:",
      spacing: { before: 200 },
      children: [new TextRun({ text: "Observed Damage:", bold: true })],
    })
  );

  sections.push(
    ...data.observedDamage.map(
      (damage) =>
        new Paragraph({
          text: `• ${damage}`,
          bullet: { level: 0 },
        })
    )
  );

  if (data.generalNotes) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "General Notes: ", bold: true }),
          new TextRun(data.generalNotes),
        ],
        spacing: { before: 200 },
      })
    );
  }

  // Photo pages (auto-generated based on photo count)
  if (data.photos.length > 0) {
    sections.push(
      new Paragraph({
        text: "PHOTO EVIDENCE",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      })
    );

    for (const photo of data.photos) {
      try {
        // Fetch image and create ImageRun
        const imageBuffer = await fetchImageBuffer(photo.url);

        sections.push(
          new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: `Photo ${photo.index}: ${photo.caption}`, bold: true })],
          }),
          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new ImageRun({
                type: "png", // or "jpg" - will auto-detect
                data: imageBuffer,
                transformation: {
                  width: 480, // pixels (5 inches at 96 DPI)
                  height: 360, // pixels (3.75 inches at 96 DPI)
                },
              }),
            ],
          })
        );
      } catch (error) {
        // Fallback if image fetch fails
        logger.warn(`[CLAIM_PACKET] Skipping image ${photo.url}:`, error);
        sections.push(
          new Paragraph({
            text: `Photo ${photo.index}: ${photo.caption} (Image unavailable)`,
            spacing: { before: 200 },
          })
        );
      }
    }
  }

  // ====== NEW PAGE: ROOF DIAGRAM & MEASUREMENTS (PHASE 1A) ======
  if (
    data.roofDiagramImageUrl ||
    data.roofTotalSquares ||
    (data.roofSlopes && data.roofSlopes.length > 0)
  ) {
    sections.push(
      new Paragraph({
        text: "ROOF DIAGRAM & MEASUREMENTS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      })
    );

    // Total squares
    if (data.roofTotalSquares) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Total Roof Area: ", bold: true }),
            new TextRun(`${data.roofTotalSquares} squares`),
          ],
          spacing: { before: 200 },
        })
      );
    }

    // Roof diagram image
    if (data.roofDiagramImageUrl) {
      try {
        const imageBuffer = await fetchImageBuffer(data.roofDiagramImageUrl);
        sections.push(
          new Paragraph({
            text: "Roof Layout Diagram:",
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new ImageRun({
                type: "png",
                data: imageBuffer,
                transformation: {
                  width: 600,
                  height: 450,
                },
              }),
            ],
          })
        );
      } catch (error) {
        logger.warn(`[CLAIM_PACKET] Skipping roof diagram image:`, error);
        sections.push(
          new Paragraph({
            text: "Roof Layout Diagram: (Image unavailable)",
            spacing: { before: 200 },
          })
        );
      }
    }

    // Slopes breakdown table
    if (data.roofSlopes && data.roofSlopes.length > 0) {
      sections.push(
        new Paragraph({
          text: "Roof Slopes Breakdown:",
          spacing: { before: 300, after: 100 },
        })
      );

      data.roofSlopes.forEach((slope) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${slope.slopeName}: `, bold: true }),
              new TextRun(`${slope.pitch || "N/A"} pitch, ${slope.squares || 0} squares`),
            ],
          })
        );
      });
    }

    // Component breakdown
    if (data.roofComponentBreakdown && Object.keys(data.roofComponentBreakdown).length > 0) {
      sections.push(
        new Paragraph({
          text: "Roof Components:",
          spacing: { before: 300, after: 100 },
        })
      );

      Object.entries(data.roofComponentBreakdown).forEach(([component, details]) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${component}: `, bold: true }),
              new TextRun(String(details)),
            ],
          })
        );
      });
    }
  }

  // ====== NEW PAGE: SCOPE OF LOSS (XACTIMATE BREAKDOWN) (PHASE 1A) ======
  if (data.scopeLineItems && data.scopeLineItems.length > 0) {
    sections.push(
      new Paragraph({
        text: "SCOPE OF LOSS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
      new Paragraph({
        text: "Detailed line-item breakdown of repair costs (Xactimate format):",
        spacing: { before: 200, after: 200 },
      })
    );

    // Line items table (simplified - full table requires docx table API)
    data.scopeLineItems.forEach((item) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${item.lineNumber}. `, bold: true }),
            new TextRun(`${item.description} `),
            ...(item.xactimateCode
              ? [new TextRun({ text: `[${item.xactimateCode}]`, italics: true })]
              : []),
          ],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun(`  ${item.quantity} ${item.unit} @ $${item.unitPrice.toFixed(2)} = `),
            new TextRun({ text: `$${item.totalPrice.toFixed(2)}`, bold: true }),
          ],
        })
      );
    });

    // Subtotal, O&P, Tax, Total
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Subtotal: ", bold: true }),
          new TextRun(`$${(data.scopeSubtotal || 0).toFixed(2)}`),
        ],
        spacing: { before: 300 },
      })
    );

    if (data.scopeOverheadPercent && data.scopeOverheadAmount) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Overhead (${data.scopeOverheadPercent}%): `, bold: true }),
            new TextRun(`$${data.scopeOverheadAmount.toFixed(2)}`),
          ],
          spacing: { before: 100 },
        })
      );
    }

    if (data.scopeProfitPercent && data.scopeProfitAmount) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Profit (${data.scopeProfitPercent}%): `, bold: true }),
            new TextRun(`$${data.scopeProfitAmount.toFixed(2)}`),
          ],
          spacing: { before: 100 },
        })
      );
    }

    if (data.scopeTaxPercent && data.scopeTaxAmount) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Tax (${data.scopeTaxPercent}%): `, bold: true }),
            new TextRun(`$${data.scopeTaxAmount.toFixed(2)}`),
          ],
          spacing: { before: 100 },
        })
      );
    }

    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "TOTAL CLAIM AMOUNT: ", bold: true }),
          new TextRun({ text: `$${(data.scopeGrandTotal || 0).toFixed(2)}`, bold: true }),
        ],
        spacing: { before: 200 },
      })
    );
  }

  // ====== NEW PAGE: O&P JUSTIFICATION (PHASE 1A) ======
  if (data.opJustificationReason || data.opIndustryStandard) {
    sections.push(
      new Paragraph({
        text: "OVERHEAD & PROFIT JUSTIFICATION",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      })
    );

    if (data.opJustificationReason) {
      sections.push(
        new Paragraph({
          text: data.opJustificationReason,
          spacing: { before: 200, after: 200 },
        })
      );
    }

    if (data.opProjectComplexity) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Project Complexity: ", bold: true }),
            new TextRun(data.opProjectComplexity.replace("-", " ").toUpperCase()),
          ],
          spacing: { before: 100 },
        })
      );
    }

    // Complexity factors
    const factors: string[] = [];
    if (data.opRequiresSpecialEquipment) factors.push("Requires specialized equipment");
    if (data.opRequiresSafetyMeasures) factors.push("Requires enhanced safety measures");
    if (data.opMultiDayProject) factors.push("Multi-day project coordination required");

    if (factors.length > 0) {
      sections.push(
        new Paragraph({
          text: "Complexity Factors:",
          spacing: { before: 200, after: 100 },
        })
      );
      factors.forEach((factor) => {
        sections.push(new Paragraph({ text: `✓ ${factor}` }));
      });
    }

    // Industry references
    if (data.opIndustryReferences && data.opIndustryReferences.length > 0) {
      sections.push(
        new Paragraph({
          text: "Industry Standards & References:",
          spacing: { before: 300, after: 100 },
        })
      );
      data.opIndustryReferences.forEach((ref) => {
        sections.push(
          new Paragraph({
            text: `✓ ${ref}`,
          })
        );
      });
    }

    if (data.opIndustryStandard) {
      sections.push(
        new Paragraph({
          text: "✅ Overhead & Profit is an industry-standard practice for projects of this scope and complexity.",
          spacing: { before: 300 },
        })
      );
    }
  }

  // ====== NEW PAGE: POLICY LANGUAGE & COVERAGE (PHASE 1A) ======
  if (data.policyType || (data.policyExcerpts && data.policyExcerpts.length > 0)) {
    sections.push(
      new Paragraph({
        text: "POLICY LANGUAGE & COVERAGE",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      })
    );

    if (data.policyType) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Policy Type: ", bold: true }),
            new TextRun(data.policyType.toUpperCase()),
          ],
          spacing: { before: 200 },
        })
      );
    }

    // Policy excerpts
    if (data.policyExcerpts && data.policyExcerpts.length > 0) {
      sections.push(
        new Paragraph({
          text: "Relevant Policy Provisions:",
          spacing: { before: 300, after: 200 },
        })
      );

      data.policyExcerpts.forEach((excerpt, index) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. `, bold: true }),
              new TextRun({ text: excerpt.section, bold: true }),
            ],
            spacing: { before: 200 },
          }),
          new Paragraph({
            text: `"${excerpt.excerpt}"`,
            spacing: { before: 100, after: 100 },
          })
        );
        if (excerpt.interpretation) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Interpretation: ", italics: true }),
                new TextRun({ text: excerpt.interpretation, italics: true }),
              ],
              spacing: { after: 200 },
            })
          );
        }
      });
    }

    // Coverage flags
    const coverageFlags: string[] = [];
    if (data.codeUpgradeCoverage) coverageFlags.push("Code Upgrade Coverage: YES");
    if (data.matchingClause) coverageFlags.push("Matching Clause: APPLIES");
    if (data.rcvClaim) coverageFlags.push("RCV Claim (Replacement Cost Value)");
    if (data.depreciationApplied) coverageFlags.push("Depreciation Applied");

    if (coverageFlags.length > 0) {
      sections.push(
        new Paragraph({
          text: "Coverage Summary:",
          spacing: { before: 300, after: 100 },
        })
      );
      coverageFlags.forEach((flag) => {
        sections.push(new Paragraph({ text: `✓ ${flag}` }));
      });
    }

    if (data.deductibleAmount) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Deductible: ", bold: true }),
            new TextRun(`$${data.deductibleAmount.toFixed(2)}`),
          ],
          spacing: { before: 200 },
        })
      );
    }
  }

  // ====== NEW PAGE: MANUFACTURER SPECIFICATIONS (PHASE 1A) ======
  if (data.manufacturerSpecs && data.manufacturerSpecs.length > 0) {
    sections.push(
      new Paragraph({
        text: "MANUFACTURER SPECIFICATIONS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
      new Paragraph({
        text: "Approved materials and code compliance documentation:",
        spacing: { before: 200, after: 200 },
      })
    );

    data.manufacturerSpecs.forEach((spec, index) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. `, bold: true }),
            new TextRun({ text: spec.productName, bold: true }),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Manufacturer: ", bold: true }),
            new TextRun(spec.manufacturer),
          ],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Model Number: ", bold: true }),
            new TextRun(spec.modelNumber || "N/A"),
          ],
          spacing: { before: 50 },
        })
      );

      if (spec.warrantyYears) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Warranty: ", bold: true }),
              new TextRun(`${spec.warrantyYears} years`),
            ],
            spacing: { before: 50 },
          })
        );
      }

      if (spec.codeApprovals && spec.codeApprovals.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Code Approvals: ", bold: true }),
              new TextRun(spec.codeApprovals.join(", ")),
            ],
            spacing: { before: 50 },
          })
        );
      }

      if (spec.windRating) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Wind Rating: ", bold: true }),
              new TextRun(spec.windRating),
            ],
            spacing: { before: 50 },
          })
        );
      }

      if (spec.fireRating) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Fire Rating: ", bold: true }),
              new TextRun(spec.fireRating),
            ],
            spacing: { before: 50 },
          })
        );
      }

      if (spec.specSheetUrl) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Spec Sheet: ", bold: true }),
              new TextRun(spec.specSheetUrl),
            ],
            spacing: { before: 50, after: 100 },
          })
        );
      }
    });
  }

  // ====== NEW PAGE: ASSIGNMENT OF BENEFITS / DIRECTION TO PAY (PHASE 1A) ======
  if (data.aobContractorAuthorized || data.dtpDirectionToPayAccepted) {
    sections.push(
      new Paragraph({
        text: "ASSIGNMENT OF BENEFITS & DIRECTION TO PAY",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      })
    );

    // AOB section
    if (data.aobContractorAuthorized) {
      sections.push(
        new Paragraph({
          text: "ASSIGNMENT OF BENEFITS (AOB)",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200 },
        })
      );

      if (data.aobLegalLanguage) {
        sections.push(
          new Paragraph({
            text: data.aobLegalLanguage,
            spacing: { before: 200, after: 200 },
          })
        );
      } else {
        sections.push(
          new Paragraph({
            text: "I hereby assign all insurance benefits for this claim to the contractor listed below, authorizing direct payment from the insurance carrier.",
            spacing: { before: 200, after: 200 },
          })
        );
      }

      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Homeowner Name: ", bold: true }),
            new TextRun(data.aobHomeownerPrintedName || "____________________________________"),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Signature: ", bold: true }),
            new TextRun(data.aobHomeownerSignature || "____________________________________"),
          ],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Date: ", bold: true }),
            new TextRun(data.aobDateSigned || "____________________________________"),
          ],
          spacing: { before: 100 },
        })
      );
    }

    // Direction to Pay section
    if (data.dtpDirectionToPayAccepted) {
      sections.push(
        new Paragraph({
          text: "DIRECTION TO PAY (DTP)",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 400 },
        }),
        new Paragraph({
          text: "Please remit payment directly to:",
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Payee Company: ", bold: true }),
            new TextRun(data.dtpPayeeCompany || "____________________________________"),
          ],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Address: ", bold: true }),
            new TextRun(data.dtpPayeeAddress || "____________________________________"),
          ],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Tax ID (EIN): ", bold: true }),
            new TextRun(data.dtpPayeeEIN || "____________________________________"),
          ],
          spacing: { before: 100 },
        })
      );

      // Witness signature
      if (data.dtpWitnessName || data.dtpWitnessSignature) {
        sections.push(
          new Paragraph({
            text: "Witness:",
            spacing: { before: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Name: ", bold: true }),
              new TextRun(data.dtpWitnessName || "____________________________________"),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Signature: ", bold: true }),
              new TextRun(data.dtpWitnessSignature || "____________________________________"),
            ],
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Date: ", bold: true }),
              new TextRun(data.dtpWitnessDate || "____________________________________"),
            ],
            spacing: { before: 100 },
          })
        );
      }
    }
  }

  // Footer
  sections.push(
    new Paragraph({
      text: PACKET_FOOTERS.insurance,
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
    })
  );

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  logger.info(`[CLAIM_PACKET] Insurance DOCX generated successfully (${blob.size} bytes)`);
  return blob;
}

// ========== RETAIL VERSION (10-Page Structure) ==========
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateRetailDOCX(data: ClaimPacketData, includeWeather: boolean): Promise<Blob> {
  const sections: Paragraph[] = [];

  // ====== PAGE 1: COVER SHEET ======
  sections.push(
    new Paragraph({
      text: PACKET_HEADERS.retail,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "Homeowner / Retail Version – Master Template v1.0",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Prepared for: ", bold: true }),
        new TextRun(data.insured_name),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Property Address: ", bold: true }),
        new TextRun(data.propertyAddress),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: "Prepared By: ", bold: true }), new TextRun(data.preparedBy)],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Phone / Email: ", bold: true }),
        new TextRun(`${data.preparedPhone} / ${data.preparedEmail}`),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Inspection Date: ", bold: true }),
        new TextRun(data.inspectionDate),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Estimate Type: ", bold: true }),
        new TextRun(data.estimateType?.replace("-", " ").toUpperCase() || "RETAIL CASH"),
      ],
      spacing: { after: 400 },
    })
  );

  // ====== PAGE 2: DAMAGE OVERVIEW SUMMARY ======
  sections.push(
    new Paragraph({
      text: "DAMAGE OVERVIEW SUMMARY",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Roof System Type: ", bold: true }),
        new TextRun(data.roofType.toUpperCase()),
      ],
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: "Observed Damage (check all that apply):", bold: true })],
    })
  );

  sections.push(
    ...data.observedDamage.map(
      (damage) =>
        new Paragraph({
          text: `☐ ${damage}`,
          bullet: { level: 0 },
        })
    )
  );

  if (data.generalNotes) {
    sections.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: "General Condition:", bold: true })],
      }),
      new Paragraph({
        text: data.generalNotes,
      })
    );
  }

  // ====== PAGE 3: RECOMMENDED REPAIRS / OPTIONS ======
  sections.push(
    new Paragraph({
      text: "RECOMMENDED REPAIRS / OPTIONS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Recommended Action: ", bold: true }),
        new TextRun(
          data.recommendedRepairAction?.replace("-", " ").toUpperCase() || "FULL REPLACEMENT"
        ),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Estimated Investment Range: ", bold: true }),
        new TextRun(
          `$${data.estimateRangeLow?.toLocaleString() || "0"} to $${data.estimateRangeHigh?.toLocaleString() || "0"}`
        ),
      ],
      spacing: { before: 200 },
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: "Includes:", bold: true })],
    }),
    new Paragraph({ text: `☐ Tear-off / Disposal` }),
    new Paragraph({ text: `☐ New Roof System` }),
    new Paragraph({ text: `☐ Underlayment Upgrade` }),
    new Paragraph({ text: `☐ Flashing & Vent Replacements` }),
    new Paragraph({ text: `☐ Warrantied Install` }),
    new Paragraph({ text: `☐ Optional Coating System` }),
    new Paragraph({
      text: `☐ Skylight / Accessory Replacement (if needed)`,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Financing Available: ", bold: true }),
        new TextRun(data.financingAvailable ? "Yes" : "No"),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Warranty Options: ", bold: true }),
        new TextRun(data.warrantyOption?.replace("-", " ").toUpperCase() || "5-YR LABOR"),
      ],
    })
  );

  // ====== PAGE 4-6: PHOTO EVIDENCE SECTION ======
  if (data.photos.length > 0) {
    sections.push(
      new Paragraph({
        text: "PHOTO EVIDENCE SECTION",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      })
    );

    // Paginate 2 photos per page
    for (let i = 0; i < data.photos.length; i += 2) {
      const photo1 = data.photos[i];
      const photo2 = data.photos[i + 1];

      try {
        // Photo 1
        const imageBuffer1 = await fetchImageBuffer(photo1.url);
        sections.push(
          new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: `Photo ${i + 1}: ${photo1.caption}`, bold: true })],
          }),
          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new ImageRun({
                type: "png",
                data: imageBuffer1,
                transformation: {
                  width: 400, // Smaller for 2-per-page layout
                  height: 300,
                },
              }),
            ],
          })
        );

        // Photo 2 (if exists)
        if (photo2) {
          const imageBuffer2 = await fetchImageBuffer(photo2.url);
          sections.push(
            new Paragraph({
              spacing: { before: 200 },
              children: [new TextRun({ text: `Photo ${i + 2}: ${photo2.caption}`, bold: true })],
            }),
            new Paragraph({
              spacing: { before: 100, after: 200 },
              children: [
                new ImageRun({
                  type: "png",
                  data: imageBuffer2,
                  transformation: {
                    width: 400,
                    height: 300,
                  },
                }),
              ],
            })
          );
        }
      } catch (error) {
        logger.error(`[CLAIM_PACKET] Failed to insert photo ${i + 1}:`, error);
        // Fallback to text placeholder
        sections.push(
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: `[Image unavailable: ${photo1.caption}]`, italics: true }),
            ],
          })
        );
      }

      // Page break after every 2 photos
      if (i + 2 < data.photos.length) {
        sections.push(
          new Paragraph({
            text: "---",
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
          })
        );
      }
    }
  }

  // ====== PAGE 7: PROJECT TIMELINE & PROCESS ======
  sections.push(
    new Paragraph({
      text: "PROJECT TIMELINE & PROCESS",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    }),
    new Paragraph({
      text: `1. Initial Inspection Completed: ${data.timelineInspectionCompleted || "__________"}`,
    }),
    new Paragraph({
      text: `2. Proposal & Material Selection: ${data.timelineProposalMaterialSelection || "__________"}`,
    }),
    new Paragraph({
      text: `3. Scheduling & Permit Pull: ${data.timelineSchedulingPermit || "__________"}`,
    }),
    new Paragraph({
      text: `4. Tear-Off & Install: ${data.timelineTearOffInstall || "__________"}`,
    }),
    new Paragraph({
      text: `5. Final Walkthrough & Warranty Issued: ${data.timelineFinalWalkthrough || "__________"}`,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Typical Duration: ", bold: true }),
        new TextRun(`${data.typicalDurationDays || "___"} Days`),
      ],
      spacing: { before: 200 },
    })
  );

  // ====== PAGE 8: ROOF SYSTEM & MATERIAL OPTIONS ======
  sections.push(
    new Paragraph({
      text: "ROOF SYSTEM & MATERIAL OPTIONS (UPSCALE SALES PAGE)",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: "Choose Roof Material:", bold: true })],
    }),
    new Paragraph({ text: "☐ Architectural Shingle (30yr / 50yr)" }),
    new Paragraph({ text: "☐ Tile (Concrete / Clay / Stone-Coated)" }),
    new Paragraph({ text: "☐ Metal (Standing Seam / R-Panel)" }),
    new Paragraph({ text: "☐ Modified Bitumen" }),
    new Paragraph({ text: "☐ TPO / PVC / Commercial Membrane" }),
    new Paragraph({ text: "☐ Spray Foam + Elastomeric Coating", spacing: { after: 200 } }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: "Energy Efficiency Options:", bold: true })],
    }),
    new Paragraph({ text: "☐ Cool Roof Rated System" }),
    new Paragraph({ text: "☐ Heat Reflective Coating" }),
    new Paragraph({ text: "☐ Attic Ventilation Upgrade" }),
    new Paragraph({ text: "☐ Radiant Barrier Add-On" })
  );

  // ====== PAGE 9: WARRANTY & SUPPORT ======
  sections.push(
    new Paragraph({
      text: "WARRANTY & SUPPORT",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: "All installs include:", bold: true })],
    }),
    new Paragraph({ text: "✅ Licensed & Insured Contractor" }),
    new Paragraph({ text: "✅ Full Tear-Off & Decking Inspection" }),
    new Paragraph({ text: "✅ Manufacturer Warranty Activation" }),
    new Paragraph({ text: "✅ Final Cleanup & Disposal" }),
    new Paragraph({ text: "✅ Post-Project Support Contact", spacing: { after: 200 } }),
    new Paragraph({
      children: [
        new TextRun({ text: "Service Hotline: ", bold: true }),
        new TextRun(data.serviceHotline || "_________________________"),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Warranty Email: ", bold: true }),
        new TextRun(data.warrantyEmail || "_________________________"),
      ],
    })
  );

  // ====== PAGE 10: FINANCING OPTIONS (NEW - PHASE 1A) ======
  if (data.financingAvailable) {
    sections.push(
      new Paragraph({
        text: "FINANCING OPTIONS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400 },
      }),
      new Paragraph({
        text: "Flexible Payment Solutions for Your Roof Investment",
        spacing: { before: 200, after: 200 },
      })
    );

    // Payment options table
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Available Financing Partners:", bold: true })],
        spacing: { before: 200 },
      })
    );

    if (data.financingPartners && data.financingPartners.length > 0) {
      data.financingPartners.forEach((partner) => {
        sections.push(new Paragraph({ text: `✓ ${partner}` }));
      });
    } else {
      sections.push(new Paragraph({ text: "✓ Multiple financing partners available" }));
    }

    // Monthly payment estimate
    if (data.monthlyPaymentEstimateLow && data.monthlyPaymentEstimateHigh) {
      sections.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ text: "Estimated Monthly Payment Range:", bold: true })],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "$", bold: true }),
            new TextRun({
              text: data.monthlyPaymentEstimateLow.toLocaleString(),
              bold: true,
            }),
            new TextRun({ text: " - $", bold: true }),
            new TextRun({
              text: data.monthlyPaymentEstimateHigh.toLocaleString(),
              bold: true,
            }),
            new TextRun({
              text: ` per month (${data.financingTermMonths || 60} months @ ${data.financingAPR || 0}% APR)`,
            }),
          ],
        })
      );
    }

    // Contact info
    sections.push(
      new Paragraph({
        spacing: { before: 300 },
        children: [new TextRun({ text: "Ready to Apply?", bold: true })],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Contact: ", bold: true }),
          new TextRun(data.financingContactPhone || data.preparedPhone || "Call for details"),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Email: ", bold: true }),
          new TextRun(data.financingContactEmail || data.preparedEmail || "inquire@company.com"),
        ],
      })
    );

    // QR code placeholder
    if (data.financingApplicationQRCode) {
      sections.push(
        new Paragraph({
          text: "[QR Code: Scan to apply online]",
          alignment: AlignmentType.CENTER,
          spacing: { before: 300 },
        })
      );
    }
  }

  // ====== PAGE 11: "WHY US?" CREDIBILITY PAGE (NEW - PHASE 1A) ======
  sections.push(
    new Paragraph({
      text: "WHY CHOOSE US?",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    })
  );

  // Company bio
  if (data.companyBio) {
    sections.push(
      new Paragraph({
        text: data.companyBio,
        spacing: { before: 200, after: 200 },
      })
    );
  }

  // Year established
  if (data.yearEstablished) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Established: ", bold: true }),
          new TextRun(
            `${data.yearEstablished} (${new Date().getFullYear() - data.yearEstablished}+ years serving our community)`
          ),
        ],
        spacing: { before: 200 },
      })
    );
  }

  // License numbers
  if (data.licenseNumbers && data.licenseNumbers.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Licensed & Insured:", bold: true })],
        spacing: { before: 200 },
      })
    );
    data.licenseNumbers.forEach((license) => {
      sections.push(new Paragraph({ text: `✓ License #${license}` }));
    });
  }

  // Insurance info
  if (data.insuranceCarrier) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Insurance Carrier: ", bold: true }),
          new TextRun(data.insuranceCarrier),
          ...(data.insurancePolicyNumber
            ? [new TextRun(` (Policy #${data.insurancePolicyNumber})`)]
            : []),
        ],
        spacing: { before: 100 },
      })
    );
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Industry Certifications:", bold: true })],
        spacing: { before: 200 },
      })
    );
    data.certifications.forEach((cert) => {
      sections.push(new Paragraph({ text: `✓ ${cert}` }));
    });
  }

  // BBB rating
  if (data.bbbRating && data.bbbRating !== "Not Rated") {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "BBB Rating: ", bold: true }),
          new TextRun(data.bbbRating),
          ...(data.bbbAccredited ? [new TextRun(" (Accredited Business)")] : []),
        ],
        spacing: { before: 200 },
      })
    );
  }

  // Awards & badges
  if (data.awardsBadges && data.awardsBadges.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Awards & Recognition:", bold: true })],
        spacing: { before: 200 },
      })
    );
    data.awardsBadges.forEach((award) => {
      sections.push(new Paragraph({ text: `🏆 ${award}` }));
    });
  }

  // Customer testimonials
  if (data.customerTestimonials && data.customerTestimonials.length > 0) {
    sections.push(
      new Paragraph({
        text: "WHAT OUR CUSTOMERS SAY",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 400 },
      })
    );

    data.customerTestimonials.slice(0, 3).forEach((testimonial) => {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `"${testimonial.quote}"`, italics: true })],
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "— ", italics: true }),
            new TextRun({ text: testimonial.name, bold: true, italics: true }),
            new TextRun({
              text: `, ${testimonial.location} (${"⭐".repeat(testimonial.rating || 5)})`,
              italics: true,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }

  // ====== PAGE 12: ENHANCED SIGNATURE & AUTHORIZATION (UPDATED - PHASE 1A) ======
  sections.push(
    new Paragraph({
      text: "SIGNATURE & AUTHORIZATION",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400 },
    }),
    new Paragraph({
      text: "I authorize the above scope of work to be performed as outlined in this document.",
      spacing: { before: 200, after: 300 },
    })
  );

  // Terms acceptance checkbox
  if (data.termsAccepted !== undefined) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: data.termsAccepted ? "☑" : "☐",
            bold: true,
          }),
          new TextRun({
            text: " I agree to the scope, timeline, and terms outlined in this proposal",
          }),
        ],
        spacing: { before: 200 },
      })
    );
  }

  // Client information
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Printed Name: ", bold: true }),
        new TextRun(
          data.clientPrintedName || data.clientName || "____________________________________"
        ),
      ],
      spacing: { before: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Email: ", bold: true }),
        new TextRun(data.clientEmail || "____________________________________"),
      ],
      spacing: { before: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Phone: ", bold: true }),
        new TextRun(data.clientPhone || "____________________________________"),
      ],
      spacing: { before: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Signature: ", bold: true }),
        new TextRun(data.clientSignature || "____________________________________"),
      ],
      spacing: { before: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Date: ", bold: true }),
        new TextRun(
          data.termsAcceptedDate ||
            data.clientSignatureDate ||
            "____________________________________"
        ),
      ],
      spacing: { before: 100 },
    })
  );

  // Witness signature (optional)
  if (data.witnessName || data.witnessSignature) {
    sections.push(
      new Paragraph({
        text: "Witness (Optional):",
        spacing: { before: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Name: ", bold: true }),
          new TextRun(data.witnessName || "____________________________________"),
        ],
        spacing: { before: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Signature: ", bold: true }),
          new TextRun(data.witnessSignature || "____________________________________"),
        ],
        spacing: { before: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Date: ", bold: true }),
          new TextRun(data.witnessDate || "____________________________________"),
        ],
        spacing: { before: 100 },
      })
    );
  }

  // E-signature QR code placeholder
  if (data.signatureQRCode) {
    sections.push(
      new Paragraph({
        text: "[QR Code: Sign electronically online]",
        alignment: AlignmentType.CENTER,
        spacing: { before: 300 },
      })
    );
  }

  // ====== ORIGINAL PAGE 10: SIGNATURE (kept for backward compatibility) ======
  // This section is now redundant but kept to avoid breaking existing workflows

  // Footer
  sections.push(
    new Paragraph({
      text: PACKET_FOOTERS.retail,
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
    })
  );

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  logger.info(`[CLAIM_PACKET] Retail DOCX generated successfully (${blob.size} bytes)`);
  return blob;
}

async function generatePDF(
  data: ClaimPacketData,
  version: PacketVersion,
  includeWeather: boolean
): Promise<Blob> {
  // Strategy: Generate DOCX first, then convert to PDF
  // This ensures consistent formatting between DOCX and PDF exports

  logger.info("[CLAIM_PACKET] Generating PDF via DOCX conversion...");

  try {
    // Step 1: Generate DOCX
    const docxBlob = await generateDOCX(data, version, includeWeather);

    // Step 2: Convert DOCX to PDF
    // Note: This requires a server-side conversion service
    // Options:
    // 1. Use /api/export/pdf endpoint (requires libre-office or similar)
    // 2. Use client-side library (limited browser support)
    // 3. Use third-party service (Gotenberg, CloudConvert)

    // For now, we'll use the API endpoint approach
    const formData = new FormData();
    formData.append("docx", docxBlob, "claim-packet.docx");

    const response = await fetch("/api/export/pdf", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "PDF conversion failed");
    }

    const pdfBlob = await response.blob();
    logger.info(`[CLAIM_PACKET] PDF generated successfully (${pdfBlob.size} bytes)`);
    return pdfBlob;
  } catch (error) {
    logger.error("[CLAIM_PACKET] PDF generation failed:", error);
    throw new Error(
      "PDF generation not yet fully implemented. " +
        "Please use DOCX format, or implement server-side conversion using libre-office, " +
        "pdf-lib, or a third-party service like Gotenberg."
    );
  }
}

// Helper: Auto-caption photos using AI labels
export function autoCaptionPhotos(
  photos: Array<{ url: string; label?: string }>
): ClaimPacketData["photos"] {
  return photos.map((photo, index) => ({
    url: photo.url,
    caption: photo.label || `Damage Evidence ${index + 1}`,
    index: index + 1,
  }));
}
