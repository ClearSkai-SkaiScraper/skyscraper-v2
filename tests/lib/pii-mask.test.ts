/**
 * PII Masking Tests (Sprint 10)
 */

import { describe, expect, it } from "vitest";

import { maskPII, maskPIIDeep, maskEmail, maskPhone } from "@/lib/security/piiMask";

describe("piiMask", () => {
  describe("maskPII", () => {
    it("masks email addresses", () => {
      const input = "Contact john.doe@example.com for info";
      const result = maskPII(input);
      expect(result).toBe("Contact [EMAIL_REDACTED] for info");
      expect(result).not.toContain("john.doe@example.com");
    });

    it("masks phone numbers", () => {
      expect(maskPII("Call (602) 555-1234")).toContain("[PHONE_REDACTED]");
      expect(maskPII("Call 602-555-1234")).toContain("[PHONE_REDACTED]");
      expect(maskPII("Call +1 602 555 1234")).toContain("[PHONE_REDACTED]");
    });

    it("masks SSN", () => {
      expect(maskPII("SSN: 123-45-6789")).toContain("[SSN_REDACTED]");
    });

    it("masks credit card numbers", () => {
      expect(maskPII("Card: 4111-1111-1111-1111")).toContain("[CC_REDACTED]");
      expect(maskPII("Card: 4111 1111 1111 1111")).toContain("[CC_REDACTED]");
    });

    it("masks API keys", () => {
      expect(maskPII("Key: sk_test_abcdefghij1234")).toContain("[KEY_REDACTED]");
      expect(maskPII("Key: whsec_live_xyzabcdefgh5678")).toContain("[KEY_REDACTED]");
    });

    it("does not mask normal text", () => {
      const input = "Hello world, this is a normal string";
      expect(maskPII(input)).toBe(input);
    });
  });

  describe("maskPIIDeep", () => {
    it("masks PII in nested objects", () => {
      const obj = {
        user: { email: "test@example.com", name: "John" },
        metadata: { ip: "192.168.1.1" },
      };
      const result = maskPIIDeep(obj) as Record<string, Record<string, string>>;
      expect(result.user.email).toBe("[EMAIL_REDACTED]");
      expect(result.user.name).toBe("John");
    });

    it("redacts sensitive field names", () => {
      const obj = { password: "secret123", apiToken: "tok_abc" };
      const result = maskPIIDeep(obj) as Record<string, string>;
      expect(result.password).toBe("[REDACTED]");
      expect(result.apiToken).toBe("[REDACTED]");
    });

    it("handles arrays", () => {
      const arr = ["test@test.com", "normal text"];
      const result = maskPIIDeep(arr) as string[];
      expect(result[0]).toBe("[EMAIL_REDACTED]");
      expect(result[1]).toBe("normal text");
    });

    it("handles null and undefined", () => {
      expect(maskPIIDeep(null)).toBeNull();
      expect(maskPIIDeep(undefined)).toBeUndefined();
    });
  });

  describe("maskEmail", () => {
    it("masks email showing first char", () => {
      expect(maskEmail("john@example.com")).toBe("j***@example.com");
    });

    it("handles invalid email", () => {
      expect(maskEmail("notanemail")).toBe("[EMAIL_REDACTED]");
    });
  });

  describe("maskPhone", () => {
    it("masks phone showing last 4", () => {
      expect(maskPhone("(602) 555-1234")).toBe("***-1234");
    });

    it("handles short numbers", () => {
      expect(maskPhone("12")).toBe("[PHONE_REDACTED]");
    });
  });
});
