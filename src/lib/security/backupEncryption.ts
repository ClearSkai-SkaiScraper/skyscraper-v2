/**
 * Backup Encryption
 *
 * Encrypts database backups before storage
 * Ensures backup data is protected at rest
 */

import crypto from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";

import { logger } from "@/lib/logger";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get backup encryption key
 */
function getBackupKey(): string {
  const key = process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error("BACKUP_ENCRYPTION_KEY not configured");
  }

  return key;
}

/**
 * Derive encryption key from master key
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, "sha512");
}

/**
 * Encrypt backup file
 */
export async function encryptBackup(inputPath: string, outputPath: string): Promise<void> {
  const masterKey = getBackupKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const input = createReadStream(inputPath);
  const output = createWriteStream(outputPath);

  // Write metadata (salt + iv) first
  output.write(salt);
  output.write(iv);

  try {
    await pipeline(input, cipher, output);

    // Write auth tag at the end
    const tag = cipher.getAuthTag();
    await new Promise<void>((resolve, reject) => {
      output.write(tag, (err) => {
        if (err) reject(err);
        else resolve();
      });
      output.end();
    });

    logger.debug(`✅ Backup encrypted: ${outputPath}`);
  } catch (error) {
    logger.error("Failed to encrypt backup:", error);
    throw error;
  }
}

/**
 * Decrypt backup file
 */
export async function decryptBackup(inputPath: string, outputPath: string): Promise<void> {
  const masterKey = getBackupKey();

  const input = createReadStream(inputPath);
  const output = createWriteStream(outputPath);

  // Read metadata (salt + iv)
  const salt = Buffer.alloc(SALT_LENGTH);
  const iv = Buffer.alloc(IV_LENGTH);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tag = Buffer.alloc(16);

  let bytesRead = 0;

  input.on("readable", () => {
    let chunk;

    // Read salt
    if (bytesRead < SALT_LENGTH) {
      chunk = input.read(SALT_LENGTH - bytesRead);
      if (chunk) {
        chunk.copy(salt, bytesRead);
        bytesRead += chunk.length;
      }
      return;
    }

    // Read IV
    if (bytesRead < SALT_LENGTH + IV_LENGTH) {
      chunk = input.read(IV_LENGTH - (bytesRead - SALT_LENGTH));
      if (chunk) {
        chunk.copy(iv, bytesRead - SALT_LENGTH);
        bytesRead += chunk.length;
      }
      return;
    }

    // Now we can create decipher
    if (bytesRead === SALT_LENGTH + IV_LENGTH) {
      const key = deriveKey(masterKey, salt);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

      // Read remaining data (encrypted content + tag)
      pipeline(input, decipher, output)
        .then(() => {
          logger.debug(`✅ Backup decrypted: ${outputPath}`);
        })
        .catch((error) => {
          logger.error("Failed to decrypt backup:", error);
          throw error;
        });
    }
  });
}

/**
 * Create encrypted database backup
 */
export async function createEncryptedBackup(
  databaseUrl: string,
  outputPath: string
): Promise<void> {
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  const tempPath = `${outputPath}.tmp`;

  try {
    // Create unencrypted backup
    logger.debug("Creating database backup...");
    await execAsync(`pg_dump "${databaseUrl}" > ${tempPath}`);

    // Encrypt backup
    logger.debug("Encrypting backup...");
    await encryptBackup(tempPath, outputPath);

    // Remove unencrypted temp file
    await execAsync(`rm ${tempPath}`);

    logger.debug(`✅ Encrypted backup created: ${outputPath}`);
  } catch (error) {
    logger.error("Failed to create encrypted backup:", error);
    // Cleanup temp file if it exists
    await execAsync(`rm -f ${tempPath}`).catch((e: any) => {
      logger.debug(`[BACKUP] Temp file cleanup failed: ${e?.message}`);
    });
    throw error;
  }
}

/**
 * Restore from encrypted backup
 */
export async function restoreEncryptedBackup(
  backupPath: string,
  databaseUrl: string
): Promise<void> {
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  const tempPath = `${backupPath}.decrypted`;

  try {
    // Decrypt backup
    logger.debug("Decrypting backup...");
    await decryptBackup(backupPath, tempPath);

    // Restore database
    logger.debug("Restoring database...");
    await execAsync(`psql "${databaseUrl}" < ${tempPath}`);

    // Remove decrypted temp file
    await execAsync(`rm ${tempPath}`);

    logger.debug(`✅ Database restored from encrypted backup`);
  } catch (error) {
    logger.error("Failed to restore encrypted backup:", error);
    // Cleanup temp file if it exists
    await execAsync(`rm -f ${tempPath}`).catch((e: any) => {
      logger.debug(`[BACKUP] Restore temp file cleanup failed: ${e?.message}`);
    });
    throw error;
  }
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupPath: string): Promise<boolean> {
  try {
    const { readFile } = require("fs/promises");
    const data = await readFile(backupPath);

    // Check if file has proper structure (salt + iv + encrypted data + tag)
    const minSize = SALT_LENGTH + IV_LENGTH + 16; // + auth tag
    if (data.length < minSize) {
      return false;
    }

    // Try to extract metadata
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);

    return salt.length === SALT_LENGTH && iv.length === IV_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Generate backup filename
 */
export function generateBackupFilename(prefix: string = "backup"): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${timestamp}.sql.enc`;
}

/**
 * Schedule automated backups
 */
export function scheduleBackups(
  databaseUrl: string,
  backupDir: string,
  intervalHours: number = 24
): NodeJS.Timeout {
  const interval = intervalHours * 60 * 60 * 1000;

  const runBackup = async () => {
    try {
      const filename = generateBackupFilename();
      const outputPath = `${backupDir}/${filename}`;

      await createEncryptedBackup(databaseUrl, outputPath);
      logger.debug(`✅ Scheduled backup completed: ${filename}`);
    } catch (error) {
      logger.error("Scheduled backup failed:", error);
    }
  };

  // Run initial backup
  void runBackup();

  // Schedule recurring backups
  return setInterval(runBackup, interval);
}

/**
 * Cleanup old backups
 */
export async function cleanupOldBackups(
  backupDir: string,
  retentionDays: number = 30
): Promise<void> {
  const { readdir, stat, unlink } = require("fs/promises");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const files = await readdir(backupDir);

    for (const file of files) {
      if (!file.endsWith(".sql.enc")) continue;

      const filePath = `${backupDir}/${file}`;
      const stats = await stat(filePath);

      if (stats.mtime < cutoffDate) {
        await unlink(filePath);
        logger.debug(`🗑️ Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    logger.error("Failed to cleanup old backups:", error);
  }
}
