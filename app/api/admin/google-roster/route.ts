import { NextResponse } from "next/server";
import { createSign } from "node:crypto";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const SHEET_ID = "1FtwxaIYmi3yjRba_9zpQPzLvjN2tZdGfIdYvT_yJ-Pk";
const RANGE = "'Main Roster'!B10:P150";
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

export async function GET() {
  const access = await requirePermission("personnel.manage");
  if (!access || !access.appRoles.includes("COMMAND")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return NextResponse.json({ configured: false, spreadsheetId: SHEET_ID, rows: [], message: "Add Google Sheets service account credentials in Render and share the roster with its email." });
  try {
    const now = Math.floor(Date.now() / 1000);
    const unsigned = encode({ alg: "RS256", typ: "JWT" }) + "." + encode({
      iss: email, scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600
    });
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    const assertion = unsigned + "." + signer.sign(key).toString("base64url");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      cache: "no-store"
    });
    if (!tokenResponse.ok) throw new Error("Google authentication failed (" + tokenResponse.status + ")");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error("Google did not issue an access token");
    const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + SHEET_ID + "/values/" + encodeURIComponent(RANGE), {
      headers: { Authorization: "Bearer " + token.access_token }, cache: "no-store"
    });
    if (!response.ok) throw new Error("Google Sheets access failed (" + response.status + "). Check spreadsheet sharing.");
    const data = await response.json() as { values?: string[][] };
    const values = data.values || [];
    const headers = values[0] || [];
    const rows = values.slice(1).filter(row => row.some(cell => String(cell || "").trim())).map((row, index) => ({
      sourceRow: index + 11, rank: row[0] || "", shortRank: row[1] || "",
      name: row[2] || "", callsign: row[3] || "", discordName: row[4] || "",
      strikes: row[5] || "", activity: row[6] || "", staff: row[7] || "",
      trainer: row[8] || "", subdivision: row[9] || "",
      certification1: row[10] || "", certification2: row[11] || "",
      promoter: row[12] || "", promotionDate: row[13] || "", hireDate: row[14] || ""
    })).filter(row => row.name && row.rank && !/command$/i.test(row.rank));
    return NextResponse.json({ configured: true, spreadsheetId: SHEET_ID, headers, rows, mode: "read-only-preview" });
  } catch (error) {
    console.error("GOOGLE_ROSTER_PREVIEW_FAILED", error);
    return NextResponse.json({ configured: true, rows: [], error: error instanceof Error ? error.message : "Google Sheets connection failed" }, { status: 502 });
  }
}
