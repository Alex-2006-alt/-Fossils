import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@famvault/runtime/security";
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.status === 429 ? { "Retry-After": "60" } : {}),
        },
      },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  console.error("Request failed", {
    name: error instanceof Error ? error.name : "Unknown",
  });
  return NextResponse.json(
    { error: "Unable to complete this request" },
    { status: 500 },
  );
}
