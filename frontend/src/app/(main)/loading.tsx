export default function Loading() {
  return (
    <div className="page" aria-label="Loading collection" aria-busy="true">
      <div
        className="skeleton"
        style={{ height: 70, width: "60%", marginBottom: 30 }}
      />
      <div className="gallery-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: "1" }} />
        ))}
      </div>
    </div>
  );
}
