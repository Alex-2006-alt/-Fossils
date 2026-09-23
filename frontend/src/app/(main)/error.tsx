"use client";
import { QueryError } from "@/components/Design";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <h1>Let’s try that again.</h1>
      <QueryError retry={reset} />
    </div>
  );
}
