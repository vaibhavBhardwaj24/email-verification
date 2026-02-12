# Email Verification Module

A comprehensive Node.js module for verifying email addresses using SMTP protocol with DNS MX lookup, syntax validation, and intelligent typo detection.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Configuration Options](#configuration-options)
- [Response Format](#response-format)
- [Typo Detection](#typo-detection)
- [SMTP Error Codes](#smtp-error-codes)
- [Testing](#testing)
- [Examples](#examples)
- [Performance](#performance)

## Features

### Part 1: Core Email Verification ✅

- **Email Syntax Validation**: Comprehensive regex and format checking based on RFC 5322
- **DNS MX Lookup**: Retrieves and validates mail server records
- **SMTP Verification**: Connects to SMTP servers and checks mailbox existence using RCPT TO command
- **Disposable Email Detection**: Identifies temporary and disposable email addresses
- **Role-Based Account Detection**: Detects common role-based prefixes (admin, support, etc.)
- **Error Handling**: Detailed error messages and response codes
- **Structured Output**: Returns detailed verification results with metadata

### Part 2: Typo Detection ✅

- **Levenshtein Distance**: Fuzzy matching algorithm for domain typos
- **Common Typos Database**: Pre-configured common misspellings (gmial.com, yahooo.com, etc.)
- **Smart Suggestions**: Suggests corrections for invalid emails with typos
- **Edit Distance Threshold**: Supports typos up to 2 character edits

### Part 3: Comprehensive Testing ✅

- **15+ Test Cases**: Covers syntax validation, SMTP codes, and edge cases
- **Jest Framework**: Complete test suite with coverage reporting
- **Integration Tests**: Full workflow testing
- **Performance Tests**: Validation of execution times

## Installation

```bash
# Install Node.js dependencies
npm install

# Install Jest for testing (dev dependency)
npm install --save-dev jest
```

## Quick Start

```javascript
const { verifyEmail, getDidYouMean } = require("./emailVerifier");

// Basic verification
const result = await verifyEmail("user@example.com");
console.log(result);

// With typo detection
const typoResult = await verifyEmail("user@gmial.com");
console.log(typoResult.didyoumean); // user@gmail.com

// Get suggestion without full verification
const suggestion = getDidYouMean("contact@yahooo.com");
console.log(suggestion); // contact@yahoo.com
```

## API Reference

### `verifyEmail(email, options)`

Verifies an email address with comprehensive checks.

**Parameters:**

- `email` (string): Email address to verify
- `options` (object, optional):
  - `checkMX` (boolean): Perform DNS MX lookup (default: `true`)
  - `checkSMTP` (boolean): Perform SMTP verification (default: `true`)
  - `timeout` (number): SMTP connection timeout in milliseconds (default: `10000`)
  - `maxAttempts` (number): Maximum MX servers to try (default: `3`)

**Returns:** Promise resolving to verification result object

**Example:**

```javascript
const result = await verifyEmail("user@example.com", {
  checkMX: true,
  checkSMTP: true,
  timeout: 15000,
});
```

### `getDidYouMean(email)`

Suggests corrections for email addresses with typos.

**Parameters:**

- `email` (string): Email address to check for typos

**Returns:** Suggested email (string) or `null` if no typo detected

**Example:**

```javascript
const suggestion = getDidYouMean("john@gmai.com");
// Returns: 'john@gmail.com'
```

### `validateEmailSyntax(email)`

Validates email format without SMTP or DNS checks.

**Parameters:**

- `email` (string): Email address to validate

**Returns:** Object with `{valid: boolean, error?: string}`

**Example:**

```javascript
const validation = validateEmailSyntax("user@example.com");
if (validation.valid) {
  console.log("Email format is correct");
}
```

### `getMXRecords(domain)`

Retrieves MX records for a domain.

**Parameters:**

- `domain` (string): Domain name

**Returns:** Promise resolving to array of MX server hostnames

**Example:**

```javascript
const mxServers = await getMXRecords("example.com");
console.log(mxServers); // ['mx1.example.com', 'mx2.example.com']
```

### `levenshteinDistance(str1, str2)`

Calculates edit distance between two strings.

**Parameters:**

- `str1` (string): First string
- `str2` (string): Second string

**Returns:** Number representing minimum edits needed

**Example:**

```javascript
const distance = levenshteinDistance("gmail", "gmial");
console.log(distance); // 1
```

## Configuration Options

### checkMX (boolean)

Enable DNS MX record lookup. Set to `false` for faster validation when you only need syntax checking.

### checkSMTP (boolean)

Enable SMTP server verification. Set to `false` for faster validation when you only need syntax and MX checking.

### timeout (number)

Milliseconds to wait for SMTP connection. Default is 10 seconds. Increase for unreliable networks.

### maxAttempts (number)

How many MX servers to try before giving up. Default is 3. Mail servers often have multiple MX records with fallback.

**Quick Verification (syntax only):**

```javascript
const result = await verifyEmail("user@example.com", {
  checkMX: false,
  checkSMTP: false,
});
```

**Full Verification (all checks):**

```javascript
const result = await verifyEmail("user@example.com", {
  checkMX: true,
  checkSMTP: true,
  timeout: 15000,
  maxAttempts: 5,
});
```

## Response Format

All verification results follow this structure:

```javascript
{
  email: "user@example.com",
  result: "valid" | "invalid" | "unknown",
  resultcode: 1 | 3 | 6,
  subresult: "mailbox_exists" | "mailbox_does_not_exist" |
             "greylisted" | "connection_error" | "invalid_syntax" |
             "typo_detected" | "dns_lookup_failed" | "no_mx_records" | etc.,
  domain: "example.com",
  mxRecords: ["mx1.example.com", "mx2.example.com"],
  executiontime: 2,                          // seconds
  error: null | "error message",
  didyoumean: null | "suggested@email.com",
  timestamp: "2026-02-11T10:30:00.000Z",
  smtpBlocked: false,
  smtpChecked: true,
  verificationMethod: "smtp_verification",
  disposable: false,
  roleBased: false
}
```

### Result Codes

| Code | Result  | Meaning                                                       |
| ---- | ------- | ------------------------------------------------------------- |
| 1    | valid   | Email is valid and mailbox exists                             |
| 3    | unknown | Cannot determine validity (temporary issue, greylisted, etc.) |
| 6    | invalid | Email is invalid or mailbox does not exist                    |

### Subresult Types

**Success:**

- `mailbox_exists` - SMTP 250/251: Mailbox verified
- `syntax_and_mx_valid` - Email format and MX records valid (SMTP not checked)

**Invalid:**

- `invalid_syntax` - Email format invalid
- `mailbox_does_not_exist` - SMTP 550/551/553
- `no_mx_records` - No MX records found for domain
- `typo_detected` - Common domain typo detected

**Unknown/Temporary:**

- `greylisted` - SMTP 450/451/452: Server temporarily rejected
- `connection_error` - Cannot connect to mail server
- `service_unavailable` - SMTP 421: Service unavailable
- `dns_lookup_failed` - DNS resolution failed
- `smtp_error` - SMTP 500+ error

## Typo Detection

The module includes intelligent typo detection for common email domain mistakes.

### Supported Common Typos

The following domain typos are automatically detected and corrected:

| Typo          | Correction     |
| ------------- | -------------- |
| gmial.com     | gmail.com      |
| gmai.com      | gmail.com      |
| gmil.com      | gmail.com      |
| gmail.co      | gmail.com      |
| gmail.cm      | gmail.com      |
| yahooo.com    | yahoo.com      |
| yaho.com      | yahoo.com      |
| hotmial.com   | hotmail.com    |
| hotmail.co    | hotmail.com    |
| hotmil.com    | hotmail.com    |
| outlok.com    | outlook.com    |
| outlook.co    | outlook.com    |
| outloo.com    | outlook.com    |
| outlook.cm    | outlook.com    |
| ymail.com     | gmail.com      |
| goggle.com    | google.com     |
| icloud.cm     | icloud.com     |
| protonmail.co | protonmail.com |

### Fuzzy Matching

Beyond exact typo matches, the module uses the Levenshtein distance algorithm to suggest corrections for domains similar to known email providers. The threshold is set to 2 character edits.

**Example:**

```javascript
// Exact match in typo database
await verifyEmail("user@gmial.com");
// result.didyoumean === 'user@gmail.com'

// Fuzzy match with distance 1
await verifyEmail("user@yahooo.com");
// result.didyoumean === 'user@yahoo.com'

// No match
await verifyEmail("user@example.com");
// result.didyoumean === null
```

## SMTP Error Codes

The module interprets SMTP response codes to determine validity:

| Code    | Classification | Subresult                           | Result  |
| ------- | -------------- | ----------------------------------- | ------- |
| 250-299 | Success        | mailbox_exists                      | valid   |
| 421     | Temporary      | service_unavailable                 | unknown |
| 450-459 | Temporary      | greylisted                          | unknown |
| 500-599 | Permanent      | smtp_error / mailbox_does_not_exist | invalid |

**Common SMTP Codes:**

- **250**: OK - Mailbox verified
- **421**: Service not available - Try later
- **450**: Requested action not taken - Greylisted
- **550**: Mailbox unavailable - Does not exist
- **551**: User not local - Invalid mailbox
- **553**: Invalid mailbox name - Format error

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

### Test Categories

The test suite includes:

1. **Email Syntax Validation Tests (9 tests)**
   - Valid formats (simple, subdomains, special characters)
   - Invalid formats (missing @, multiple @, double dots, etc.)

2. **Edge Case Handling Tests (8 tests)**
   - Empty strings, null, undefined
   - Very long emails and local parts
   - Non-string inputs
   - Whitespace handling

3. **SMTP Error Code Interpretation Tests (11 tests)**
   - All relevant SMTP codes (250, 450, 550, etc.)
   - Response code mapping
   - Error classification

4. **Levenshtein Distance Tests (6 tests)**
   - Basic operations (insert, delete, substitute)
   - Multiple edits
   - Edge cases

5. **Typo Detection Tests (9 tests)**
   - Common typos (gmial, yahooo, hotmial, outlok)
   - Correct domains
   - Invalid inputs
   - getDidYouMean function

6. **Async Verification Function Tests (11 tests)**
   - Response structure
   - Invalid syntax handling
   - Typo detection
   - Timestamp and execution time
   - Domain extraction

7. **Integration Tests (4 tests)**
   - Complete workflows
   - Real-world scenarios
   - Domain extraction

8. **Performance Tests (2 tests)**
   - Execution speed
   - Batch processing

**Total: 60+ test cases with comprehensive coverage**

## Examples

### Example 1: Verify a Valid Email

```javascript
const { verifyEmail } = require("./emailVerifier");

async function checkEmail() {
  const result = await verifyEmail("john.doe@gmail.com");

  console.log(result);
  /* Output:
  {
    email: 'john.doe@gmail.com',
    result: 'valid',
    resultcode: 1,
    subresult: 'mailbox_exists',
    domain: 'gmail.com',
    mxRecords: ['aspmx.l.google.com', 'alt1.aspmx.l.google.com'],
    executiontime: 3,
    error: null,
    didyoumean: null,
    timestamp: '2026-02-11T10:30:00.000Z'
  }
  */
}

checkEmail();
```

### Example 2: Detect a Typo

```javascript
const { verifyEmail } = require("./emailVerifier");

async function detectTypo() {
  const result = await verifyEmail("contact@gmial.com");

  console.log(`Valid: ${result.result}`);
  console.log(`Did you mean: ${result.didyoumean}`);
  /* Output:
  Valid: invalid
  Did you mean: contact@gmail.com
  */
}

detectTypo();
```

### Example 3: Fast Syntax Check Only

```javascript
const { verifyEmail } = require("./emailVerifier");

async function quickCheck() {
  const result = await verifyEmail("user@example.com", {
    checkMX: false,
    checkSMTP: false,
  });

  console.log(`Syntax valid: ${result.result === "valid"}`);
  console.log(`Execution time: ${result.executiontime}ms`);
}

quickCheck();
```

### Example 4: Get Suggestion for Typo

```javascript
const { getDidYouMean } = require("./emailVerifier");

const emails = [
  "user@gmail.com", // null (correct)
  "user@gmial.com", // user@gmail.com
  "user@yahooo.com", // user@yahoo.com
  "user@example.com", // null (unknown domain)
];

emails.forEach((email) => {
  const suggestion = getDidYouMean(email);
  if (suggestion) {
    console.log(`${email} → ${suggestion}`);
  }
});
```

### Example 5: Batch Verification with Error Handling

```javascript
const { verifyEmail } = require("./emailVerifier");

async function verifyBatch(emails) {
  const results = await Promise.all(emails.map((email) => verifyEmail(email)));

  const valid = results.filter((r) => r.result === "valid");
  const invalid = results.filter((r) => r.result === "invalid");
  const unknown = results.filter((r) => r.result === "unknown");

  console.log(`Valid: ${valid.length}`);
  console.log(`Invalid: ${invalid.length}`);
  console.log(`Unknown: ${unknown.length}`);

  // Show typos
  invalid.forEach((r) => {
    if (r.didyoumean) {
      console.log(`Typo detected: ${r.email} → ${r.didyoumean}`);
    }
  });
}

verifyBatch(["user1@example.com", "user2@gmial.com", "user3@hotmail.com"]);
```

### Example 6: Detect Disposable and Role-Based Emails

```javascript
const { verifyEmail } = require("./emailVerifier");

async function checkSpecialEmails() {
  // Disposable email
  const disposable = await verifyEmail("test@mailinator.com", {
    checkSMTP: false,
  });
  console.log(`Is disposable: ${disposable.disposable}`); // true

  // Role-based account
  const role = await verifyEmail("support@example.com", { checkSMTP: false });
  console.log(`Is role-based: ${role.roleBased}`); // true
}

checkSpecialEmails();
```

## Performance

### Execution Times

- **Syntax only**: ~1-5ms
- **Syntax + MX**: ~200-500ms (depends on DNS)
- **Syntax + MX + SMTP**: ~2-10s (depends on mail servers)

### Optimization Tips

1. **Disable SMTP for high-volume syntax checking:**

   ```javascript
   verifyEmail(email, { checkMX: false, checkSMTP: false });
   ```

2. **Set shorter timeout for unreliable networks:**

   ```javascript
   verifyEmail(email, { timeout: 5000 });
   ```

3. **Limit MX server attempts:**

   ```javascript
   verifyEmail(email, { maxAttempts: 1 });
   ```

4. **Use batch processing with Promise.all():**
   ```javascript
   Promise.all(emails.map((e) => verifyEmail(e)));
   ```

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass and add new tests for any new functionality.

```bash
npm test
```

## Troubleshooting

### SMTP Connection Timeout

If you're getting timeout errors, increase the timeout:

```javascript
verifyEmail(email, { timeout: 15000 });
```

### DNS Lookup Failures

Ensure your system can resolve DNS. For Docker environments, you may need to configure DNS servers.

### Rate Limiting

Some mail servers may reject multiple SMTP checks from the same IP. Consider implementing rate limiting and retry logic.

## Technical Details

### Architecture

```
Input Email
    ↓
Syntax Validation
    ↓
Typo Detection (Levenshtein Distance)
    ↓
DNS MX Lookup
    ↓
SMTP Verification (Multiple Servers)
    ↓
Response Object
```

### Dependencies

- Node.js built-in modules: `dns`, `net`
- No external production dependencies
- Jest (dev dependency) for testing

### Security Considerations

- SMTP connections use plain port 25 (standard for verification)
- No authentication required for verification
- Safe domain resolution
- Input validation and sanitization
