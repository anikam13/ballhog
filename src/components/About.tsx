import Overlay from "./Overlay";

interface Props {
  onClose: () => void;
}

export default function About({ onClose }: Props) {
  return (
    <Overlay title="ABOUT" onClose={onClose}>
      <div className="about-hero">
          <div className="about-logo">
            BALL<span className="logo-accent">HOG</span>
          </div>
          <p className="about-tagline">The NBA player identification game.</p>
        </div>

        <div className="about-stats-row">
          <div className="about-stat">
            <div className="about-stat-num">3,000+</div>
            <div className="about-stat-label">HOOPERS</div>
          </div>
          <div className="about-stat-divider" />
          <div className="about-stat">
            <div className="about-stat-num">36</div>
            <div className="about-stat-label">SEASONS</div>
          </div>
          <div className="about-stat-divider" />
          <div className="about-stat">
            <div className="about-stat-num">5</div>
            <div className="about-stat-label">TO WIN</div>
          </div>
        </div>

        <div className="about-section">
          <div className="about-section-title">THE GAME</div>
          <p className="about-section-text">
            Ballhog tests your NBA knowledge in real time. Recognize players from photos: jersey
            numbers, colorways, and pure basketball instinct. Play solo for a personal rating or
            race your crew to 5.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">PLAYER POOL</div>
          <p className="about-section-text">
            Every player who appeared in an NBA game from 1990 through 2026. All-time greats to
            deep bench contributors.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">NO ACCOUNT NEEDED</div>
          <p className="about-section-text">
            No login. No app. No tracking. Drop a name and ball out.
          </p>
        </div>
    </Overlay>
  );
}
