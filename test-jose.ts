import { importSPKI } from "jose";

const rawKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuX6b1tJ8x9
-----END PUBLIC KEY-----`;

async function test() {
    try {
        const body = rawKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, "")
            .replace(/-----END PUBLIC KEY-----/g, "")
            .replace(/\s+/g, "");
        const lines = body.match(/.{1,64}/g) ?? [];
        const pem = `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;

        console.log("Reconstructed PEM:");
        console.log(JSON.stringify(pem));
        await importSPKI(pem, "RS256");
        console.log("Success with reconstructed");
    } catch (e) {
        console.error("Error with reconstructed:", e);
    }
}
test();
