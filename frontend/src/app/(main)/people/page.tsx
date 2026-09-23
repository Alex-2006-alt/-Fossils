"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHeader, EmptyState, QueryError } from "@/components/Design";
interface Person {
  id: string;
  name: string;
  photoCount: number;
  coverUrl: string | null;
}
export default function PeoplePage() {
  const query = useQuery<Person[]>({
    queryKey: ["people"],
    queryFn: async () => {
      const response = await fetch("/api/people");
      if (!response.ok) throw Error("Could not load people");
      return response.json();
    },
  });
  return (
    <div className="page">
      <PageHeader
        eyebrow="THE HEART OF EVERY PHOTO"
        title="Life is better, together."
        description="Familiar faces, found throughout your family’s collection."
      />
      {query.isError ? (
        <QueryError retry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="people-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 240 }} />
          ))}
        </div>
      ) : query.data?.length ? (
        <div className="people-grid">
          {query.data.map((person) => (
            <Link
              key={person.id}
              href={`/people/${person.id}`}
              className="person-card"
            >
              <div className="person-portrait">
                {person.coverUrl ? (
                  <img src={person.coverUrl} alt={person.name} loading="lazy" />
                ) : (
                  <Icon name="people" size={35} />
                )}
              </div>
              <h2>
                {person.name === "Unknown" ? "A familiar face" : person.name}
              </h2>
              <p>{person.photoCount} moments together</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="people"
          title="Your favorite faces, all together."
          description="As your photos are processed, the people in them will begin to appear here."
          href="/timeline?upload=true"
          label="Add family photos"
        />
      )}
    </div>
  );
}
