import Link from "next/link";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/Design";
export default function PlacesPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="SOMEWHERE, TOGETHER"
        title="The places we’ve been."
        description="Every place holds a little piece of your story."
      />
      <section className="feature-panel">
        <div className="globe-art" aria-hidden="true">
          <Icon name="pin" size={36} />
        </div>
        <div>
          <span className="eyebrow">A NEW WAY TO WANDER · COMING SOON</span>
          <h2>
            A world of memories.
            <br />
            One family.
          </h2>
          <p>
            We’re making a map for your family’s adventures. For now, find the
            places you’ve saved by searching your photo collection.
          </p>
          <Link href="/search" className="btn-primary">
            Find a place
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
