function handleAppointmentSubmission(data) {
  const APPT_SHEET_NAME = "Appointments";
  const headers = ["Timestamp", "Email", "Type", "Name", "Address", "Phone", "DOB", "Notes", "CommPref", "Status", "Notification Sent", "Preferred Time"];
  const sheet = getOrCreateSheet(APPT_SHEET_NAME, headers);

  const validation = validatePatientData(data.email, data.phone);
  if (!validation.isValid) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': validation.errors })).setMimeType(ContentService.MimeType.JSON);
  }

  const timestamp = new Date();
  const rowData = [];
  rowData[0] = timestamp;
  rowData[EMAIL_COL - 1] = data.email;
  rowData[2] = data.type;
  rowData[NAME_COL - 1] = data.name;
  rowData[4] = "";
  rowData[PHONE_COL - 1] = "'" + data.phone;
  rowData[6] = data.dob;
  rowData[7] = data.notes;
  rowData[COMM_PREF_COL - 1] = "Email";
  rowData[STATUS_COL - 1] = "New Request";
  rowData[NOTIFICATION_COL - 1] = "Processed on " + Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy");
  rowData[11] = data.preferredTime;

  sheet.appendRow(rowData);
  sendAppointmentConfirmation(data.name, data.email, data.type, data.preferredTime);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'appointment' })).setMimeType(ContentService.MimeType.JSON);
}

function handleSickNoteSubmission(data) {
  const SICK_SHEET_NAME = "Sick Notes";
  const headers = ["Timestamp", "Status", "Name", "DOB", "Phone", "Email", "Address", "Cert Type", "PPS", "Condition", "Dates", "Return to Work", "Signature", "Notification Sent"];
  const sheet = getOrCreateSheet(SICK_SHEET_NAME, headers);

  const validation = validatePatientData(data.email, data.phone);
  if (!validation.isValid) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': validation.errors })).setMimeType(ContentService.MimeType.JSON);
  }

  const timestamp = new Date();
  const rowData = [
    timestamp,
    "New Request",
    data.name,
    data.dob,
    "'" + data.phone,
    data.email,
    data.address,
    data.type,
    data.pps,
    data.condition,
    data.dates,
    data.returnToWork,
    data.signature || "Not Provided",
    "Processed on " + Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy")
  ];

  sheet.appendRow(rowData);
  sendSickNoteConfirmation(data.name, data.email);

  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'type': 'sick-note' })).setMimeType(ContentService.MimeType.JSON);
}

function handlePrescriptionSubmission(data) {
    const sheet = getOrCreateSheet(SHEET_NAME); // Assuming SHEET_NAME is defined in Code.gs

    const validation = validatePatientData(data.patientDetails.email, data.patientDetails.phone);
    if (!validation.isValid) {
       return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'errors': validation.errors })).setMimeType(ContentService.MimeType.JSON);
    }

    const timestamp = new Date();
    let medicationString = "";
    if (data.medicationList && Array.isArray(data.medicationList)) {
       medicationString = data.medicationList.map(m => `${m.name} - ${m.dosage} (${m.freq})`).join("\n");
    }

    const newRow = [];
    newRow[0] = timestamp;
    newRow[EMAIL_COL - 1] = data.patientDetails.email;
    newRow[PHARMACY_COL - 1] = data.patientDetails.pharmacy;
    newRow[NAME_COL - 1] = data.patientDetails.name;
    newRow[4] = data.patientDetails.address;
    newRow[PHONE_COL - 1] = "'" + data.patientDetails.phone;
    newRow[6] = data.patientDetails.dob;
    newRow[MEDS_COL - 1] = medicationString;
    newRow[COMM_PREF_COL - 1] = data.patientDetails.commPref;
    newRow[STATUS_COL - 1] = "";
    newRow[NOTIFICATION_COL - 1] = "Processed on " + Utilities.formatDate(timestamp, "Europe/Dublin", "dd/MM/yyyy");

    sheet.appendRow(newRow);
    const row = sheet.getLastRow();

    sendConfirmationNotification(data.patientDetails.name, data.patientDetails.email, data.patientDetails.commPref);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': row })).setMimeType(ContentService.MimeType.JSON);
}
