import bcrypt from "bcrypt";

export interface PasswordHasher {
    hash(plain: string): Promise<string>;
    verify(plain: string, hash: string): Promise<boolean>;
}

// bcrypt silently truncates input beyond 72 bytes; reject instead so long
// passphrases sharing a 72-byte prefix are not treated as equal.
export const BCRYPT_MAX_PASSWORD_BYTES = 72;

export class BcryptPasswordHasher implements PasswordHasher {
    constructor(private readonly cost: number) {}

    async hash(plain: string): Promise<string> {
        if (Buffer.byteLength(plain, "utf8") > BCRYPT_MAX_PASSWORD_BYTES) {
            throw new RangeError(`password exceeds ${BCRYPT_MAX_PASSWORD_BYTES} bytes`);
        }
        return bcrypt.hash(plain, this.cost);
    }

    async verify(plain: string, hash: string): Promise<boolean> {
        if (Buffer.byteLength(plain, "utf8") > BCRYPT_MAX_PASSWORD_BYTES) {
            return false;
        }
        return bcrypt.compare(plain, hash);
    }
}
