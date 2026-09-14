// --- 1. FINAL CORRECT CONFIGURATION ---

const SHEET_NAME = "Form responses 1";
const EMAIL_COL = 2;       // Patient Email is in Column B
const PHARMACY_COL = 3;    // Chosen Pharmacy is in Column C
const NAME_COL = 4;        // Patient's Full Name is in Column D
const PHONE_COL = 6;       // Contact Number is in Column F
const COMM_PREF_COL = 9;   // Communication Preference is in Column I
const STATUS_COL = 10;     // Status is in Column J
const MEDS_COL = 8;        // Medication List is in Column H
const NOTIFICATION_COL = 11; // Notification Sent is in Column K

// --- SCRIPT SETTINGS ---
const SENDER_NAME = "Example Health Centre";
const YOUR_PHONE_NUMBER = "(01) 234 5679";
const ADMIN_EMAIL = "admin@example.com";
const STATUS_QUERY = "Query - Please Contact Us";
const STATUS_READY = "Sent to Pharmacy";
const FOOTER = `<p style="font-size:0.9em; color:#666;"><i>Please note: This is an automated message and this email address is not monitored. For any queries, please contact the surgery by phone at ${YOUR_PHONE_NUMBER}.</i></p>`;

// --- WEB APP HANDLERS ---

/**
 * Handles HTTP POST requests to the script (Web App).
 * Receives JSON data from the frontend form and appends it to the spreadsheet.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Server is busy, please try again shortly.' })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const data = JSON.parse(e.postData.contents);

    switch (data.formType) {
      case 'sick-note':
        return handleSickNoteSubmission(data);
      case 'appointment':
        return handleAppointmentSubmission(data);
      default:
        return handlePrescriptionSubmission(data);
    }
  } catch (err) {
    reportError('doPost', err, null);
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- CORE, AUTOMATED FUNCTIONS ---

/**
 * Creates a custom menu in the Google Sheet UI when the spreadsheet is opened.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('Surgery Tools');

  menu.addItem('Send Patient Notification', 'sendDynamicNotification');
  menu.addSeparator();

  const statusMenu = ui.createMenu('Set Status');
  statusMenu.addItem("Mark as 'Sent to Pharmacy'", 'setStatusReady');
  statusMenu.addItem("Mark as 'Query'", 'setStatusQuery');

  menu.addSubMenu(statusMenu);

  menu.addSeparator();
  menu.addItem('Setup Automated Triggers', 'setupAutomatedTriggers');

  menu.addToUi();
}

/**
 * Sets the status of the selected row(s) to 'Sent to Pharmacy'.
 */
function setStatusReady() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) {
    SpreadsheetApp.getUi().alert("Please select one or more patient rows first (row 2 or below).");
    return;
  }
  range.getSheet().getRange(range.getRow(), STATUS_COL, range.getNumRows(), 1).setValue(STATUS_READY);
}

/**
 * Sets the status of the selected row(s) to 'Query - Please Contact Us'.
 */
function setStatusQuery() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  if (range.getRow() < 2) {
    SpreadsheetApp.getUi().alert("Please select one or more patient rows first (row 2 or below).");
    return;
  }
  range.getSheet().getRange(range.getRow(), STATUS_COL, range.getNumRows(), 1).setValue(STATUS_QUERY);
}

/**
 * Handles automated status-change notifications on edit.
 * Triggered by an installable onEdit trigger (handleEdit).
 */
function handleEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();

    // Allow triggering on both Prescription and Appointment sheets
    const allowedSheets = [SHEET_NAME, "Appointments"];
    const sheetName = sheet.getName();
    if (!allowedSheets.includes(sheetName) || row < 2) {
      return;
    }

    const isAppointment = sheetName === "Appointments";
    const statusCol = isAppointment ? (APPT_LAYOUT.STATUS + 1) : STATUS_COL;
    const emailCol = isAppointment ? (APPT_LAYOUT.EMAIL + 1) : EMAIL_COL;
    const nameCol = isAppointment ? (APPT_LAYOUT.NAME + 1) : NAME_COL;
    const notificationCol = isAppointment ? (APPT_LAYOUT.NOTIFICATION_SENT + 1) : NOTIFICATION_COL;

    if (range.getColumn() !== statusCol) {
      return;
    }

    const status = range.getValue().toString().trim();
    const patientEmail = sheet.getRange(row, emailCol).getValue();
    const patientName = sheet.getRange(row, nameCol).getValue();

    if (status === STATUS_QUERY) {
      if (!patientEmail) return;
      const subject = isAppointment
        ? "Action Required: Query Regarding Your Appointment Request"
        : "Action Required: Query Regarding Your Prescription Request";
      const requestDesc = isAppointment ? "appointment request" : "prescription request";
      const body = `<p>Dear ${escapeHtml(patientName)},</p><p>Regarding your ${requestDesc}, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone at <strong>${YOUR_PHONE_NUMBER}</strong>.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
      MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });

    } else if (status === STATUS_READY && !isAppointment) {
      const commPref = sheet.getRange(row, COMM_PREF_COL).getValue().toLowerCase();
      let deliverySuccess = false;

      if (commPref === 'whatsapp') {
        const userEmail = e.user ? e.user.getEmail() : '';
        const staffEmail = userEmail && userEmail.trim() ? userEmail.trim() : ADMIN_EMAIL;
        deliverySuccess = sendWhatsAppLinkToStaff(row, staffEmail);
      } else {
        deliverySuccess = sendReadyEmail(row);
      }

      if (deliverySuccess) {
        // Record ready timestamp in notification column only after successful notification delivery
        const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
        sheet.getRange(row, notificationCol).setValue(`Ready on ${timestamp}`);
      }
    }
  } catch (err) {
    reportError('handleEdit', err, e.range ? e.range.getRow() : null);
  }
}

/**
 * Triggered on form submission. This function reformats the medication list
 * from a single-line string with delimiters into a clean, multi-line list in the sheet.
 *
 * This function is run automatically by an On form submit trigger.
 * Run 'Surgery Tools > Setup Automated Triggers' from the Google Sheets menu to initialize.
 */
function onFormSubmit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();

    // --- Send Confirmation First ---
    // It's important to confirm receipt to the patient immediately, even if validation fails later.
    const patientName = e.values[NAME_COL - 1];
    const patientEmail = e.values[EMAIL_COL - 1];
    const commPref = e.values[COMM_PREF_COL - 1];

    // We can proceed with confirmation even if email is missing; the function handles it.
    sendConfirmationNotification(patientName, patientEmail, commPref);

    // --- Back-end Validation ---
    // Now, validate the data. If it fails, report to admin but don't stop processing.
    // The patient has already been notified that we received the request.
    if (!patientName || !patientEmail) {
      let errorMessage = `A new prescription request was submitted in row ${row} but was missing essential information. The patient has been sent a confirmation, but please review the submission manually.`;
      if (!patientName) errorMessage += "\n- Patient Name is missing.";
      if (!patientEmail) errorMessage += "\n- Patient Email is missing.";

      // Use the robust reportError function instead of a simple MailApp.sendEmail
      reportError('onFormSubmit Validation', new Error(errorMessage), row);

      // We can exit here as further processing (like medication formatting) is not possible.
      return;
    }

    // --- Process Valid Data ---
    const medicationsRaw = e.values[MEDS_COL - 1];
    if (typeof medicationsRaw === 'string' && medicationsRaw.includes("~")) {
      let medListSheet = [];
      const meds = medicationsRaw.split("|");
      meds.forEach(med => {
        const details = med.split("~");
        medListSheet.push(`${details[0] || ''} - ${details[1] || ''} (${details[2] || ''})`);
      });
      sheet.getRange(row, MEDS_COL).setValue(medListSheet.join("\n"));
    }

    // Use Utilities.formatDate for a robust, non-locale-dependent date string.
    const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy");
    sheet.getRange(row, NOTIFICATION_COL).setValue(`Processed on ${timestamp}`);
  } catch (err) {
    reportError('onFormSubmit', err, e.range ? e.range.getRow() : null);
  }
}

function sendAppointmentConfirmation(name, email, type, time) {
  if (!email) return false;
  try {
    const template = HtmlService.createTemplateFromFile('email_confirmation');
    template.senderName = SENDER_NAME;
    template.patientName = name;
    template.requestType = 'appointment';
    template.appointmentType = type;
    template.preferredTime = time;
    template.phoneNumber = YOUR_PHONE_NUMBER;
    
    const subject = "Received: Your Appointment Request";
    const htmlBody = template.evaluate().getContent();
    
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: SENDER_NAME });
    return true;
  } catch (e) {
    reportError('sendAppointmentConfirmation', e, null);
    return false;
  }
}

// --- SICK NOTE HANDLERS ---

function sendSickNoteConfirmation(name, email) {
  if (!email) return false;
  try {
    const template = HtmlService.createTemplateFromFile('email_confirmation');
    template.senderName = SENDER_NAME;
    template.patientName = name;
    template.requestType = 'sick note';
    template.phoneNumber = YOUR_PHONE_NUMBER;
    
    const subject = "Received: Your Sick Note Request";
    const htmlBody = template.evaluate().getContent();
    
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody, name: SENDER_NAME });
    return true;
  } catch (e) {
    reportError('sendSickNoteConfirmation', e, null);
    return false;
  }
}

// --- MANUAL NOTIFICATION FUNCTIONS (from 'Surgery Tools' menu) ---

/**
 * Checks the selected row's preference and calls the appropriate notification function.
 */
function sendDynamicNotification() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const range = sheet.getActiveRange();
  const row = range.getRow();

  if (row < 2) {
    ui.alert("Please select a patient row first (row 2 or below).");
    return;
  }

  const status = sheet.getRange(row, STATUS_COL).getValue().toString().trim();
  if (!status) {
      ui.alert('Please set a status for this request before sending a notification.');
      return;
  }

  const commPref = sheet.getRange(row, COMM_PREF_COL).getValue().toLowerCase();

  if (commPref === 'whatsapp') {
    generateWhatsAppLink(row);
  } else {
    showEmailDialog(row);
  }
}

/**
 * Displays a dialog with the email preview and a "Send" button.
 */
function showEmailDialog(row) {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rowValues = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const patientName = rowValues[NAME_COL - 1];
  const patientEmail = rowValues[EMAIL_COL - 1];
  const pharmacy = rowValues[PHARMACY_COL - 1];
  const status = (rowValues[STATUS_COL - 1] || '').toString().trim();

  if (!patientEmail) {
    ui.alert(`No email address found in row ${row} for ${patientName}.`);
    return;
  }

  const safeName = escapeHtml(patientName);
  const safeEmail = escapeHtml(patientEmail);
  const safePharmacy = escapeHtml(pharmacy);
  const safePhone = escapeHtml(YOUR_PHONE_NUMBER);
  const safeSender = escapeHtml(SENDER_NAME);

  let subject = '';
  let body = '';

  if (status === STATUS_READY) {
    subject = `Your Prescription has been sent to ${safePharmacy}`;
    body = `Dear ${safeName},<br><br>This is a message to let you know that your recent prescription request has been processed and sent to your chosen pharmacy: <strong>${safePharmacy}</strong>.<br><br>Please contact your pharmacy directly to confirm when your medication will be ready for collection.<br><br>Thank you,<br><strong>${safeSender}</strong>`;
  } else if (status === STATUS_QUERY) {
    subject = "Action Required: Query Regarding Your Prescription Request";
    body = `Dear ${safeName},<br><br>Regarding your prescription request, we have a query that needs to be resolved.<br><br>Please contact the surgery by phone at <strong>${safePhone}</strong>.<br><br>Thank you,<br><strong>${safeSender}</strong>`;
  } else {
    ui.alert(`No notification template for status: "${status}".`);
    return;
  }

  const html = `
    <div style="font-family: sans-serif;">
      <h3>Preview Email to ${safeName}</h3>
      <p><b>To:</b> ${safeEmail}</p>
      <p><b>Subject:</b> ${subject}</p>
      <hr>
      <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; background-color:#f9f9f9;">${body}</div>
      <br><br>
      <button onclick="google.script.run.withSuccessHandler(google.script.host.close).sendEmailFromDialog(${row});" style="background-color:#28a745;color:white;padding:8px 15px;border:none;border-radius:4px;font-size:14px;cursor:pointer;">Send Email</button>
      <button onclick="google.script.host.close()" style="padding:8px 15px;border:1px solid #ccc;border-radius:4px;font-size:14px;cursor:pointer;">Cancel</button>
    </div>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(500).setHeight(400);
  ui.showModalDialog(htmlOutput, `Confirm Email to ${safeName}`);
}

/**
 * Sends the email when the "Send Email" button in the dialog is clicked.
 */
function sendEmailFromDialog(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const ui = SpreadsheetApp.getUi();
  try {
    const rowValues = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const status = (rowValues[STATUS_COL - 1] || '').toString().trim();
    const patientName = rowValues[NAME_COL - 1];
    const patientEmail = rowValues[EMAIL_COL - 1];

    if (status === STATUS_READY) {
      const success = sendReadyEmail(row);
      if (success) {
        const timestamp = Utilities.formatDate(new Date(), "Europe/Dublin", "dd/MM/yyyy HH:mm:ss");
        sheet.getRange(row, NOTIFICATION_COL).setValue(`Ready on ${timestamp}`);
      } else {
        ui.alert("Failed to send ready notification email. Please check the logs.");
      }
    } else if (status === STATUS_QUERY) {
      if (!patientEmail) {
        ui.alert(`No email address found for ${patientName}.`);
        return;
      }
      const subject = "Action Required: Query Regarding Your Prescription Request";
      const body = `<p>Dear ${escapeHtml(patientName)},</p><p>Regarding your prescription request, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone at <strong>${YOUR_PHONE_NUMBER}</strong>.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
      MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });
    }
  } catch (e) {
    reportError('sendEmailFromDialog', e, row);
    ui.alert("Failed to send email. Please check the logs for details.");
  }
}

/**
 * Generates and displays a WhatsApp "click to send" link for the currently selected row.
 */
function generateWhatsAppLink(row) {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rowValues = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const patientName = rowValues[NAME_COL - 1];
  const patientPhone = rowValues[PHONE_COL - 1];
  const pharmacy = rowValues[PHARMACY_COL - 1];
  const status = (rowValues[STATUS_COL - 1] || '').toString().trim();

  if (!patientPhone) {
    ui.alert(`No phone number found in row ${row} for ${patientName}.`);
    return;
  }

  let messageText = '';
  if (status === STATUS_READY) {
    messageText = `Hi ${patientName}, this is a message from ${SENDER_NAME}. Your prescription has been sent to ${pharmacy}. Please contact them directly to arrange collection.`;
  } else if (status === STATUS_QUERY) {
    messageText = `Hi ${patientName}, this is a message from ${SENDER_NAME}. We have a query about your recent prescription request. Please contact the surgery by phone at ${YOUR_PHONE_NUMBER}.`;
  } else {
    ui.alert(`No notification template for status: "${status}".`);
    return;
  }

  const whatsappNumber = formatWhatsAppNumber(patientPhone);
  const prefilledMessage = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;
  const safeWhatsappUrl = escapeHtml(whatsappUrl);
  const safeName = escapeHtml(patientName);

  const htmlOutput = HtmlService.createHtmlOutput(
      `<h3>Send Notification to ${safeName}</h3><p>Click the link below to open WhatsApp on your device.</p><p><a href="${safeWhatsappUrl}" target="_blank" style="font-size:1.2em;">Open WhatsApp</a></p>`
    ).setWidth(350).setHeight(150);
  ui.showModalDialog(htmlOutput, 'WhatsApp Notification Link');
}

// --- HELPER FUNCTIONS (called by automated triggers) ---

/**
 * Sends an initial confirmation email to the patient when their form is submitted.
 */
function sendConfirmationNotification(patientName, patientEmail, commPref) {
  if (!patientEmail) return false;
  try {
    const template = HtmlService.createTemplateFromFile('email_confirmation');
    template.senderName = SENDER_NAME;
    template.patientName = patientName;
    template.requestType = 'prescription';
    template.preferredMethod = (commPref && commPref.toLowerCase() === 'whatsapp') ? 'WhatsApp' : 'Email';
    template.phoneNumber = YOUR_PHONE_NUMBER;

    const subject = "Confirmation: We've Received Your Prescription Request";
    const htmlBody = template.evaluate().getContent();

    MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: htmlBody, name: SENDER_NAME });
    return true;
  } catch (e) {
    reportError('sendConfirmationNotification', e, null);
    return false;
  }
}

/**
 * Sends the "prescription ready" email directly to the patient.
 */
function sendReadyEmail(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

  if (!patientEmail) return false;

  try {
    const template = HtmlService.createTemplateFromFile('email_ready');
    template.senderName = SENDER_NAME;
    template.patientName = patientName;
    template.pharmacyName = pharmacy;
    template.phoneNumber = YOUR_PHONE_NUMBER;

    const subject = `Your Prescription has been sent to ${pharmacy}`;
    const htmlBody = template.evaluate().getContent();

    MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: htmlBody, name: SENDER_NAME });
    return true;
  } catch (e) {
    reportError('sendReadyEmail', e, row);
    return false;
  }
}

/**
 * Generates a WhatsApp "click to send" link and emails it to the staff member who triggered the onEdit event.
 */
function sendWhatsAppLinkToStaff(row, staffEmail) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientPhone = sheet.getRange(row, PHONE_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

  if (!patientPhone) {
    const message = `Could not generate WhatsApp link for ${patientName} (row ${row}) because their phone number is missing. Please update the sheet and send the notification manually via the 'Surgery Tools' menu.`;
    try {
      MailApp.sendEmail({ to: staffEmail, subject: "Action Required: Missing Phone Number", body: message });
    } catch (e) {
      Logger.log(`Error sending 'missing phone number' email to staff for row ${row}: ${e.toString()}`);
    }
    return false;
  }

  try {
    const whatsappNumber = formatWhatsAppNumber(patientPhone);
    const prefilledMessage = encodeURIComponent(`Hi ${patientName}, this is a message from ${SENDER_NAME}. Your prescription has been sent to ${pharmacy}. Please contact them directly to arrange collection.`);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;
    const safeWhatsappUrl = escapeHtml(whatsappUrl);
    const safeName = escapeHtml(patientName);

    const subject = `Action Required: Send WhatsApp to ${patientName}`;
    const body = `
      <p>Hi,</p>
      <p>Please send the prescription notification to <strong>${safeName}</strong> by clicking the link below. This will open WhatsApp on your device with a pre-filled message.</p>
      <p><a href="${safeWhatsappUrl}" target="_blank" style="font-size:1.2em; font-weight:bold; color: #25D366;">Click Here to Send WhatsApp Message</a></p>
      <p>If the link does not work, please contact them manually.</p>
      <p>Thank you.</p>
    `;

    MailApp.sendEmail({ to: staffEmail, subject: subject, htmlBody: body });
    return true;
  } catch (e) {
    Logger.log(`Error sending WhatsApp link to staff for row ${row}: ${e.toString()}`);
    reportError('sendWhatsAppLinkToStaff', e, row);
    return false;
  }
}


/**
 * Helper to get or create the 'Archive' sheet and copy headers from source sheet if needed.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - The active spreadsheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [sourceSheet] - The source sheet to copy headers from.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The archive sheet.
 */
function ensureArchiveSheet(ss, sourceSheet) {
  let archiveSheet = ss.getSheetByName("Archive");
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet("Archive");
    if (sourceSheet && sourceSheet.getLastColumn() > 0) {
      sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).copyTo(archiveSheet.getRange(1, 1));
    }
    Logger.log("Created 'Archive' sheet.");
  } else {
    Logger.log("'Archive' sheet already exists.");
  }
  return archiveSheet;
}

/**
 * Sets up the automated triggers and required sheets.
 * Creates the 'Archive' sheet if it doesn't exist, configures a weekly trigger
 * for archiving, and an onFormSubmit trigger for new requests.
 */
function setupAutomatedTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SHEET_NAME);
  
  // 1. Create Archive Sheet
  const archiveSheet = ensureArchiveSheet(ss, sourceSheet);

  const existingTriggers = ScriptApp.getProjectTriggers();
  let messages = [];

  // 2. Setup Time-Driven Trigger for archiveOldRequests
  const archiveFuncName = 'archiveOldRequests';
  const archiveTriggerExists = existingTriggers.some(trigger => trigger.getHandlerFunction() === archiveFuncName);
  
  if (!archiveTriggerExists) {
    ScriptApp.newTrigger(archiveFuncName)
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(1)
      .create();
    messages.push("✅ Archive system trigger created (Mondays at 1 AM).");
  } else {
    messages.push("ℹ️ Archive system trigger already exists.");
  }

  // 3. Setup On Form Submit Trigger for onFormSubmit
  const formSubmitFuncName = 'onFormSubmit';
  const formSubmitTriggerExists = existingTriggers.some(trigger => trigger.getHandlerFunction() === formSubmitFuncName);

  if (!formSubmitTriggerExists) {
    ScriptApp.newTrigger(formSubmitFuncName)
      .forSpreadsheet(ss)
      .onFormSubmit()
      .create();
    messages.push("✅ Form submission trigger created.");
  } else {
    messages.push("ℹ️ Form submission trigger already exists.");
  }

  // 4. Setup On Edit Trigger for handleEdit
  const onEditFuncName = 'handleEdit';
  const onEditTriggerExists = existingTriggers.some(trigger => trigger.getHandlerFunction() === onEditFuncName);

  if (!onEditTriggerExists) {
    ScriptApp.newTrigger(onEditFuncName)
      .forSpreadsheet(ss)
      .onEdit()
      .create();
    messages.push("✅ Spreadsheet handleEdit trigger created.");
  } else {
    messages.push("ℹ️ Spreadsheet handleEdit trigger already exists.");
  }

  // Display summary
  try {
    SpreadsheetApp.getUi().alert("System Setup Complete", messages.join("\n"), SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(messages.join("\n"));
  }
}

/**
 * Moves rows with a 'Sent to Pharmacy' status older than 180 days to an 'Archive' sheet.
 * This function is run automatically by a time-based trigger.
 * Run 'Surgery Tools > Setup Automated Triggers' from the Google Sheets menu to initialize.
 */
function archiveOldRequests() {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000);
  if (!hasLock) {
    Logger.log("Could not acquire lock for archiveOldRequests. Skipping run.");
    return;
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAME);
    if (!sourceSheet) return;

    const archiveSheet = ensureArchiveSheet(ss, sourceSheet);

    const lastRow = sourceSheet.getLastRow();
    if (lastRow <= 1) return;

    const dataRange = sourceSheet.getRange(2, 1, lastRow - 1, sourceSheet.getLastColumn());
    const data = dataRange.getValues();
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - 180);

    const rowsToArchive = [];
    const rowsToKeep = [];

    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];
      const status = rowData[STATUS_COL - 1];
      const processedDateStr = rowData[NOTIFICATION_COL - 1];

      if (isRowArchivable(status, processedDateStr, cutOffDate, STATUS_READY)) {
        rowsToArchive.push({ rowData, sheetRowIndex: i + 2 });
      }
    }

    if (rowsToArchive.length > 0) {
      // 1. Append all archived rows to archiveSheet first
      const archiveLastRow = archiveSheet.getLastRow();
      const archiveValues = rowsToArchive.map(r => r.rowData);
      archiveSheet.getRange(archiveLastRow + 1, 1, archiveValues.length, archiveValues[0].length).setValues(archiveValues);
      SpreadsheetApp.flush();

      // 2. Identify contiguous batches of row indices in bottom-up order to safely delete only confirmed archived rows
      const rowIndices = rowsToArchive.map(r => r.sheetRowIndex).sort((a, b) => b - a);
      const batches = [];
      let currentBatch = null;

      for (let idx of rowIndices) {
        if (!currentBatch) {
          currentBatch = { startRow: idx, numRows: 1 };
        } else if (idx === currentBatch.startRow - 1) {
          currentBatch.startRow = idx;
          currentBatch.numRows += 1;
        } else {
          batches.push(currentBatch);
          currentBatch = { startRow: idx, numRows: 1 };
        }
      }
      if (currentBatch) batches.push(currentBatch);

      // Execute deletions bottom-up
      for (let batch of batches) {
        sourceSheet.deleteRows(batch.startRow, batch.numRows);
      }
      SpreadsheetApp.flush();
      Logger.log(`Batch archived and deleted ${rowsToArchive.length} rows.`);
    }
  } catch (err) {
    reportError('archiveOldRequests', err, null);
  } finally {
    lock.releaseLock();
  }
}
