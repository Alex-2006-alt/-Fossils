import { Suspense } from "react";
import PhotoCollection from "@/components/PhotoCollection";
export default function TimelinePage() {
  return (
    <Suspense
      fallback={<div className="page skeleton" style={{ height: 300 }} />}
    >
      <PhotoCollection />
    </Suspense>
  );
}
