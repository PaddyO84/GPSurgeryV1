function testReportError() {
  const mockError = new Error("This is a test error");
  mockError.name = "TestError";
  mockError.stack = "Stack trace line 1\nStack trace line 2";

  const calls = [];
  // Mock MailApp to capture 4-argument sendEmail(recipient, subject, body, options)
  const mockMailApp = {
    sendEmail: function(recipient, subject, body, options) {
      calls.push({ recipient, subject, body, options });
      console.log("MailApp.sendEmail called with:", { recipient, subject, body, options });
    }
  };
  // Replace the real MailApp with the mock
  const realMailApp = typeof MailApp !== 'undefined' ? MailApp : undefined;
  MailApp = mockMailApp;

  try {
    console.log("Running testReportError...");
    reportError("testFunction", mockError, 123);
    
    if (calls.length !== 1) {
      throw new Error(`Expected exactly 1 call to MailApp.sendEmail, got ${calls.length}`);
    }
    const call = calls[0];
    if (call.recipient !== ADMIN_EMAIL) {
      throw new Error(`Expected recipient to be ${ADMIN_EMAIL}, got ${call.recipient}`);
    }
    if (!call.options || !call.options.htmlBody || !call.options.htmlBody.includes("row <strong>123</strong>")) {
      throw new Error(`Expected options.htmlBody to contain 'row <strong>123</strong>', got: ${call.options ? call.options.htmlBody : 'undefined'}`);
    }
    console.log("testReportError completed successfully.");
  } finally {
    // Restore the real MailApp
    if (realMailApp !== undefined) {
      MailApp = realMailApp;
    } else {
      delete MailApp;
    }
  }
}

function testReportErrorFailurePath() {
  const mockError = new Error("Original catastrophic failure");
  let sendEmailAttempted = false;

  // Mock MailApp to simulate email failure
  const mockMailApp = {
    sendEmail: function() {
      sendEmailAttempted = true;
      throw new Error("MailApp quota exceeded or service unavailable");
    }
  };

  const realMailApp = typeof MailApp !== 'undefined' ? MailApp : undefined;
  MailApp = mockMailApp;

  try {
    console.log("Running testReportErrorFailurePath...");
    // reportError should catch the sendEmail exception and log it without re-throwing
    reportError("testFailingFunction", mockError, 456);

    if (!sendEmailAttempted) {
      throw new Error("Expected MailApp.sendEmail to have been attempted");
    }
    console.log("testReportErrorFailurePath completed successfully.");
  } finally {
    if (realMailApp !== undefined) {
      MailApp = realMailApp;
    } else {
      delete MailApp;
    }
  }
}

function testDoPostErrorPath() {
  const originalReportError = typeof reportError !== 'undefined' ? reportError : undefined;
  let reportErrorCalled = false;
  let reportedFn = null;
  let reportedErr = null;

  reportError = function(fnName, err, row) {
    reportErrorCalled = true;
    reportedFn = fnName;
    reportedErr = err;
  };

  try {
    console.log("Running testDoPostErrorPath...");
    // Isolate shared rate-limit state with in-memory CacheService stub
    const originalCacheService = typeof CacheService !== 'undefined' ? CacheService : undefined;
    const inMemoryStore = {};
    const mockCache = {
      get: function(key) { return inMemoryStore[key] || null; },
      put: function(key, val, exp) { inMemoryStore[key] = String(val); },
      remove: function(key) { delete inMemoryStore[key]; }
    };
    if (typeof CacheService !== 'undefined') {
      CacheService = {
        ...originalCacheService,
        getScriptCache: function() { return mockCache; }
      };
    }

    // Pass valid JSON with an unexpected error in processing to trigger reportError
    const originalGetProperties = PropertiesService.getScriptProperties;
    PropertiesService.getScriptProperties = function() {
      throw new Error("Simulated PropertiesService failure");
    };

    try {
      const mockEvent = {
        postData: {
          contents: JSON.stringify({ formType: 'prescription', submissionToken: 'test' })
        }
      };
      const response = doPost(mockEvent);
      const content = JSON.parse(response.getContent());

      if (!reportErrorCalled || reportedFn !== 'doPost') {
        throw new Error(`Expected reportError to be called for 'doPost', got called: ${reportErrorCalled}, fn: ${reportedFn}`);
      }
      if (!content || content.result !== 'error') {
        throw new Error(`Expected error JSON response from doPost, got: ${JSON.stringify(content)}`);
      }
    } finally {
      PropertiesService.getScriptProperties = originalGetProperties;
      if (originalCacheService !== undefined) {
        CacheService = originalCacheService;
      }
    }
    console.log("testDoPostErrorPath completed successfully.");
  } finally {
    if (originalReportError !== undefined) {
      reportError = originalReportError;
    } else {
      delete reportError;
    }
  }
}

function testSendConfirmationNotification() {
  console.log("Running testSendConfirmationNotification...");
  const realMailApp = typeof MailApp !== 'undefined' ? MailApp : undefined;
  const realHtmlService = typeof HtmlService !== 'undefined' ? HtmlService : undefined;
  const realQuota = typeof hasEmailQuota !== 'undefined' ? hasEmailQuota : undefined;

  const mailCalls = [];
  MailApp = {
    sendEmail: function(params) {
      mailCalls.push(params);
    }
  };

  HtmlService = {
    createTemplateFromFile: function(filename) {
      return {
        evaluate: function() {
          return {
            getContent: function() {
              return "<html>Confirmation Content</html>";
            }
          };
        }
      };
    }
  };

  hasEmailQuota = function() { return true; };

  try {
    // 1. Valid email sending
    const res = sendConfirmationNotification("Jane Doe", "jane@example.com", "email");
    if (!res) throw new Error("Expected sendConfirmationNotification to return true");
    if (mailCalls.length !== 1) throw new Error(`Expected 1 email call, got ${mailCalls.length}`);
    if (mailCalls[0].to !== "jane@example.com") throw new Error(`Expected recipient jane@example.com, got ${mailCalls[0].to}`);
    if (!mailCalls[0].subject.includes("Received Your Prescription Request")) {
      throw new Error(`Unexpected subject: ${mailCalls[0].subject}`);
    }

    // 2. Missing email returns false without error
    const resNoEmail = sendConfirmationNotification("Jane Doe", "", "email");
    if (resNoEmail !== false) throw new Error("Expected false when email is empty");

    console.log("testSendConfirmationNotification completed successfully.");
  } finally {
    if (realMailApp !== undefined) MailApp = realMailApp; else delete MailApp;
    if (realHtmlService !== undefined) HtmlService = realHtmlService; else delete HtmlService;
    if (realQuota !== undefined) hasEmailQuota = realQuota;
  }
}

function testSendSickNoteConfirmation() {
  console.log("Running testSendSickNoteConfirmation...");
  const realMailApp = typeof MailApp !== 'undefined' ? MailApp : undefined;
  const realHtmlService = typeof HtmlService !== 'undefined' ? HtmlService : undefined;
  const realQuota = typeof hasEmailQuota !== 'undefined' ? hasEmailQuota : undefined;

  const mailCalls = [];
  MailApp = {
    sendEmail: function(params) {
      mailCalls.push(params);
    }
  };

  HtmlService = {
    createTemplateFromFile: function(filename) {
      return {
        evaluate: function() {
          return {
            getContent: function() {
              return "<html>Sick Note Confirmation Content</html>";
            }
          };
        }
      };
    }
  };

  hasEmailQuota = function() { return true; };

  try {
    const res = sendSickNoteConfirmation("John Smith", "john@example.com");
    if (!res) throw new Error("Expected sendSickNoteConfirmation to return true");
    if (mailCalls.length !== 1) throw new Error(`Expected 1 email call, got ${mailCalls.length}`);
    if (mailCalls[0].to !== "john@example.com") throw new Error(`Expected recipient john@example.com, got ${mailCalls[0].to}`);
    if (mailCalls[0].subject !== "Received: Your Sick Note Request") {
      throw new Error(`Unexpected subject: ${mailCalls[0].subject}`);
    }

    const resEmpty = sendSickNoteConfirmation("John Smith", null);
    if (resEmpty !== false) throw new Error("Expected false when email is null");

    console.log("testSendSickNoteConfirmation completed successfully.");
  } finally {
    if (realMailApp !== undefined) MailApp = realMailApp; else delete MailApp;
    if (realHtmlService !== undefined) HtmlService = realHtmlService; else delete HtmlService;
    if (realQuota !== undefined) hasEmailQuota = realQuota;
  }
}

function testSendReadyEmail() {
  console.log("Running testSendReadyEmail...");
  const realMailApp = typeof MailApp !== 'undefined' ? MailApp : undefined;
  const realHtmlService = typeof HtmlService !== 'undefined' ? HtmlService : undefined;
  const realQuota = typeof hasEmailQuota !== 'undefined' ? hasEmailQuota : undefined;

  const mailCalls = [];
  MailApp = {
    sendEmail: function(params) {
      mailCalls.push(params);
    }
  };

  HtmlService = {
    createTemplateFromFile: function(filename) {
      return {
        evaluate: function() {
          return {
            getContent: function() {
              return "<p>Prescription is ready</p>";
            }
          };
        }
      };
    }
  };

  hasEmailQuota = function() { return true; };

  try {
    const res = sendReadyEmail(5, "Mary Kelly", "mary@example.com", "Main St Pharmacy");
    if (!res) throw new Error("Expected sendReadyEmail to return true");
    if (mailCalls.length !== 1) throw new Error(`Expected 1 email call, got ${mailCalls.length}`);
    if (mailCalls[0].to !== "mary@example.com") throw new Error(`Expected recipient mary@example.com, got ${mailCalls[0].to}`);
    if (!mailCalls[0].subject.includes("Main St Pharmacy")) {
      throw new Error(`Subject should mention pharmacy, got: ${mailCalls[0].subject}`);
    }

    // Quota depleted path
    hasEmailQuota = function() { return false; };
    const resQuota = sendReadyEmail(5, "Mary Kelly", "mary@example.com", "Main St Pharmacy");
    if (resQuota !== false) throw new Error("Expected false when email quota reserve is depleted");

    console.log("testSendReadyEmail completed successfully.");
  } finally {
    if (realMailApp !== undefined) MailApp = realMailApp; else delete MailApp;
    if (realHtmlService !== undefined) HtmlService = realHtmlService; else delete HtmlService;
    if (realQuota !== undefined) hasEmailQuota = realQuota;
  }
}

function testSendWhatsAppLinkToStaff() {
  console.log("Running testSendWhatsAppLinkToStaff...");
  const realMailApp = typeof MailApp !== 'undefined' ? MailApp : undefined;
  const mailCalls = [];
  MailApp = {
    sendEmail: function(params) {
      mailCalls.push(params);
    }
  };

  try {
    // 1. Valid patient phone
    const res = sendWhatsAppLinkToStaff(2, "staff@example.com", "Alice Brown", "0871234567", "Local Pharmacy");
    if (!res && mailCalls.length === 0) {
      throw new Error("Expected email to be sent to staff with WhatsApp link");
    }
    if (mailCalls[0].to !== "staff@example.com") {
      throw new Error(`Expected recipient staff@example.com, got ${mailCalls[0].to}`);
    }
    if (!mailCalls[0].subject.includes("Alice Brown")) {
      throw new Error(`Expected subject to include patient name, got: ${mailCalls[0].subject}`);
    }

    // 2. Missing phone number notifies staff of missing phone
    mailCalls.length = 0;
    const resMissing = sendWhatsAppLinkToStaff(3, "staff@example.com", "Bob NoPhone", "", "Local Pharmacy");
    if (resMissing !== false) throw new Error("Expected false when phone is missing");
    if (mailCalls.length !== 1 || !mailCalls[0].subject.includes("Missing Phone Number")) {
      throw new Error("Expected missing phone notification to staff");
    }

    console.log("testSendWhatsAppLinkToStaff completed successfully.");
  } finally {
    if (realMailApp !== undefined) MailApp = realMailApp; else delete MailApp;
  }
}

function testIsRowArchivable() {
  console.log("Running testIsRowArchivable...");
  const cutOffDate = new Date(2026, 5, 1); // 1 June 2026

  // Date before cutoff: 1 Jan 2026 -> should be archivable
  const oldRow = isRowArchivable("Sent to Pharmacy", "Ready on 01/01/2026 10:00:00", cutOffDate);
  if (!oldRow) throw new Error("Expected row from 01/01/2026 to be archivable");

  // Date after cutoff: 1 July 2026 -> should NOT be archivable
  const recentRow = isRowArchivable("Sent to Pharmacy", "Ready on 01/07/2026 10:00:00", cutOffDate);
  if (recentRow) throw new Error("Expected row from 01/07/2026 NOT to be archivable");

  // Processed on format (legacy form submissions)
  const oldProcessed = isRowArchivable("Sent to Pharmacy", "Processed on 15/02/2026", cutOffDate);
  if (!oldProcessed) throw new Error("Expected 'Processed on 15/02/2026' to be archivable");

  // Non-matching status -> should NOT be archivable
  const queryRow = isRowArchivable("Query - Please Contact Us", "Ready on 01/01/2026 10:00:00", cutOffDate);
  if (queryRow) throw new Error("Expected query row NOT to be archivable");

  console.log("testIsRowArchivable completed successfully.");
}
