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

        <div className="about-section">
          <div className="about-section-title">THE GAME</div>
          <p className="about-section-text">
            Ballhog tests your NBA knowledge in real time. Recognize players from photos: jersey
            numbers, colorways, and pure basketball instinct. Play solo for a personal rating or
            race your crew. First to X correct guesses wins (host picks 3–10).
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">PLAYER POOL</div>
          <p className="about-section-text">
            Thousands of NBA names are searchable when you guess. Clue faces are a curated set
            of headshots from modern eras (players active since 1990), from stars to deep bench.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">NO ACCOUNT NEEDED</div>
          <p className="about-section-text">
            No login. No app download. Your nickname and room code stay in your browser so you
            can rejoin. We don&apos;t sell your data. Drop a name and ball out.
          </p>
        </div>

        <div className="about-section">
          <div className="about-section-title">NOT AFFILIATED</div>
          <p className="about-section-text">
            Ballhog is an independent fan project and is not affiliated with, endorsed by, or
            sponsored by the NBA, its teams, or players.
          </p>
        </div>
    </Overlay>
  );
}
