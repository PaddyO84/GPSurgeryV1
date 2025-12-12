# Prescription Request Application - Setup Confirmation

This document outlines the required configuration to ensure the Prescription Request Application functions correctly. The application consists of a Frontend (HTML Form) and a Backend (Google Apps Script linked to a Google Sheet).

## 1. Google Form & Spreadsheet Setup

The application relies on a Google Form linked to a specific Google Sheet.

### Google Form
*   **Form ID:** `1FAIpQLSepUNc9-xIpDf_UaM3-OwFFRdZozUoZC3jHRCas0b-gc1NStg` (Found in `prescription_form.html`)
*   **Submission URL:** `https://docs.google.com/forms/d/e/1FAIpQLSepUNc9-xIpDf_UaM3-OwFFRdZozUoZC3jHRCas0b-gc1NStg/formResponse`
*   **Required Form Fields:** The Google Form must be configured to accept the following entries, which map to specific IDs:
    *   `entry.1775196617`: Patient Name
    *   `entry.2008110253`: Patient Email
    *   `entry.1011602497`: Patient Date of Birth
    *   `entry.1572836613`: Patient Address
    *   `entry.1516294764`: Patient Phone Number
    *   `entry.1118271783`: Chosen Pharmacy
    *   `entry.274147264`: Communication Preference
    *   `entry.607030324`: Medication List (Formatted string)

### Google Spreadsheet
The Google Form must be linked to a Google Spreadsheet. The script `Code.gs` expects the following structure in the destination sheet:

*   **Sheet Name:** `Form responses 1` (Standard default for Google Forms)
*   **Column Mapping:** The script identifies data based on the following column indices (A=1, B=2, etc.):
    *   **Column 2 (B):** Patient Email
    *   **Column 3 (C):** Chosen Pharmacy
    *   **Column 4 (D):** Patient Full Name
    *   **Column 6 (F):** Contact Number
    *   **Column 8 (H):** Medication List
    *   **Column 9 (I):** Communication Preference
    *   **Column 10 (J):** Status (Used by script for workflow)
    *   **Column 11 (K):** Notification Sent (Used by script for logging)

*Note: The columns E (5) and G (7) are present in the form submission (likely DOB and Address based on the HTML form) but are not explicitly used by the `Code.gs` backend logic for automation, though they will be recorded in the sheet.*

## 2. Google Apps Script Setup (`Code.gs`)

The following triggers must be manually set up in the Apps Script project associated with the Spreadsheet:

### Trigger 1: Form Submission Handler
*   **Function:** `onFormSubmit`
*   **Event Source:** From spreadsheet
*   **Event Type:** On form submit
*   **Purpose:** Sends confirmation email to patient, formats the medication list, and sets initial status.

### Trigger 2: Archive Manager
*   **Function:** `archiveOldRequests`
*   **Event Source:** Time-driven
*   **Event Type:** Week timer (Recommended: Every Monday, 1am to 2am)
*   **Purpose:** Moves old, processed requests to an 'Archive' sheet to keep the main view clean.

### Environment Variables (Hardcoded in Script)
Ensure these constants in `Code.gs` match the practice's details:
*   `SENDER_NAME`: "Carndonagh Health Centre"
*   `YOUR_PHONE_NUMBER`: "074-93-74242"
*   `ADMIN_EMAIL`: "patricknoone+surgery@gmail.com"

## 3. Frontend Deployment
*   The file `prescription_form.html` is designed to be hosted on any static web server (e.g., GitHub Pages).
*   It submits data directly to Google Forms via a cross-origin POST request (`mode: 'no-cors'`).
