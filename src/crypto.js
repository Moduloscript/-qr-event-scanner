const crypto = require('crypto');

/**
 * Generate HMAC-SHA256 signature for a guest.
 * @param {string} guestId UUID v4 of the guest
 * @param {string} name Full name of the guest
 * @param {string} secret Server private signing secret
 * @returns {string} HMAC-SHA256 hex digest
 */
function generateSignature(guestId, name, secret) {
    if (!secret) {
        throw new Error('Signing secret is not defined');
    }
    // Normalize string representation to avoid whitespace signature mismatches
    const payload = `${guestId.trim().toLowerCase()}:${name.trim().toLowerCase()}`;
    return crypto.createHmac('sha256', secret)
                 .update(payload)
                 .digest('hex');
}

/**
 * Verify if the guest details match the signature.
 * @param {string} guestId UUID v4 of the guest
 * @param {string} name Full name of the guest
 * @param {string} signature HMAC signature to check
 * @param {string} secret Server private signing secret
 * @returns {boolean} True if signature is valid
 */
function verifySignature(guestId, name, signature, secret) {
    try {
        const computed = generateSignature(guestId, name, secret);
        return crypto.timingSafeEqual(
            Buffer.from(computed, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch (e) {
        return false;
    }
}

module.exports = {
    generateSignature,
    verifySignature
};
