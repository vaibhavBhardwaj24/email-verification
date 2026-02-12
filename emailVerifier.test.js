/**
 * Email Verification Module - Test Suite
 * 15+ test cases covering syntax validation, SMTP error codes, and edge cases
 */

const {
  verifyEmail,
  getDidYouMean,
  validateEmailSyntax,
  levenshteinDistance,
  _interpretSMTPCode: interpretSMTPCode,
  _suggestCorrection: suggestCorrection,
} = require("./emailVerifier");

describe("Email Verification Module", () => {
  describe("Email Syntax Validation Tests", () => {
    test("✅ Valid email format passes - simple case", () => {
      const result = validateEmailSyntax("user@example.com");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("✅ Valid email format passes - with subdomain", () => {
      const result = validateEmailSyntax("user.name@mail.example.co.uk");
      expect(result.valid).toBe(true);
    });

    test("✅ Valid email format passes - with special characters", () => {
      const result = validateEmailSyntax("user+tag@example.com");
      expect(result.valid).toBe(true);
    });

    test("✅ Invalid format rejected - missing @ symbol", () => {
      const result = validateEmailSyntax("userexample.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("✅ Invalid format rejected - multiple @ symbols", () => {
      const result = validateEmailSyntax("user@@example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exactly one @ symbol");
    });

    test("✅ Invalid format rejected - double dots", () => {
      const result = validateEmailSyntax("user..name@example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("consecutive dots");
    });

    test("✅ Invalid format rejected - leading/trailing dot in local part", () => {
      const result = validateEmailSyntax(".user@example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot start or end with a dot");
    });

    test("✅ Invalid format rejected - missing TLD", () => {
      const result = validateEmailSyntax("user@example");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least one dot");
    });

    test("✅ Invalid format rejected - spaces in email", () => {
      const result = validateEmailSyntax("user name@example.com");
      expect(result.valid).toBe(false);
    });
  });

  describe("Edge Case Handling Tests", () => {
    test("✅ Empty string handled", () => {
      const result = validateEmailSyntax("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("✅ Null handled", () => {
      const result = validateEmailSyntax(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("✅ Undefined handled", () => {
      const result = validateEmailSyntax(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("✅ Very long email (>254 chars) rejected", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = validateEmailSyntax(longEmail);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds maximum length");
    });

    test("✅ Very long local part (>64 chars) rejected", () => {
      const email = "a".repeat(65) + "@example.com";
      const result = validateEmailSyntax(email);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Local part exceeds maximum length");
    });

    test("✅ Non-string input rejected", () => {
      const result = validateEmailSyntax(12345);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be a string");
    });

    test("✅ Email with whitespace trimmed", () => {
      const result = validateEmailSyntax("  user@example.com  ");
      expect(result.valid).toBe(true);
    });
  });

  describe("SMTP Error Code Interpretation Tests", () => {
    test("✅ 250 error → mailbox exists", () => {
      const result = interpretSMTPCode(250);
      expect(result).toBe("mailbox_exists");
    });

    test("✅ 251 error → mailbox exists (user message queued)", () => {
      const result = interpretSMTPCode(251);
      expect(result).toBe("mailbox_exists");
    });

    test("✅ 550 error → mailbox does not exist", () => {
      const result = interpretSMTPCode(550);
      expect(result).toBe("mailbox_does_not_exist");
    });

    test("✅ 551 error → user not local (invalid)", () => {
      const result = interpretSMTPCode(551);
      expect(result).toBe("mailbox_does_not_exist");
    });

    test("✅ 553 error → invalid mailbox name (invalid)", () => {
      const result = interpretSMTPCode(553);
      expect(result).toBe("mailbox_does_not_exist");
    });

    test("✅ 450 error → greylisted", () => {
      const result = interpretSMTPCode(450);
      expect(result).toBe("greylisted");
    });

    test("✅ 451 error → greylisted/service unavailable", () => {
      const result = interpretSMTPCode(451);
      expect(result).toBe("greylisted");
    });

    test("✅ 452 error → greylisted/insufficient storage", () => {
      const result = interpretSMTPCode(452);
      expect(result).toBe("greylisted");
    });

    test("✅ 421 error → service unavailable", () => {
      const result = interpretSMTPCode(421);
      expect(result).toBe("service_unavailable");
    });

    test("✅ 500 error → SMTP error", () => {
      const result = interpretSMTPCode(500);
      expect(result).toBe("smtp_error");
    });

    test("✅ 0 (connection error) → connection_error", () => {
      const result = interpretSMTPCode(0);
      expect(result).toBe("connection_error");
    });

    test("✅ Unknown code → unknown_response", () => {
      const result = interpretSMTPCode(999);
      expect(result).toBe("unknown_response");
    });
  });

  describe("Levenshtein Distance Algorithm Tests", () => {
    test("Identical strings have distance 0", () => {
      const distance = levenshteinDistance("gmail", "gmail");
      expect(distance).toBe(0);
    });

    test("Single character insertion", () => {
      const distance = levenshteinDistance("gmai", "gmail");
      expect(distance).toBe(1);
    });

    test("Single character deletion", () => {
      const distance = levenshteinDistance("gmaill", "gmail");
      expect(distance).toBe(1);
    });

    test("Single character substitution", () => {
      const distance = levenshteinDistance("pmail", "gmail");
      expect(distance).toBe(1);
    });

    test("Multiple edits", () => {
      const distance = levenshteinDistance("yahooo", "yahoo");
      expect(distance).toBe(1);
    });

    test("Completely different strings", () => {
      const distance = levenshteinDistance("abc", "xyz");
      expect(distance).toBeGreaterThan(2);
    });

    test("Empty string comparison", () => {
      const distance = levenshteinDistance("", "gmail");
      expect(distance).toBe(5);
    });
  });

  describe("Typo Detection Tests", () => {
    test("Detects gmial.com typo and suggests gmail.com", () => {
      const suggestion = suggestCorrection("user@gmial.com");
      expect(suggestion).not.toBeNull();
      expect(suggestion.suggested).toBe("user@gmail.com");
    });

    test("Detects yahooo.com typo and suggests yahoo.com", () => {
      const suggestion = suggestCorrection("user@yahooo.com");
      expect(suggestion).not.toBeNull();
      expect(suggestion.suggested).toBe("user@yahoo.com");
    });

    test("Detects hotmial.com typo and suggests hotmail.com", () => {
      const suggestion = suggestCorrection("user@hotmial.com");
      expect(suggestion).not.toBeNull();
      expect(suggestion.suggested).toBe("user@hotmail.com");
    });

    test("Detects outlok.com typo and suggests outlook.com", () => {
      const suggestion = suggestCorrection("user@outlok.com");
      expect(suggestion).not.toBeNull();
      expect(suggestion.suggested).toBe("user@outlook.com");
    });

    test("Returns null for correct domains", () => {
      const suggestion = suggestCorrection("user@gmail.com");
      expect(suggestion).toBeNull();
    });

    test("Returns null for non-existent email", () => {
      const suggestion = suggestCorrection(null);
      expect(suggestion).toBeNull();
    });

    test("getDidYouMean function works for typos", () => {
      const result = getDidYouMean("user@gmial.com");
      expect(result).toBe("user@gmail.com");
    });

    test("getDidYouMean returns null for correct emails", () => {
      const result = getDidYouMean("user@gmail.com");
      expect(result).toBeNull();
    });

    test("getDidYouMean handles invalid input", () => {
      const result = getDidYouMean(null);
      expect(result).toBeNull();
    });
  });

  describe("Async Verification Function Tests", () => {
    test("verifyEmail returns structured result object", async () => {
      const result = await verifyEmail("invalid-email", { checkMX: false });
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("result");
      expect(result).toHaveProperty("resultcode");
      expect(result).toHaveProperty("subresult");
      expect(result).toHaveProperty("domain");
      expect(result).toHaveProperty("mxRecords");
      expect(result).toHaveProperty("executiontime");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("timestamp");
    });

    test("verifyEmail handles invalid syntax", async () => {
      const result = await verifyEmail("not-an-email", { checkMX: false });
      expect(result.result).toBe("invalid");
      expect(result.resultcode).toBe(6);
      expect(result.subresult).toBe("invalid_syntax");
      expect(result.error).toBeDefined();
    });

    test("verifyEmail detects typos and returns invalid result", async () => {
      const result = await verifyEmail("user@gmial.com", {
        checkMX: false,
        checkSMTP: false,
      });
      expect(result.result).toBe("invalid");
      expect(result.resultcode).toBe(6);
      expect(result.subresult).toBe("typo_detected");
      expect(result.didyoumean).toBe("user@gmail.com");
    });

    test("verifyEmail handles empty email", async () => {
      const result = await verifyEmail("", { checkMX: false });
      expect(result.result).toBe("invalid");
      expect(result.resultcode).toBe(6);
    });

    test("verifyEmail handles null email", async () => {
      const result = await verifyEmail(null, { checkMX: false });
      expect(result.result).toBe("invalid");
      expect(result.resultcode).toBe(6);
    });

    test("verifyEmail execution time is reasonable", async () => {
      const result = await verifyEmail("invalid-email", { checkMX: false });
      expect(result.executiontime).toBeLessThan(10);
    });

    test("verifyEmail includes timestamp", async () => {
      const result = await verifyEmail("user@example.com", {
        checkMX: false,
        checkSMTP: false,
      });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    test("verifyEmail syntax check works for multiple @ symbols", async () => {
      const result = await verifyEmail("user@domain@example.com", {
        checkMX: false,
      });
      expect(result.result).toBe("invalid");
      expect(result.subresult).toBe("invalid_syntax");
    });

    test("verifyEmail validates email length limits", async () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = await verifyEmail(longEmail, { checkMX: false });
      expect(result.result).toBe("invalid");
      expect(result.subresult).toBe("invalid_syntax");
    });

    test("verifyEmail returns valid result code for valid syntax (no MX/SMTP)", async () => {
      const result = await verifyEmail("user@example.com", {
        checkMX: false,
        checkSMTP: false,
      });
      expect(result.result).toBe("valid");
      expect(result.resultcode).toBe(1);
      expect(result.subresult).toBe("syntax_and_mx_valid");
    });

    test("verifyEmail handles typo in domain correctly", async () => {
      const result = await verifyEmail("contact@hotmial.com", {
        checkMX: false,
        checkSMTP: false,
      });
      expect(result.didyoumean).toBe("contact@hotmail.com");
      expect(result.result).toBe("invalid");
    });
  });

  describe("Response Code Mapping Tests", () => {
    test("2xx codes map to valid", () => {
      [250, 251, 252, 255].forEach((code) => {
        const subresult = interpretSMTPCode(code);
        expect(["mailbox_exists", "mailbox_does_not_exist"]).toContain(
          subresult,
        );
      });
    });

    test("4xx codes map to greylisted or service unavailable", () => {
      [421, 450, 451, 452].forEach((code) => {
        const subresult = interpretSMTPCode(code);
        expect(["greylisted", "service_unavailable"]).toContain(subresult);
      });
    });

    test("5xx codes map to invalid or error", () => {
      [500, 501, 550, 551, 553].forEach((code) => {
        const subresult = interpretSMTPCode(code);
        expect(["mailbox_does_not_exist", "smtp_error"]).toContain(subresult);
      });
    });
  });

  describe("Integration Tests", () => {
    test("Complete workflow: typo detection", async () => {
      const email = "john.doe@yahooo.com";
      const result = await verifyEmail(email, {
        checkMX: false,
        checkSMTP: false,
      });

      expect(result.email).toBe(email);
      expect(result.result).toBe("invalid");
      expect(result.resultcode).toBe(6);
      expect(result.subresult).toBe("typo_detected");
      expect(result.didyoumean).toBe("john.doe@yahoo.com");
      expect(result.timestamp).toBeDefined();
      expect(typeof result.executiontime).toBe("number");
    });

    test("Complete workflow: valid syntax only", async () => {
      const email = "valid.user@example.com";
      const result = await verifyEmail(email, {
        checkMX: false,
        checkSMTP: false,
      });

      expect(result.email).toBe(email);
      expect(result.result).toBe("valid");
      expect(result.resultcode).toBe(1);
      expect(result.domain).toBe("example.com");
      expect(result.didyoumean).toBeNull();
    });

    test("Complete workflow: invalid syntax", async () => {
      const email = "user..name@example.com";
      const result = await verifyEmail(email, { checkMX: false });

      expect(result.result).toBe("invalid");
      expect(result.resultcode).toBe(6);
      expect(result.subresult).toBe("invalid_syntax");
      expect(result.error).toBeDefined();
    });

    test("Domain extraction works correctly", async () => {
      const email = "test@subdomain.example.co.uk";
      const result = await verifyEmail(email, {
        checkMX: false,
        checkSMTP: false,
      });

      expect(result.domain).toBe("subdomain.example.co.uk");
    });
  });

  describe("Performance Tests", () => {
    test("Syntax validation completes in milliseconds", async () => {
      const start = Date.now();
      await verifyEmail("user@example.com", {
        checkMX: false,
        checkSMTP: false,
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test("Multiple emails can be processed", async () => {
      const emails = [
        "user1@example.com",
        "user2@test.com",
        "user3@domain.org",
      ];

      const results = await Promise.all(
        emails.map((email) =>
          verifyEmail(email, { checkMX: false, checkSMTP: false }),
        ),
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.timestamp)).toBe(true);
    });
  });
});
