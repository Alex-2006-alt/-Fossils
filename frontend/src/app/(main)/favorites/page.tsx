import { Suspense } from "react";
import PhotoCollection from "@/components/PhotoCollection";
export default function FavoritesPage() {
  return (
    <Suspense
      fallback={<div className="page skeleton" style={{ height: 300 }} />}
    >
      <PhotoCollection favorites />
    </Suspense>
  );
}
