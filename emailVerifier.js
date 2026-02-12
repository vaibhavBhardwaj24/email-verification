const dns = require("dns").promises;
const net = require("net");

// Email format validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common email domain typos with corrections
const COMMON_TYPOS = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "ymail.com": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.cm": "outlook.com",
  "goggle.com": "google.com",
  "icloud.cm": "icloud.com",
  "protonmail.co": "protonmail.com",
  "aol.com": "aol.com",
};

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "temp-mail.org",
  "dropmail.me",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com",
  "getnada.com",
  "maildrop.cc",
]);

// Common role-based prefixes
const ROLE_ACCOUNTS = new Set([
  "admin",
  "administrator",
  "support",
  "info",
  "sales",
  "billing",
  "help",
  "contact",
  "webmaster",
  "sysadmin",
  "postmaster",
  "hostmaster",
  "root",
  "hr",
  "jobs",
  "office",
  "marketing",
]);

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  return matrix[str2.length][str1.length];
}

function validateEmailSyntax(email) {
  if (!email) {
    return { valid: false, error: "Email is empty" };
  }

  if (typeof email !== "string") {
    return { valid: false, error: "Email must be a string" };
  }

  email = email.trim();

  if (email.length > 254) {
    return {
      valid: false,
      error: "Email exceeds maximum length (254 characters)",
    };
  }

  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) {
    return {
      valid: false,
      error: `Email must contain exactly one @ symbol (found ${atCount})`,
    };
  }

  if (!STRICT_EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Email format is invalid" };
  }

  const [localPart, domain] = email.split("@");

  if (localPart.length > 64) {
    return {
      valid: false,
      error: "Local part exceeds maximum length (64 characters)",
    };
  }

  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return { valid: false, error: "Local part cannot start or end with a dot" };
  }

  if (localPart.includes("..")) {
    return {
      valid: false,
      error: "Local part cannot contain consecutive dots",
    };
  }

  if (!domain.includes(".")) {
    return { valid: false, error: "Domain must contain at least one dot" };
  }

  return { valid: true };
}

async function getMXRecords(domain) {
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return [];
    }
    // Sort by priority and return just the hostnames
    return mxRecords
      .sort((a, b) => a.priority - b.priority)
      .map((mx) => mx.exchange);
  } catch (error) {
    throw new Error(`DNS lookup failed for ${domain}: ${error.message}`);
  }
}

function tryPort(email, mxServer, port, timeout) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: mxServer,
      port,
      timeout,
    });

    let responseCode = 0;
    let responseMessage = "";
    const timeoutId = setTimeout(() => {
      socket.destroy();
      resolve({
        success: false,
        responseCode: 0,
        message: `Port ${port}: timeout`,
        port,
      });
    }, timeout);

    socket.on("data", (data) => {
      const response = data.toString().trim();
      const code = parseInt(response.substring(0, 3));

      if (code === 220) {
        socket.write(`EHLO verify.local\r\n`);
      } else if (code === 250) {
        if (response.includes("EHLO") || response.includes("HELO")) {
          socket.write(`MAIL FROM:<verify@verify.local>\r\n`);
        } else if (response.includes("MAIL FROM")) {
          socket.write(`RCPT TO:<${email}>\r\n`);
        } else if (response.includes("RCPT TO")) {
          responseCode = code;
          responseMessage = response;
          socket.write("QUIT\r\n");
        }
      } else if (code >= 400 && code < 600) {
        responseCode = code;
        responseMessage = response;
        socket.write("QUIT\r\n");
      } else if (code === 221) {
        socket.end();
      }
    });

    socket.on("end", () => {
      clearTimeout(timeoutId);
      resolve({
        success: responseCode >= 250 && responseCode < 300,
        responseCode,
        message: responseMessage,
        port,
      });
    });

    socket.on("error", (error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        responseCode: 0,
        message: `Port ${port}: ${error.message}`,
        port,
      });
    });
  });
}

function verifyWithSMTP(email, mxServer, timeout = 5000) {
  const ports = [25, 587, 465];

  return new Promise((mainResolve) => {
    let pending = ports.length;
    let resolved = false;
    const results = [];

    ports.forEach((port) => {
      tryPort(email, mxServer, port, timeout).then((result) => {
        if (resolved) return;

        results.push(result);
        pending--;

        // 1. Success (Valid email)
        if (result.success) {
          resolved = true;
          mainResolve({ ...result, allPortsBlocked: false });
          return;
        }

        // 2. Definitive Failure (User doesn't exist, rejected)
        // 5xx codes are permanent errors.
        if (result.responseCode >= 550 && result.responseCode < 600) {
          resolved = true;
          mainResolve({ ...result, allPortsBlocked: false });
          return;
        }

        // 3. If all finished
        if (pending === 0) {
          // Find the "best" result.
          // If we have any response code > 0, that's better than a timeout (0).
          const bestResult =
            results.find((r) => r.responseCode > 0) || results[0];
          const allBlocked = results.every((r) => r.responseCode === 0); // 0 is timeout/error

          mainResolve({
            ...bestResult,
            allPortsBlocked: allBlocked,
            message: allBlocked ? "All SMTP ports blocked" : bestResult.message,
            lastError: bestResult, // Return logic expects this sometimes
          });
        }
      });
    });
  });
}

function interpretSMTPCode(code) {
  if (code === 0) return "connection_error";
  if (code >= 250 && code < 300) return "mailbox_exists";
  if (code === 550 || code === 551 || code === 553)
    return "mailbox_does_not_exist";
  if (code === 450 || code === 451 || code === 452) return "greylisted";
  if (code === 421) return "service_unavailable";
  if (
    code === 500 ||
    code === 501 ||
    code === 502 ||
    code === 503 ||
    code === 504
  )
    return "smtp_error";
  return "unknown_response";
}

function suggestCorrection(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return null;
  const [localPart, domain] = email.split("@");

  // Check exact typo matches first
  if (COMMON_TYPOS[domain]) {
    return {
      suggested: `${localPart}@${COMMON_TYPOS[domain]}`,
      distance: 0,
    };
  }

  // Fuzzy matching with Levenshtein distance
  let bestMatch = null;
  let bestDistance = 2; // Threshold

  for (const [typo, correct] of Object.entries(COMMON_TYPOS)) {
    const distance = levenshteinDistance(domain, typo);
    if (distance <= bestDistance && correct !== domain) {
      bestDistance = distance;
      bestMatch = {
        suggested: `${localPart}@${correct}`,
        distance,
      };
    }
  }

  return bestMatch;
}

async function verifyEmail(email, options = {}) {
  const startTime = Date.now();
  const {
    checkMX = true,
    checkSMTP = true,
    timeout = 2500,
    maxAttempts = 2,
  } = options;

  const result = {
    email: email?.trim?.() || "",
    result: "unknown",
    resultcode: 3,
    subresult: "unknown",
    domain: "",
    mxRecords: [],
    executiontime: 0,
    error: null,
    timestamp: new Date().toISOString(),
    didyoumean: null,
    smtpBlocked: false, // NEW: Flag for SMTP blockage
    smtpChecked: false, // NEW: Whether SMTP was attempted
    verificationMethod: "unknown", // NEW: Which method was used
    disposable: false, // NEW: Whether the domain is disposable
    roleBased: false, // NEW: Whether the account is role-based
    steps: {
      syntax: { valid: false, message: "Pending" },
      mx: { valid: null, message: "Skipped" },
      smtp: { valid: null, message: "Skipped" },
    },
  };

  try {
    // Step 1: Validate syntax
    const syntaxValidation = validateEmailSyntax(email);
    if (!syntaxValidation.valid) {
      result.result = "invalid";
      result.resultcode = 6;
      result.subresult = "invalid_syntax";
      result.error = syntaxValidation.error;
      result.verificationMethod = "syntax_validation";
      result.steps.syntax = { valid: false, message: syntaxValidation.error };
      result.executiontime = Math.round((Date.now() - startTime) / 1000);
      return result;
    }
    result.steps.syntax = { valid: true, message: "Format is valid" };

    const [localPart, domain] = email.trim().split("@");
    result.domain = domain;
    result.disposable = DISPOSABLE_DOMAINS.has(domain.toLowerCase());
    result.roleBased = ROLE_ACCOUNTS.has(localPart.toLowerCase());

    // Step 2: Check for typos
    const suggestion = suggestCorrection(email.trim());
    if (suggestion && suggestion.suggested !== email.trim()) {
      result.didyoumean = suggestion.suggested;
      result.result = "invalid";
      result.resultcode = 6;
      result.subresult = "typo_detected";
      result.verificationMethod = "typo_detection";
      result.executiontime = Math.round((Date.now() - startTime) / 1000);
      return result;
    }

    // Step 3: Get MX records
    if (checkMX) {
      try {
        const mxRecords = await getMXRecords(domain);
        if (mxRecords.length === 0) {
          result.result = "invalid";
          result.resultcode = 6;
          result.subresult = "no_mx_records";
          result.error = "No MX records found for domain";
          result.verificationMethod = "dns_lookup";
          result.steps.mx = { valid: false, message: "No MX records found" };
          result.executiontime = Math.round((Date.now() - startTime) / 1000);
          return result;
        }
        result.mxRecords = mxRecords;
        result.steps.mx = {
          valid: true,
          message: `Found ${mxRecords.length} MX records`,
        };
      } catch (error) {
        result.result = "invalid";
        result.resultcode = 6;
        result.subresult = "dns_lookup_failed";
        result.error = error.message;
        result.verificationMethod = "dns_lookup";
        result.steps.mx = { valid: false, message: error.message };
        result.executiontime = Math.round((Date.now() - startTime) / 1000);
        return result;
      }
    }

    // Step 4: SMTP verification
    if (checkSMTP && result.mxRecords.length > 0) {
      result.smtpChecked = true;

      let smtpSuccess = false;
      let lastResponseCode = 0;
      let lastMessage = "";
      let smtpBlocked = false;

      for (let i = 0; i < Math.min(maxAttempts, result.mxRecords.length); i++) {
        const mxServer = result.mxRecords[i];

        // Try SMTP on all ports
        const smtpResult = await verifyWithSMTP(
          email.trim(),
          mxServer,
          timeout,
        );

        lastResponseCode = smtpResult.responseCode;
        lastMessage = smtpResult.message;

        // Check if SMTP is blocked (all ports timed out)
        if (smtpResult.allPortsBlocked) {
          smtpBlocked = true;
        }

        if (smtpResult.success) {
          smtpSuccess = true;
          result.verificationMethod = "smtp_verification";
          break;
        }

        // If we get a definitive negative response, don't try other servers
        if (lastResponseCode >= 550 && lastResponseCode < 600) {
          result.verificationMethod = "smtp_verification";
          break;
        }
      }

      const subresult = interpretSMTPCode(lastResponseCode);
      result.subresult = subresult;
      result.smtpBlocked = smtpBlocked;

      // Determine result based on SMTP response
      if (smtpSuccess) {
        result.result = "valid";
        result.resultcode = 1;
        result.steps.smtp = { valid: true, message: "Mailbox exists" };
      } else if (smtpBlocked) {
        // SMTP is blocked, but previous checks passed
        // Use DNS validation as fallback
        result.result = "valid";
        result.resultcode = 1;
        result.subresult = "smtp_blocked_but_mx_valid";
        result.verificationMethod = "dns_lookup_fallback";
        result.error =
          "SMTP ports blocked (all ports timeout) - Verified via DNS MX records";
        result.steps.smtp = {
          valid: null,
          message: "Blocked/Timeout (Fallback to DNS)",
        };
      } else if (lastResponseCode >= 450 && lastResponseCode < 500) {
        result.result = "unknown";
        result.resultcode = 3;
        result.steps.smtp = {
          valid: false,
          message: `Greylisted/Throttled (${lastResponseCode})`,
        };
      } else if (lastResponseCode >= 550 && lastResponseCode < 600) {
        result.result = "invalid";
        result.resultcode = 6;
        result.steps.smtp = {
          valid: false,
          message: `Mailbox not found / Rejected (${lastResponseCode})`,
        };
      } else {
        result.result = "unknown";
        result.resultcode = 3;
        result.steps.smtp = {
          valid: false,
          message: `Unknown response (${lastResponseCode})`,
        };
      }

      if (!smtpSuccess && lastMessage) {
        result.error = lastMessage;
      }
    } else if (!checkSMTP) {
      result.result = "valid";
      result.resultcode = 1;
      result.subresult = "syntax_and_mx_valid";
      result.smtpChecked = false;
      result.verificationMethod = "dns_lookup";
      result.steps.smtp = { valid: null, message: "Skipped by config" };
    }

    result.executiontime = Math.round((Date.now() - startTime) / 1000);
    return result;
  } catch (error) {
    result.result = "unknown";
    result.resultcode = 3;
    result.subresult = "verification_error";
    result.error = error.message;
    result.executiontime = Math.round((Date.now() - startTime) / 1000);
    return result;
  }
}

function getDidYouMean(email) {
  if (!email || typeof email !== "string") return null;
  const suggestion = suggestCorrection(email.trim());
  return suggestion ? suggestion.suggested : null;
}

module.exports = {
  verifyEmail,
  getDidYouMean,
  validateEmailSyntax,
  getMXRecords,
  verifyWithSMTP,
  levenshteinDistance,
  _interpretSMTPCode: interpretSMTPCode,
  _suggestCorrection: suggestCorrection,
};
