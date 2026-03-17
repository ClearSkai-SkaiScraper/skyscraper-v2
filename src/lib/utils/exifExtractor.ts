/**
 * ============================================================================
 * EXIF DATA EXTRACTION UTILITY
 * Extract timestamp and metadata from photos
 * ============================================================================
 */

import ExifReader from 'exifreader';

import { logger } from "@/lib/logger";

export interface EXIFData {
  dateTime: Date | null;
  dateTimeOriginal: Date | null;
  dateTimeDigitized: Date | null;
  make?: string;
  model?: string;
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  orientation?: number;
  width?: number;
  height?: number;
}

/**
 * Extract EXIF data from image URL or buffer
 */
export async function extractEXIF(urlOrBuffer: string | Buffer): Promise<EXIFData> {
  try {
    let buffer: Buffer;
    
    // If it's a URL, fetch the image
    if (typeof urlOrBuffer === 'string') {
      const response = await fetch(urlOrBuffer);
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = urlOrBuffer;
    }
    
    // Parse EXIF data
    const tags = ExifReader.load(buffer, { expanded: true });
    
    // Extract dates
    const dateTime = parseEXIFDate(tags.exif?.DateTime?.description);
    const dateTimeOriginal = parseEXIFDate(tags.exif?.DateTimeOriginal?.description);
    const dateTimeDigitized = parseEXIFDate(tags.exif?.DateTimeDigitized?.description);
    
    // Extract GPS
    let gps: EXIFData['gps'];
    if (tags.gps?.Latitude && tags.gps?.Longitude) {
      gps = {
        latitude: tags.gps.Latitude,
        longitude: tags.gps.Longitude,
        altitude: tags.gps.Altitude || undefined,
      };
    }
    
    return {
      dateTime,
      dateTimeOriginal,
      dateTimeDigitized,
      make: tags.exif?.Make?.description,
      model: tags.exif?.Model?.description,
      gps,
      orientation: tags.exif?.Orientation?.value as number,
      width: tags.file?.['Image Width']?.value as number,
      height: tags.file?.['Image Height']?.value as number,
    };
  } catch (error) {
    logger.warn('EXIF extraction failed:', error);
    return {
      dateTime: null,
      dateTimeOriginal: null,
      dateTimeDigitized: null,
    };
  }
}

/**
 * Parse EXIF date string to Date object
 * EXIF format: "YYYY:MM:DD HH:MM:SS"
 */
function parseEXIFDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  
  try {
    // Replace colons in date part with dashes
    const normalized = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const date = new Date(normalized);
    
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Extract just the timestamp (convenience function)
 */
export async function extractTimestamp(urlOrBuffer: string | Buffer): Promise<Date | null> {
  const exif = await extractEXIF(urlOrBuffer);
  return exif.dateTimeOriginal || exif.dateTime || exif.dateTimeDigitized;
}
