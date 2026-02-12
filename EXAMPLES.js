/**
 * Email Verification Module - Usage Examples
 * Real-world scenarios and implementation patterns
 */

const { verifyEmail, getDidYouMean, validateEmailSyntax, getMXRecords } = require('./emailVerifier');

// ============================================================================
// EXAMPLE 1: Basic Email Verification
// ============================================================================

async function example1_basicVerification() {
  console.log('\n=== EXAMPLE 1: Basic Email Verification ===\n');
  
  try {
    const result = await verifyEmail('user@example.com');
    console.log('Verification Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 2: Typo Detection and Suggestion
// ============================================================================

async function example2_typoDetection() {
  console.log('\n=== EXAMPLE 2: Typo Detection ===\n');
  
  const emailsWithTypos = [
    'john@gmial.com',      // Should suggest gmail.com
    'jane@yahooo.com',     // Should suggest yahoo.com
    'admin@hotmial.com',   // Should suggest hotmail.com
    'support@outlok.com',  // Should suggest outlook.com
  ];
  
  for (const email of emailsWithTypos) {
    const result = await verifyEmail(email, { checkMX: false, checkSMTP: false });
    
    if (result.didyoumean) {
      console.log(`❌ ${email}`);
      console.log(`   → ${result.didyoumean}`);
      console.log(`   Reason: ${result.subresult}\n`);
    }
  }
}

// ============================================================================
// EXAMPLE 3: Fast Syntax-Only Validation
// ============================================================================

async function example3_syntaxOnly() {
  console.log('\n=== EXAMPLE 3: Fast Syntax-Only Validation ===\n');
  
  const testEmails = [
    'valid.email@example.com',
    'invalid..email@example.com',
    'missing-at-sign.com',
    'missing@domain',
    'user@sub.domain.example.co.uk',
  ];
  
  for (const email of testEmails) {
    const result = await verifyEmail(email, {
      checkMX: false,
      checkSMTP: false
    });
    
    const status = result.result === 'valid' ? '✅' : '❌';
    console.log(`${status} ${email}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
}

// ============================================================================
// EXAMPLE 4: Batch Email Verification
// ============================================================================

async function example4_batchVerification() {
  console.log('\n=== EXAMPLE 4: Batch Email Verification ===\n');
  
  const emails = [
    'alice@gmail.com',
    'bob@gmial.com',
    'charlie@invalid..email.com',
    'diana@example.org',
    'eve@yahooo.com',
  ];
  
  console.log(`Processing ${emails.length} emails...\n`);
  
  const results = await Promise.all(
    emails.map(email => verifyEmail(email, { checkMX: false, checkSMTP: false }))
  );
  
  const categorized = {
    valid: [],
    invalid_syntax: [],
    typo_detected: [],
  };
  
  results.forEach((result, index) => {
    if (result.subresult === 'typo_detected') {
      categorized.typo_detected.push({
        email: result.email,
        suggestion: result.didyoumean
      });
    } else if (result.result === 'invalid') {
      categorized.invalid_syntax.push({
        email: result.email,
        error: result.error
      });
    } else {
      categorized.valid.push(result.email);
    }
  });
  
  console.log('RESULTS:\n');
  console.log(`✅ Valid: ${categorized.valid.length}`);
  categorized.valid.forEach(email => console.log(`   ${email}`));
  
  console.log(`\n⚠️  Typos Detected: ${categorized.typo_detected.length}`);
  categorized.typo_detected.forEach(item => 
    console.log(`   ${item.email} → ${item.suggestion}`)
  );
  
  console.log(`\n❌ Invalid Syntax: ${categorized.invalid_syntax.length}`);
  categorized.invalid_syntax.forEach(item =>
    console.log(`   ${item.email}: ${item.error}`)
  );
}

// ============================================================================
// EXAMPLE 5: Email Validation with User Feedback
// ============================================================================

async function example5_userFeedback() {
  console.log('\n=== EXAMPLE 5: Email Validation with User Feedback ===\n');
  
  async function validateEmailWithFeedback(email) {
    const result = await verifyEmail(email, { checkMX: false, checkSMTP: false });
    
    // Provide user-friendly feedback
    if (result.result === 'valid' && !result.didyoumean) {
      return {
        status: 'success',
        message: '✅ Email address is valid',
        email: result.email
      };
    }
    
    if (result.didyoumean) {
      return {
        status: 'warning',
        message: `⚠️ Did you mean ${result.didyoumean}?`,
        suggestion: result.didyoumean,
        original: result.email
      };
    }
    
    if (result.error) {
      return {
        status: 'error',
        message: `❌ ${result.error}`,
        email: result.email
      };
    }
    
    return {
      status: 'error',
      message: '❌ Email is invalid',
      email: result.email
    };
  }
  
  const testCases = [
    'user@example.com',
    'user@gmial.com',
    'user name@example.com',
    'missing@domain'
  ];
  
  for (const email of testCases) {
    const feedback = await validateEmailWithFeedback(email);
    console.log(`Input: ${email}`);
    console.log(`Message: ${feedback.message}\n`);
  }
}

// ============================================================================
// EXAMPLE 6: DNS MX Record Lookup
// ============================================================================

async function example6_mxLookup() {
  console.log('\n=== EXAMPLE 6: DNS MX Record Lookup ===\n');
  
  const domains = ['gmail.com', 'example.com', 'example.invalid'];
  
  for (const domain of domains) {
    try {
      const mxRecords = await getMXRecords(domain);
      console.log(`📧 ${domain}`);
      if (mxRecords.length > 0) {
        mxRecords.forEach((mx, index) => {
          console.log(`   ${index + 1}. ${mx}`);
        });
      } else {
        console.log('   No MX records found');
      }
      console.log();
    } catch (error) {
      console.log(`❌ ${domain}: ${error.message}\n`);
    }
  }
}

// ============================================================================
// EXAMPLE 7: Email Validation for Form Submission
// ============================================================================

async function example7_formValidation() {
  console.log('\n=== EXAMPLE 7: Email Validation for Form Submission ===\n');
  
  class EmailValidator {
    constructor(options = {}) {
      this.requireValidDomain = options.requireValidDomain || false;
      this.checkMX = options.checkMX !== false;
      this.checkSMTP = options.checkSMTP || false;
    }
    
    async validate(email) {
      const result = await verifyEmail(email, {
        checkMX: this.checkMX,
        checkSMTP: this.checkSMTP
      });
      
      return {
        isValid: result.result === 'valid' || (result.result === 'unknown' && result.subresult === 'greylisted'),
        email: result.email,
        suggestion: result.didyoumean,
        errors: result.error ? [result.error] : [],
        warnings: result.didyoumean ? [`Did you mean: ${result.didyoumean}?`] : []
      };
    }
  }
  
  // Use the validator
  const validator = new EmailValidator({
    checkMX: true,
    checkSMTP: false
  });
  
  const testEmails = [
    'valid@example.com',
    'typo@gmial.com',
    'invalid@..com'
  ];
  
  for (const email of testEmails) {
    const validation = await validator.validate(email);
    console.log(`Email: ${email}`);
    console.log(`Valid: ${validation.isValid}`);
    if (validation.errors.length > 0) {
      console.log(`Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`Warnings: ${validation.warnings.join(', ')}`);
    }
    console.log();
  }
}

// ============================================================================
// EXAMPLE 8: Did You Mean Suggestions
// ============================================================================

async function example8_didYouMean() {
  console.log('\n=== EXAMPLE 8: "Did You Mean?" Feature ===\n');
  
  const commonTypos = [
    'user@gmai.com',
    'admin@gmial.com',
    'contact@yahooo.com',
    'support@hotmial.com',
    'info@outlok.com',
    'hello@example.com'  // This one has no typo
  ];
  
  console.log('Email Typo Corrections:\n');
  
  for (const email of commonTypos) {
    const suggestion = getDidYouMean(email);
    if (suggestion) {
      console.log(`🔄 ${email}`);
      console.log(`   → ${suggestion}\n`);
    } else {
      console.log(`✓ ${email} (no typo detected)\n`);
    }
  }
}

// ============================================================================
// EXAMPLE 9: Error Handling and Recovery
// ============================================================================

async function example9_errorHandling() {
  console.log('\n=== EXAMPLE 9: Error Handling and Recovery ===\n');
  
  async function verifyWithRetry(email, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Verifying ${email}`);
        
        const result = await verifyEmail(email, {
          checkMX: true,
          checkSMTP: true,
          timeout: 10000
        });
        
        if (result.result === 'unknown' && attempt < maxRetries) {
          console.log(`  ⚠️ Temporary issue, retrying...\n`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`  ❌ Error: ${error.message}, retrying...\n`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  try {
    const result = await verifyWithRetry('test@example.com', 2);
    console.log(`\nFinal Result: ${result.result}`);
    console.log(`Subresult: ${result.subresult}`);
  } catch (error) {
    console.error(`\nFailed after retries: ${error.message}`);
  }
}

// ============================================================================
// EXAMPLE 10: Performance Benchmarking
// ============================================================================

async function example10_performance() {
  console.log('\n=== EXAMPLE 10: Performance Benchmarking ===\n');
  
  const testCases = [
    { email: 'user@example.com', options: { checkMX: false, checkSMTP: false }, label: 'Syntax Only' },
    { email: 'user@example.com', options: { checkMX: true, checkSMTP: false }, label: 'Syntax + MX' },
  ];
  
  console.log('Performance Test Results:\n');
  
  for (const testCase of testCases) {
    const times = [];
    const iterations = 3;
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await verifyEmail(testCase.email, testCase.options);
      times.push(Date.now() - start);
    }
    
    const avgTime = Math.round(times.reduce((a, b) => a + b) / times.length);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`${testCase.label}:`);
    console.log(`  Average: ${avgTime}ms`);
    console.log(`  Min: ${minTime}ms`);
    console.log(`  Max: ${maxTime}ms\n`);
  }
}

// ============================================================================
// Main Runner
// ============================================================================

async function runAllExamples() {
  try {
    // Uncomment examples to run them
    await example1_basicVerification();
    await example2_typoDetection();
    await example3_syntaxOnly();
    await example4_batchVerification();
    await example5_userFeedback();
    // await example6_mxLookup();        // Requires DNS access
    await example7_formValidation();
    await example8_didYouMean();
    // await example9_errorHandling();    // Requires working SMTP
    await example10_performance();
    
    console.log('\n✅ All examples completed!\n');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Export for module usage
module.exports = {
  example1_basicVerification,
  example2_typoDetection,
  example3_syntaxOnly,
  example4_batchVerification,
  example5_userFeedback,
  example6_mxLookup,
  example7_formValidation,
  example8_didYouMean,
  example9_errorHandling,
  example10_performance,
};

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}
