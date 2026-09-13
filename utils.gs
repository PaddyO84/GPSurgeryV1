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
    const errName = (error && error.name) ? error.name : 'Error';
    const errMessage = (error && error.message) ? error.message : (error ? String(error) : 'Unknown error');
    const errStack = (error && error.stack) ? error.stack.replace(/\n/g, '<br>') : 'No stack trace available';
    body += `<br><br><strong>Error Details:</strong><br>Name: ${errName}<br>Message: ${errMessage}<br>Stack Trace:<br>${errStack}`;
    MailApp.sendEmail(ADMIN_EMAIL, subject, "", { htmlBody: body });
  } catch (e) {
    Logger.log(`Could not send error report email. Original error in ${functionName}: ${error && error.message ? error.message : error}. Error sending report: ${e.message}`);
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
  if (!phone || typeof phone !== 'string') {
    errors.push("Invalid phone number.");
  } else {
    // Normalize permitted separators (spaces, hyphens, parentheses, dots)
    const normalized = phone.replace(/[\s\-\(\)\.]/g, '');
    // Irish domestic (e.g. 0871234567, 01234567, 0741234567) or international (+353/00353/353)
    const phoneRegex = /^(\+353|00353|353|0)[1-9]\d{6,9}$/;
    if (!phoneRegex.test(normalized)) {
      errors.push("Invalid phone number.");
    }
  }
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Checks if a given row is eligible for archiving based on status, transition/processed date, and cutoff date.
 * @param {string} status - Current status of the request.
 * @param {string} notificationDateStr - The string in NOTIFICATION_COL (e.g. "Ready on dd/MM/yyyy HH:mm:ss" or "Processed on dd/MM/yyyy").
 * @param {Date} cutOffDate - The threshold date before which rows are archived.
 * @param {string} [readyStatus="Sent to Pharmacy"] - The ready status string.
 * @returns {boolean} True if eligible for archive.
 */
function isRowArchivable(status, notificationDateStr, cutOffDate, readyStatus = "Sent to Pharmacy") {
  if (status !== readyStatus || !notificationDateStr || typeof notificationDateStr !== 'string') {
    return false;
  }
  let datePart = null;
  if (notificationDateStr.startsWith("Ready on ")) {
    datePart = notificationDateStr.replace("Ready on ", "").split(' ')[0];
  }

  if (datePart) {
    const dateParts = datePart.split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      const processedDate = new Date(year, month - 1, day);
      if (
        !isNaN(processedDate.getTime()) &&
        processedDate.getDate() === day &&
        processedDate.getMonth() === month - 1 &&
        processedDate.getFullYear() === year
      ) {
        return processedDate < cutOffDate;
      }
    }
  }
  return false;
}

/**
 * Formats a phone number into international WhatsApp format (353...).
 * @param {string|number} phone - The phone number to format.
 * @returns {string} Formatted WhatsApp phone number.
 */
function formatWhatsAppNumber(phone) {
  if (!phone) return "";
  const cleaned = phone.toString().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+353')) return cleaned.substring(1);
  if (cleaned.startsWith('00353')) return cleaned.substring(2);
  if (cleaned.startsWith('353')) return cleaned;
  if (cleaned.startsWith('0')) return '353' + cleaned.substring(1);
  return '353' + cleaned;
}

/**
 * Sanitizes a cell value to prevent formula injection by prepending a single quote if it starts with '='.
 * @param {*} val - Cell value to sanitize.
 * @returns {*} Sanitized cell value.
 */
function sanitizeCellValue(val) {
  if (typeof val === 'string' && /^[=+\-@\t\r]/.test(val)) {
    return "'" + val;
  }
  return val;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    reportError: reportError,
    getOrCreateSheet: getOrCreateSheet,
    validatePatientData: validatePatientData,
    formatWhatsAppNumber: formatWhatsAppNumber,
    isRowArchivable: isRowArchivable,
    sanitizeCellValue: sanitizeCellValue
  };
}
