const { expect } = require('chai');
const { validatePatientData, formatWhatsAppNumber, isRowArchivable } = require('../utils.gs');

describe('Backend Utility Logic Tests', () => {
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
            expect(oldRowProcessed).to.be.true;
            expect(recentRowReady).to.be.false;
            expect(queryRowArchivable).to.be.false;
        });

        it('should reject invalid or malformed dates gracefully', () => {
            const cutOffDate = new Date(2026, 0, 1);
            expect(isRowArchivable('Sent to Pharmacy', null, cutOffDate)).to.be.false;
            expect(isRowArchivable('Sent to Pharmacy', 'Invalid date format', cutOffDate)).to.be.false;
        });
    });
});
