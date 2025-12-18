# Prescription Request Application - Setup Confirmation

This document outlines the required configuration to ensure the Prescription Request Application functions correctly.

## 1. Web App & Spreadsheet Setup

The application has been upgraded to use a Google Apps Script Web App for more robust data handling, replacing the previous Google Form integration.

### Google Apps Script Web App
*   **Deployment ID:** `AKfycbwJqid8iaWeVppJjnBeyk11nKFj-2EWLuDLCZNlG9wbJ8eHDOo_zD3g65qHP0n7-tcL`
*   **Web App URL:** `https://script.google.com/macros/s/AKfycbwJqid8iaWeVppJjnBeyk11nKFj-2EWLuDLCZNlG9wbJ8eHDOo_zD3g65qHP0n7-tcL/exec`
*   **Access Setting:** The Web App must be deployed with access set to **"Anyone"** (or "Anyone with Google account" if strictly internal, but "Anyone" is needed for a public-facing patient form).
*   **Execute As:** User accessing the web app (if "Anyone with Google account") OR **"Me" (owner)** (recommended for public forms so patients don't need to log in).

### Google Spreadsheet
The script `Code.gs` writes data to the following sheet:

*   **Sheet Name:** `Form responses 1`
*   **Column Mapping:** The script automatically appends data in the following order:
    *   **Column A (1):** Timestamp
    *   **Column B (2):** Patient Email
    *   **Column C (3):** Chosen Pharmacy
    *   **Column D (4):** Patient Full Name
    *   **Column E (5):** Patient Address
    *   **Column F (6):** Contact Number
    *   **Column G (7):** Date of Birth
    *   **Column H (8):** Medication List (Formatted)
    *   **Column I (9):** Communication Preference
    *   **Column J (10):** Status (Initial state: Empty)
    *   **Column K (11):** Notification Sent (Logs processing timestamp)

## 2. Google Apps Script Setup (`Code.gs`)

### Manual Triggers
While the primary data entry is now handled by the `doPost` Web App function, the following time-based trigger is still recommended:

*   **Function:** `archiveOldRequests`
*   **Event Source:** Time-driven
*   **Event Type:** Week timer (Recommended: Every Monday, 1am to 2am)
*   **Purpose:** Moves old, processed requests to an 'Archive' sheet.

*Note: The `onFormSubmit` trigger is NO LONGER REQUIRED for new submissions, as the `doPost` function now handles the processing logic directly.*

### Environment Variables (Hardcoded in Script)
Ensure these constants in `Code.gs` match the practice's details:
*   `SENDER_NAME`: "Example Health Centre"
*   `YOUR_PHONE_NUMBER`: "01-234-5678"
*   `ADMIN_EMAIL`: "admin@example.com"

## 3. Frontend Configuration
The file `prescription_form.html` has been updated to submit data to the Web App URL.
*   **Variable:** `SCRIPT_WEB_APP_URL` contains the deployment URL.
*   **Submission Method:** Standard HTTP POST with a JSON payload.
