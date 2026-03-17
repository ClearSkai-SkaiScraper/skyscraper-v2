/**
 * Lob API Client
 * Print + mail fulfillment service
 */

import Lob from 'lob';

import { logger } from "@/lib/logger";

if (!process.env.LOB_API_KEY) {
  logger.warn('[Lob] API key not configured - mailer fulfillment disabled');
}

export const lob = process.env.LOB_API_KEY
  ? new Lob(process.env.LOB_API_KEY)
  : null;

export const LOB_ENABLED = !!lob;

// Template IDs (set in environment)
export const LOB_TEMPLATES = {
  POSTCARD_FRONT: process.env.LOB_TEMPLATE_POSTCARD_FRONT_ID || '',
  POSTCARD_BACK: process.env.LOB_TEMPLATE_POSTCARD_BACK_ID || '',
  LETTER: process.env.LOB_TEMPLATE_LETTER_ID || '',
};
