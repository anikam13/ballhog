// Generic head-and-shoulders silhouette — the placeholder "headshot."
// The real scraped headshot pipeline replaces this later.
export default function Silhouette() {
  return (
    <svg className="silhouette" viewBox="0 0 100 100" aria-label="mystery player">
      <circle cx="50" cy="34" r="17" />
      <path d="M50 54 C30 54 18 66 15 84 L15 100 L85 100 L85 84 C82 66 70 54 50 54 Z" />
    </svg>
  );
}
