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
    }
  }
}
