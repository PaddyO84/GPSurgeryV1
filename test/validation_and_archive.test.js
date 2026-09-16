const { expect } = require('chai');
const { validatePatientData, formatWhatsAppNumber, isRowArchivable, sanitizeCellValue, escapeHtml } = require('../utils.gs');

describe('Backend Utility Logic Tests', () => {
    describe('escapeHtml()', () => {
        it('should escape HTML special characters &, <, >, ", and \'', () => {
            expect(escapeHtml('<script>alert("xss")</script>')).to.equal('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(escapeHtml("John & Mary's Clinic")).to.equal('John &amp; Mary&#39;s Clinic');
        });

        it('should handle empty or null values gracefully', () => {
            expect(escapeHtml('')).to.equal('');
            expect(escapeHtml(null)).to.equal('');
            expect(escapeHtml(undefined)).to.equal('');
        });
    });

    describe('sanitizeCellValue()', () => {
        it('should prepend single quote to string values starting with formula characters =, +, -, @, \\t, \\r', () => {
            expect(sanitizeCellValue('=SUM(A1:A10)')).to.equal("'=SUM(A1:A10)");
            expect(sanitizeCellValue('+12345')).to.equal("'+12345");
            expect(sanitizeCellValue('-10')).to.equal("'-10");
            expect(sanitizeCellValue('@HYPERLINK("evil.com")')).to.equal("'@HYPERLINK(\"evil.com\")");
            expect(sanitizeCellValue('\tcmd')).to.equal("'\tcmd");
            expect(sanitizeCellValue('\rcmd')).to.equal("'\rcmd");
            expect(sanitizeCellValue('  =SUM(A1:A10)')).to.equal("'  =SUM(A1:A10)");
        });

        it('should leave safe strings and non-string values unchanged', () => {
            expect(sanitizeCellValue('Regular text')).to.equal('Regular text');
            expect(sanitizeCellValue('')).to.equal('');
            expect(sanitizeCellValue(123)).to.equal(123);
            expect(sanitizeCellValue(true)).to.equal(true);
            expect(sanitizeCellValue(null)).to.be.null;
            expect(sanitizeCellValue(undefined)).to.be.undefined;
        });
    });
    describe('validatePatientData()', () => {
        it('should validate valid email and phone numbers', () => {
            const res = validatePatientData('patient@example.com', '0871234567');
            expect(res.isValid).to.be.true;
            expect(res.errors).to.be.empty;
        });

        it('should validate phone with international +353 prefix', () => {
            const res = validatePatientData('patient@example.com', '+353 87 123 4567');
            expect(res.isValid).to.be.true;
            expect(res.errors).to.be.empty;
        });

        it('should reject invalid emails', () => {
            const res = validatePatientData('invalid-email', '0871234567');
            expect(res.isValid).to.be.false;
            expect(res.errors).to.include("Invalid email address.");
        });

        it('should reject short or missing phone numbers', () => {
            const res = validatePatientData('patient@example.com', '123');
            expect(res.isValid).to.be.false;
            expect(res.errors).to.include("Invalid phone number.");
        });

        it('should reject non-string phone numbers', () => {
            const res = validatePatientData('patient@example.com', 871234567);
            expect(res.isValid).to.be.false;
            expect(res.errors).to.include("Invalid phone number.");
        });

        it('should reject invalid characters or plus-only phone numbers', () => {
            const res = validatePatientData('patient@example.com', '+353abcdef');
            expect(res.isValid).to.be.false;
            expect(res.errors).to.include("Invalid phone number.");
        });
    });

    describe('formatWhatsAppNumber()', () => {
        it('should format standard Irish domestic numbers with leading 0', () => {
            expect(formatWhatsAppNumber('087 123 4567')).to.equal('353871234567');
        });

        it('should format Irish numbers with +353 prefix', () => {
            expect(formatWhatsAppNumber('+353 87 123 4567')).to.equal('353871234567');
        });

        it('should format Irish numbers with 00353 prefix', () => {
            expect(formatWhatsAppNumber('00353-87-1234567')).to.equal('353871234567');
        });

        it('should format numbers with dot separators', () => {
            expect(formatWhatsAppNumber('087.123.4567')).to.equal('353871234567');
        });

        it('should format international numbers without prepending 353', () => {
            expect(formatWhatsAppNumber('+44 7911 123456')).to.equal('447911123456');
            expect(formatWhatsAppNumber('0044 7911 123456')).to.equal('447911123456');
            expect(formatWhatsAppNumber('+1 555 123 4567')).to.equal('15551234567');
        });

        it('should return empty string for inputs containing non-digit characters in normalized result', () => {
            expect(formatWhatsAppNumber('+353 87 abc 4567')).to.equal('');
            expect(formatWhatsAppNumber('phone-number')).to.equal('');
            expect(formatWhatsAppNumber('+++')).to.equal('');
            expect(formatWhatsAppNumber('9991234567')).to.equal('');
        });

        it('should return empty string for empty input', () => {
            expect(formatWhatsAppNumber('')).to.equal('');
            expect(formatWhatsAppNumber(null)).to.equal('');
        });
    });

    describe('Archive Date Filtering Logic (isRowArchivable)', () => {
        it('should identify rows older than cutoff date for archiving using Ready on timestamp', () => {
            const cutOffDate = new Date(2026, 0, 1); // 1 Jan 2026
            const oldRowReady = isRowArchivable('Sent to Pharmacy', 'Ready on 15/06/2025 14:30:00', cutOffDate);
            const recentRowReady = isRowArchivable('Sent to Pharmacy', 'Ready on 15/03/2026 10:00:00', cutOffDate);
            const oldRowProcessed = isRowArchivable('Sent to Pharmacy', 'Processed on 15/06/2025', cutOffDate);
            const queryRowArchivable = isRowArchivable('Query - Please Contact Us', 'Ready on 15/06/2025 14:30:00', cutOffDate);

            expect(oldRowReady).to.be.true;
            // Both "Ready on " and "Processed on " prefixes are accepted for date extraction
            expect(oldRowProcessed).to.be.true;
            expect(recentRowReady).to.be.false;
            expect(queryRowArchivable).to.be.false;
        });

        it('should reject invalid or malformed dates gracefully', () => {
            const cutOffDate = new Date(2026, 0, 1);
            expect(isRowArchivable('Sent to Pharmacy', null, cutOffDate)).to.be.false;
            expect(isRowArchivable('Sent to Pharmacy', 'Invalid date format', cutOffDate)).to.be.false;
            // 31st of February would roll over into March in loose Date parsing
            expect(isRowArchivable('Sent to Pharmacy', 'Ready on 31/02/2025 10:00:00', cutOffDate)).to.be.false;
        });

        it('should handle same-day boundary comparisons with HH:mm:ss correctly', () => {
            const cutOffDate = new Date(2026, 5, 15, 12, 0, 0); // 15 June 2026 12:00:00
            const beforeCutoff = isRowArchivable('Sent to Pharmacy', 'Ready on 15/06/2026 10:30:00', cutOffDate);
            const afterCutoff = isRowArchivable('Sent to Pharmacy', 'Ready on 15/06/2026 14:30:00', cutOffDate);
            expect(beforeCutoff).to.be.true;
            expect(afterCutoff).to.be.false;
        });
    });
});
