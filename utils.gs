/**
 * Emails a detailed error report to the admin.
 * @param {string} functionName - The name of the function where the error occurred.
 * @param {Error} error - The error object.
 * @param {number} [row] - The row number associated with the error, if applicable.
 */
function reportError(functionName, error, row) {
  try {
    const subject = `Prescription Script Error: ${functionName}`;
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
    let body = `An error occurred in the function <strong>${functionName}</strong> at ${timestamp}.`;
    if (row) {
      body += `<br><br>The error was related to row <strong>${row}</strong>.`;
    }
    body += `<br><br><strong>Error Details:</strong><br>Name: ${error.name}<br>Message: ${error.message}<br>Stack Trace:<br>${error.stack.replace(/\n/g, '<br>')}`;
    MailApp.sendEmail(ADMIN_EMAIL, subject, "", { htmlBody: body });
  } catch (e) {
    Logger.log(`Could not send error report email. Original error in ${functionName}: ${error.message}. Error sending report: ${e.message}`);
  }
}

/**
 * Helper to get or create a sheet with standardized headers.
 * @param {string} sheetName - The name of the sheet.
 * @param {string[]} [headers] - Optional headers for creation.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The sheet object.
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Validates basic email and phone formats.
 * @param {string} email - The email to validate.
 * @param {string} phone - The phone number to validate.
 * @returns {{isValid: boolean, errors: string[]}} Validation results.
 */
function validatePatientData(email, phone) {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Invalid email address.");
  }
  if (!phone || phone.length < 7) {
    errors.push("Invalid phone number.");
  }
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
