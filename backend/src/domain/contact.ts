/**
 * Phone numbers are stored in E.164 (`+2348031234567`) so the same number always compares equal.
 *
 * Accepted input (spaces, dashes, dots and brackets are ignored):
 *  - Nigerian mobile, local form:         0803 123 4567       → +2348031234567
 *  - Nigerian, with country code:         +234 803 123 4567, 234 803 123 4567, 00234…
 *  - Nigerian landline:                   +234 1 234 5678
 *  - Any other international number:      +44 20 7946 0958    (E.164: + and 8–15 digits)
 */
const NIGERIAN_MOBILE_LOCAL = /^0([789][01]\d{8})$/;
const NIGERIAN_NATIONAL = /^(?:[789][01]\d{8}|[1-9]\d{6,8})$/;
const E164 = /^\+[1-9]\d{7,14}$/;

/** Returns the E.164 form, or null when the input is not a valid Nigerian or international number. */
export const normalisePhone = (input: string): string | null => {
    let value = input.trim().replace(/[\s().-]/g, "");
    if (value.startsWith("00")) value = `+${value.slice(2)}`;

    const local = NIGERIAN_MOBILE_LOCAL.exec(value);
    if (local) return `+234${local[1]}`;

    if (/^234\d+$/.test(value)) value = `+${value}`;
    if (value.startsWith("+234")) {
        return NIGERIAN_NATIONAL.test(value.slice(4)) ? value : null;
    }
    return E164.test(value) ? value : null;
};
