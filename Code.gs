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
const YOUR_PHONE_NUMBER = "01-234-5678";
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
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);

    // Route to Sick Note Handler if applicable
    if (data.formType === 'sick-note') {
      return handleSickNoteSubmission(data);
    }

    // Route to Appointment Handler if applicable
    if (data.formType === 'appointment') {
      return handleAppointmentSubmission(data);
    }

    // Default: Prescription Handling
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // Validate essential data
    if (!data.patientDetails.name || !data.patientDetails.email) {
       return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Missing Name or Email' })).setMimeType(ContentService.MimeType.JSON);
    }

    const timestamp = new Date();

    // Format Medication List
    let medicationString = "";
    if (data.medicationList && Array.isArray(data.medicationList)) {
       medicationString = data.medicationList.map(m => `${m.name} - ${m.dosage} (${m.freq})`).join("\n");
    }

    // Append to Sheet (Order must match Columns defined at top, roughly)
    // Sheet Structure assumed: Timestamp, Email, Pharmacy, Name, Address, Phone, DOB, Meds, CommPref, Status, Notification
    // Note: The original Google Form might have had a specific column order. We will map to the known columns constants.
    // However, appendRow adds to the end. We need to respect the visual layout.
    // Based on constants:
    // A(1): Timestamp (Standard form)
    // B(2): Email (EMAIL_COL)
    // C(3): Pharmacy (PHARMACY_COL)
    // D(4): Name (NAME_COL)
    // E(5): Address (Assumed based on HTML form, but not in constants)
    // F(6): Phone (PHONE_COL)
    // G(7): DOB (Assumed)
    // H(8): Meds (MEDS_COL)
    // I(9): CommPref (COMM_PREF_COL)
    // J(10): Status (STATUS_COL)
    // K(11): Notification (NOTIFICATION_COL)

    const newRow = [];
    newRow[0] = timestamp; // Col A
    newRow[EMAIL_COL - 1] = data.patientDetails.email;
    newRow[PHARMACY_COL - 1] = data.patientDetails.pharmacy;
    newRow[NAME_COL - 1] = data.patientDetails.name;
    newRow[4] = data.patientDetails.address; // Col E (Index 4)
    newRow[PHONE_COL - 1] = "'" + data.patientDetails.phone; // Force string for phone
    newRow[6] = data.patientDetails.dob; // Col G (Index 6)
    newRow[MEDS_COL - 1] = medicationString;
    newRow[COMM_PREF_COL - 1] = data.patientDetails.commPref;
    newRow[STATUS_COL - 1] = ""; // Initial Status Empty
    newRow[NOTIFICATION_COL - 1] = "Processed on " + Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy");

    sheet.appendRow(newRow);
    const row = sheet.getLastRow();

    // Send Confirmation
    sendConfirmationNotification(data.patientDetails.name, data.patientDetails.email, data.patientDetails.commPref);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': row })).setMimeType(ContentService.MimeType.JSON);

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
 * Runs when a cell is edited. Handles automated status-change notifications.
 */
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();

    if (sheet.getName() !== SHEET_NAME || range.getColumn() !== STATUS_COL || row < 2) {
      return;
    }

    const status = range.getValue().toString().trim();
    const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
    const patientName = sheet.getRange(row, NAME_COL).getValue();

    if (status === STATUS_QUERY) {
      if (!patientEmail) return;
      const subject = "Action Required: Query Regarding Your Prescription Request";
      const body = `<p>Dear ${patientName},</p><p>Regarding your prescription request, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone at <strong>${YOUR_PHONE_NUMBER}</strong>.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
      MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });

    } else if (status === STATUS_READY) {
      const commPref = sheet.getRange(row, COMM_PREF_COL).getValue().toLowerCase();

      if (commPref === 'whatsapp') {
        const staffEmail = e.user.getEmail();
        sendWhatsAppLinkToStaff(row, staffEmail);
      } else {
        sendReadyEmail(row);
      }
    }
  } catch (err) {
    reportError('onEdit', err, e.range ? e.range.getRow() : null);
  }
}

/**
 * Triggered on form submission. This function reformats the medication list
 * from a single-line string with delimiters into a clean, multi-line list in the sheet.
 *
 * TO SET UP: In the Apps Script editor, go to Triggers > Add Trigger.
 * Choose 'onFormSubmit' as the function to run, 'From spreadsheet' as the event source,
 * and 'On form submit' as the event type.
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
    sheet.getRange(row, NOTIFICATION_COL).setValue("Processed on " + timestamp);
  } catch (err) {
    reportError('onFormSubmit', err, e.range ? e.range.getRow() : null);
  }
}

// --- APPOINTMENT HANDLERS ---

function handleAppointmentSubmission(data) {
  const APPT_SHEET_NAME = "Appointments";
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPT_SHEET_NAME);

  // Create sheet if not exists
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(APPT_SHEET_NAME);
    // Add Headers
    sheet.appendRow(["Timestamp", "Status", "Name", "DOB", "Phone", "Email", "Type", "Preferred Time", "Notes", "Notification Sent"]);
    sheet.setFrozenRows(1);
  }

  const timestamp = new Date();
  const rowData = [
    timestamp,
    "New Request",            // Status
    data.name,
    data.dob,
    "'" + data.phone,         // Force string
    data.email,
    data.type,
    data.preferredTime,
    data.notes,
    "Processed on " + Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")
  ];

  sheet.appendRow(rowData);

  sendAppointmentConfirmation(data.name, data.email, data.type, data.preferredTime);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'appointment' })).setMimeType(ContentService.MimeType.JSON);
}

function sendAppointmentConfirmation(name, email, type, time) {
  if (!email) return;
  const subject = "Received: Your Appointment Request";
  const body = `
    <p>Dear ${name},</p>
    <p>We have received your request for an appointment.</p>
    <p><strong>Request Details:</strong></p>
    <ul>
      <li><strong>Type:</strong> ${type}</li>
      <li><strong>Preferred Time:</strong> ${time}</li>
    </ul>
    <p><strong>Next Steps:</strong></p>
    <p>Our reception team will review your request and contact you shortly (via phone or email) to confirm a specific date and time slot.</p>
    <p>Thank you,</p>
    <p><strong>${SENDER_NAME}</strong></p>
    <hr>
    ${FOOTER}
  `;

  try {
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: body, name: SENDER_NAME });
  } catch (e) {
    Logger.log("Failed to send appointment confirmation: " + e.toString());
  }
}

// --- SICK NOTE HANDLERS ---

function handleSickNoteSubmission(data) {
  const SICK_SHEET_NAME = "Sick Notes";
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SICK_SHEET_NAME);

  // Create sheet if not exists
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SICK_SHEET_NAME);
    // Add Headers
    sheet.appendRow(["Timestamp", "Status", "Name", "DOB", "Phone", "Email", "Address", "Cert Type", "PPS", "Condition", "Dates", "Return to Work", "Signature", "Notification Sent"]);
    sheet.setFrozenRows(1);
  }

  const timestamp = new Date();
  const rowData = [
    timestamp,
    "New Request",            // Status
    data.name,
    data.dob,
    "'" + data.phone,         // Force string
    data.email,
    data.address,
    data.type,
    data.pps,
    data.condition,
    data.dates,
    data.returnToWork,
    data.signature || "Not Provided", // Base64 Signature
    "Processed on " + Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")
  ];

  sheet.appendRow(rowData);

  sendSickNoteConfirmation(data.name, data.email);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'sick-note' })).setMimeType(ContentService.MimeType.JSON);
}

function sendSickNoteConfirmation(name, email) {
  if (!email) return;
  const subject = "Received: Your Sick Note Request";
  const body = `
    <p>Dear ${name},</p>
    <p>We have received your request for a sick note/medical certificate.</p>
    <p><strong>Next Steps:</strong></p>
    <ul>
      <li>Please allow 48 hours for processing.</li>
      <li>If we need you to attend the surgery (e.g. for a new illness), we will contact you.</li>
      <li>If payment (€20) is required, it can be paid upon collection.</li>
    </ul>
    <p>Thank you,</p>
    <p><strong>${SENDER_NAME}</strong></p>
    <hr>
    ${FOOTER}
  `;

  try {
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: body, name: SENDER_NAME });
  } catch (e) {
    Logger.log("Failed to send sick note confirmation: " + e.toString());
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

  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();
  const status = sheet.getRange(row, STATUS_COL).getValue().toString().trim();

  if (!patientEmail) {
    ui.alert(`No email address found in row ${row} for ${patientName}.`);
    return;
  }

  let subject = '';
  let body = '';

  if (status === STATUS_READY) {
    subject = `Your Prescription has been sent to ${pharmacy}`;
    body = `Dear ${patientName},<br><br>This is a message to let you know that your recent prescription request has been processed and sent to your chosen pharmacy: <strong>${pharmacy}</strong>.<br><br>Please contact your pharmacy directly to confirm when your medication will be ready for collection.<br><br>Thank you,<br><strong>${SENDER_NAME}</strong>`;
  } else if (status === STATUS_QUERY) {
    subject = "Action Required: Query Regarding Your Prescription Request";
    body = `Dear ${patientName},<br><br>Regarding your prescription request, we have a query that needs to be resolved.<br><br>Please contact the surgery by phone at <strong>${YOUR_PHONE_NUMBER}</strong>.<br><br>Thank you,<br><strong>${SENDER_NAME}</strong>`;
  } else {
    // This case is already handled in sendDynamicNotification, but as a fallback:
    ui.alert(`No notification template for status: "${status}".`);
    return;
  }

  const html = `
    <div style="font-family: sans-serif;">
      <h3>Preview Email to ${patientName}</h3>
      <p><b>To:</b> ${patientEmail}</p>
      <p><b>Subject:</b> ${subject}</p>
      <hr>
      <div style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; background-color:#f9f9f9;">${body}</div>
      <br><br>
      <button onclick="google.script.run.withSuccessHandler(google.script.host.close).sendEmailFromDialog(${row});" style="background-color:#28a745;color:white;padding:8px 15px;border:none;border-radius:4px;font-size:14px;cursor:pointer;">Send Email</button>
      <button onclick="google.script.host.close()" style="padding:8px 15px;border:1px solid #ccc;border-radius:4px;font-size:14px;cursor:pointer;">Cancel</button>
    </div>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(500).setHeight(400);
  ui.showModalDialog(htmlOutput, `Confirm Email to ${patientName}`);
}

/**
 * Sends the email when the "Send Email" button in the dialog is clicked.
 */
function sendEmailFromDialog(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  try {
    const status = sheet.getRange(row, STATUS_COL).getValue().toString().trim();
    const patientName = sheet.getRange(row, NAME_COL).getValue();
    const patientEmail = sheet.getRange(row, EMAIL_COL).getValue();
    const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();

    let subject = '';
    let body = '';

    if (status === STATUS_READY) {
      subject = `Your Prescription has been sent to ${pharmacy}`;
      body = `<p>Dear ${patientName},</p><p>This is a message to let you know that your recent prescription request has been processed and sent to your chosen pharmacy: <strong>${pharmacy}</strong>.</p><p>Please contact your pharmacy directly to confirm when your medication will be ready for collection.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
    } else if (status === STATUS_QUERY) {
      subject = "Action Required: Query Regarding Your Prescription Request";
      body = `<p>Dear ${patientName},</p><p>Regarding your prescription request, we have a query that needs to be resolved.</p><p>Please contact the surgery by phone at <strong>${YOUR_PHONE_NUMBER}</strong>.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;
    } else {
      Logger.log(`Email not sent from dialog for row ${row} because status was not recognized: ${status}`);
      return; // Or alert the user
    }

    MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });
  } catch (e) {
    Logger.log(`Error sending email from dialog for row ${row}: ${e.toString()}`);
    SpreadsheetApp.getUi().alert("Failed to send email. Please check the logs for details.");
  }
}

/**
 * Generates and displays a WhatsApp "click to send" link for the currently selected row.
 */
function generateWhatsAppLink(row) {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

  const patientName = sheet.getRange(row, NAME_COL).getValue();
  const patientPhone = sheet.getRange(row, PHONE_COL).getValue();
  const pharmacy = sheet.getRange(row, PHARMACY_COL).getValue();
  const status = sheet.getRange(row, STATUS_COL).getValue().toString().trim();

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
    // This case is already handled in sendDynamicNotification, but as a fallback:
    ui.alert(`No notification template for status: "${status}".`);
    return;
  }

  const whatsappNumber = "353" + patientPhone.toString().replace(/\s/g, '').substring(1);
  const prefilledMessage = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

  const htmlOutput = HtmlService.createHtmlOutput(
      `<h3>Send Notification to ${patientName}</h3><p>Click the link below to open WhatsApp on your device.</p><p><a href="${whatsappUrl}" target="_blank" style="font-size:1.2em;">Open WhatsApp</a></p>`
    ).setWidth(350).setHeight(150);
  ui.showModalDialog(htmlOutput, 'WhatsApp Notification Link');
}

// --- HELPER FUNCTIONS (called by automated triggers) ---

/**
 * Sends an initial confirmation email to the patient when their form is submitted.
 */
function sendConfirmationNotification(patientName, patientEmail, commPref) {
  if (!patientEmail) {
    Logger.log(`Request received for ${patientName}, but no email address was provided. Cannot send confirmation.`);
    return;
  }

  const subject = "Confirmation: We've Received Your Prescription Request";
  const preferredMethod = (commPref && commPref.toLowerCase() === 'whatsapp') ? 'WhatsApp' : 'Email';

  const body = `
    <p>Dear ${patientName},</p>
    <p>Thank you for your repeat prescription request. This email is to confirm that we have successfully received it and it is now in our queue for processing by our staff.</p>
    <p>You do not need to take any further action at this time.</p>
    <p>You will receive a final notification by <strong>${preferredMethod}</strong> once your prescription has been reviewed and sent to your chosen pharmacy.</p>
    <p>Thank you,</p>
    <p><strong>${SENDER_NAME}</strong></p>
    <hr>
    ${FOOTER}
  `;

  try {
    MailApp.sendEmail({
      to: patientEmail,
      subject: subject,
      htmlBody: body,
      name: SENDER_NAME
    });
  } catch (e) {
    Logger.log(`Failed to send confirmation email to ${patientEmail} for ${patientName}. Error: ${e.toString()}`);
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

  if (!patientEmail) {
    Logger.log(`Email not sent for row ${row}: No email address found for ${patientName}.`);
    return;
  }

  const subject = `Your Prescription has been sent to ${pharmacy}`;
  const body = `<p>Dear ${patientName},</p><p>This is a message to let you know that your recent prescription request has been processed and sent to your chosen pharmacy: <strong>${pharmacy}</strong>.</p><p>Please contact your pharmacy directly to confirm when your medication will be ready for collection.</p><p>Thank you,</p><p><strong>${SENDER_NAME}</strong></p><hr>${FOOTER}`;

  try {
    MailApp.sendEmail({ to: patientEmail, subject: subject, htmlBody: body, name: SENDER_NAME });
  } catch (e) {
    Logger.log(`Error sending READY email for row ${row}: ${e.toString()}`);
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
    return;
  }

  try {
    const whatsappNumber = "353" + patientPhone.toString().replace(/\s/g, '').substring(1);
    const prefilledMessage = encodeURIComponent(`Hi ${patientName}, this is a message from ${SENDER_NAME}. Your prescription has been sent to ${pharmacy}. Please contact them directly to arrange collection.`);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

    const subject = `Action Required: Send WhatsApp to ${patientName}`;
    const body = `
      <p>Hi,</p>
      <p>Please send the prescription notification to <strong>${patientName}</strong> by clicking the link below. This will open WhatsApp on your device with a pre-filled message.</p>
      <p><a href="${whatsappUrl}" target="_blank" style="font-size:1.2em; font-weight:bold; color: #25D366;">Click Here to Send WhatsApp Message</a></p>
      <p>If the link does not work, please contact them manually.</p>
      <p>Thank you.</p>
    `;

    MailApp.sendEmail({ to: staffEmail, subject: subject, htmlBody: body });
  } catch (e) {
    Logger.log(`Error sending WhatsApp link to staff for row ${row}: ${e.toString()}`);
  }
}

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
 * Moves rows with a 'Sent to Pharmacy' status older than 180 days to an 'Archive' sheet.
 * This function should be run on a time-based trigger (e.g., weekly).
 *
 * TO SET UP:
 * 1. Create a new sheet in your spreadsheet named "Archive".
 * 2. In the Apps Script editor, go to Triggers > Add Trigger.
 *    - Choose 'archiveOldRequests' as the function to run.
 *    - Choose 'Time-driven' as the event source.
 *    - Select 'Week timer' and a time that suits you (e.g., 'Every Monday', '1am to 2am').
 */
function archiveOldRequests() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAME);
    let archiveSheet = ss.getSheetByName("Archive");

    // Create archive sheet if it doesn't exist
    if (!archiveSheet) {
      archiveSheet = ss.insertSheet("Archive");
      // Copy headers to the archive sheet
      sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).copyTo(archiveSheet.getRange(1, 1));
      Logger.log("Created 'Archive' sheet.");
    }

    const dataRange = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn());
    const data = dataRange.getValues();
    const today = new Date();
    const cutOffDate = new Date(today.setDate(today.getDate() - 180));

    // Iterate backwards to safely delete rows
    for (let i = data.length - 1; i >= 0; i--) {
      const rowData = data[i];
      const status = rowData[STATUS_COL - 1];
      const processedDateStr = rowData[NOTIFICATION_COL - 1]; // Expected format: "Processed on dd/MM/yyyy"

      if (status === STATUS_READY && processedDateStr && processedDateStr.startsWith("Processed on ")) {
        const dateStr = processedDateStr.replace("Processed on ", ""); // "dd/MM/yyyy"
        const dateParts = dateStr.split('/'); // ["dd", "MM", "yyyy"]

        if (dateParts.length === 3) {
          // new Date(year, monthIndex, day)
          const processedDate = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));

          if (processedDate < cutOffDate) {
            const rowToDelete = i + 2; // +2 because data is 0-indexed and sheet is 1-indexed from row 2
            archiveSheet.appendRow(rowData);
            sourceSheet.deleteRow(rowToDelete);
            Logger.log(`Archived row ${rowToDelete}.`);
          }
        }
      }
    }
  } catch (err) {
    reportError('archiveOldRequests', err, null);
  }
}
