const { expect } = require('chai');

describe('Backend Utility Logic Tests', () => {
    function validatePatientData(email, phone) {
        const errors = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) errors.push("Invalid email address.");
        if (!phone || typeof phone !== 'string' || phone.trim().length < 7) errors.push("Invalid phone number.");
        return { isValid: errors.length === 0, errors };
    }

    function formatWhatsAppNumber(phone) {
        if (!phone) return "";
        const cleaned = phone.toString().replace(/[\s\-\(\)]/g, '');
        if (cleaned.startsWith('+353')) return cleaned.substring(1);
        if (cleaned.startsWith('00353')) return cleaned.substring(2);
        if (cleaned.startsWith('353')) return cleaned;
        if (cleaned.startsWith('0')) return '353' + cleaned.substring(1);
        return '353' + cleaned;
    }

    describe('validatePatientData()', () => {
        it('should validate valid email and phone numbers', () => {
            const res = validatePatientData('patient@example.com', '0871234567');
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

        it('should return empty string for empty input', () => {
            expect(formatWhatsAppNumber('')).to.equal('');
            expect(formatWhatsAppNumber(null)).to.equal('');
        });
    });

    describe('Archive Date Filtering Logic', () => {
        function shouldArchiveRow(status, processedDateStr, cutOffDate) {
            const STATUS_READY = "Sent to Pharmacy";
            if (status === STATUS_READY && processedDateStr && typeof processedDateStr === 'string' && processedDateStr.startsWith("Processed on ")) {
                const dateParts = processedDateStr.replace("Processed on ", "").split('/');
                if (dateParts.length === 3) {
                    const processedDate = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
                    return processedDate < cutOffDate;
                }
            }
            return false;
        }

        it('should identify rows older than cutoff date for archiving', () => {
            const cutOffDate = new Date(2026, 0, 1); // 1 Jan 2026
            const oldRowArchivable = shouldArchiveRow('Sent to Pharmacy', 'Processed on 15/06/2025', cutOffDate);
            const recentRowArchivable = shouldArchiveRow('Sent to Pharmacy', 'Processed on 15/03/2026', cutOffDate);
            const queryRowArchivable = shouldArchiveRow('Query - Please Contact Us', 'Processed on 15/06/2025', cutOffDate);

            expect(oldRowArchivable).to.be.true;
            expect(recentRowArchivable).to.be.false;
            expect(queryRowArchivable).to.be.false;
        });
    });
});
