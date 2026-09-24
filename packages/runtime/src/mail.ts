import { HttpError } from "./security";
export function mailConfigured() {
  return !!(
    process.env.MAIL_WEBHOOK_URL &&
    process.env.MAIL_WEBHOOK_TOKEN &&
    process.env.APP_URL
  );
}
export async function sendAccountMail(
  to: string,
  purpose: "RESET" | "VERIFY",
  token: string,
) {
  if (!mailConfigured())
    throw new HttpError(503, "Email delivery is not configured");
  const endpoint = new URL(process.env.MAIL_WEBHOOK_URL!);
  if (endpoint.protocol !== "https:")
    throw Error("Mail webhook must use HTTPS");
  const url = new URL("/account-recovery", process.env.APP_URL);
  url.hash = new URLSearchParams({ token, purpose }).toString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.MAIL_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      to,
      subject:
        purpose === "RESET"
          ? "Reset your FamVault password"
          : "Verify your FamVault email",
      text:
        "Open this link to " +
        (purpose === "RESET" ? "reset your password" : "verify your email") +
        ": " +
        url.toString() +
        ". This link expires in 30 minutes.",
    }),
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  if (!response.ok) throw Error("Email delivery failed");
}
