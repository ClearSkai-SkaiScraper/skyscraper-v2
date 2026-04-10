/**
 * Lob API Client
 * Print + mail fulfillment service
 */

import Lob from 'lob';

import { logger } from "@/lib/logger";

// eslint-disable-next-line no-restricted-syntax
if (!process.env.LOB_API_KEY) {
  logger.warn('[Lob] API key not configured - mailer fulfillment disabled');
}

// eslint-disable-next-line no-restricted-syntax
export const lob = process.env.LOB_API_KEY
  // eslint-disable-next-line no-restricted-syntax
  ? new Lob(process.env.LOB_API_KEY)
  : null;

export const LOB_ENABLED = !!lob;

// Template IDs (set in environment)
export const LOB_TEMPLATES = {
  // eslint-disable-next-line no-restricted-syntax
  POSTCARD_FRONT: process.env.LOB_TEMPLATE_POSTCARD_FRONT_ID || '',
  // eslint-disable-next-line no-restricted-syntax
  POSTCARD_BACK: process.env.LOB_TEMPLATE_POSTCARD_BACK_ID || '',
  // eslint-disable-next-line no-restricted-syntax
  LETTER: process.env.LOB_TEMPLATE_LETTER_ID || '',
};
