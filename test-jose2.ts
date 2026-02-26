import { importSPKI } from "jose";

async function test(pem: string) {
    try {
        await importSPKI(pem, "RS256");
        console.log("Success with", JSON.stringify(pem));
    } catch (e) {
        if (e.message.includes("must be SPKI")) {
            console.error("Match!", JSON.stringify(pem), "->", e.message);
        } else {
            console.error(
                "Other error for",
                JSON.stringify(pem),
                "->",
                e.name,
                e.message,
            );
        }
    }
}
test("bad string");
test(" -----BEGIN PUBLIC KEY-----...");
test("-----BEGIN PUBLIC KEY-----");
test("-----BEGIN PUBLIC KEY-----\\n-----END PUBLIC KEY-----");
test(`-----BEGIN PUBLIC KEY-----
-----END PUBLIC KEY-----`);
