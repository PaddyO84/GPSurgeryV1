function handleAppointmentSubmission(data) {
  const APPT_SHEET_NAME = "Appointments";
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPT_SHEET_NAME);

  // Create sheet if not exists
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(APPT_SHEET_NAME);
    // Add Headers: Include CommPref column to match generic logic (mapped to COMM_PREF_COL=9)
    // Structure: Timestamp(1), Email(2), Pharmacy(3/Type), Name(4), Address(5), Phone(6), DOB(7), Meds(8/Notes), CommPref(9), Status(10), Notification(11)
    // We align Columns to allow 'onEdit' generic logic to work.
    sheet.appendRow(["Timestamp", "Email", "Type", "Name", "Address", "Phone", "DOB", "Notes", "CommPref", "Status", "Notification Sent", "Preferred Time"]);
    sheet.setFrozenRows(1);
  }

  const timestamp = new Date();
  // Map data to columns matching constants (approximate)
  // EMAIL_COL=2, NAME_COL=4, PHONE_COL=6, COMM_PREF_COL=9, STATUS_COL=10
  const rowData = [];
  rowData[0] = timestamp;
  rowData[EMAIL_COL - 1] = data.email;
  rowData[2] = data.type; // Col 3 (usually Pharmacy)
  rowData[NAME_COL - 1] = data.name;
  rowData[4] = ""; // Address (not collected for simple appt or not crucial)
  rowData[PHONE_COL - 1] = "'" + data.phone;
  rowData[6] = data.dob;
  rowData[7] = data.notes; // Col 8 (usually Meds)
  rowData[COMM_PREF_COL - 1] = "Email"; // Default or capture from form if added
  rowData[STATUS_COL - 1] = "New Request";
  rowData[NOTIFICATION_COL - 1] = "Processed on " + Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy");
  rowData[11] = data.preferredTime; // Extra column

  sheet.appendRow(rowData);

  sendAppointmentConfirmation(data.name, data.email, data.type, data.preferredTime);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'appointment' })).setMimeType(ContentService.MimeType.JSON);
}

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

function handlePrescriptionSubmission(data) {
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
}
