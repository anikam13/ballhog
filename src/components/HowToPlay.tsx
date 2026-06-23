import Overlay from "./Overlay";

interface Props {
  onClose: () => void;
}

const STEPS = [
  { n: "1", title: "A FACE DROPS", desc: "Every player sees the same NBA player at the same instant. 20 seconds on the shot clock." },
  { n: "2", title: "NAME HIM", desc: "Type fast. First correct answer takes the round. Wrong guesses lock you out. Not sure? Skip it." },
  { n: "3", title: "FIRST TO 5 WINS", desc: "Your knowledge rating moves every round: deep cuts earn more, easy misses cost you." },
  { n: "4", title: "SOLO MODE", desc: "No friends? Five rounds, one rating. Prove you watch more than highlights." },
];

const RATINGS = [
  { label: "CASUAL",   range: "0-199",    color: "#6B5C42" },
  { label: "HIGHLIGHTS ONLY", range: "200-399",  color: "#E8591A" },
  { label: "HOOPER",          range: "400-599",  color: "#2E7D3E" },
  { label: "ELITE",           range: "600-799",  color: "#1565C0" },
  { label: "SAVANT",   range: "800-1000", color: "#8B2BE2" },
];

export default function HowToPlay({ onClose }: Props) {
  return (
    <Overlay title="HOW TO PLAY" onClose={onClose}>
      <div className="howto-page-steps">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="howto-page-step">
              <div className="howto-page-num">{n}</div>
              <div>
                <div className="howto-page-title">{title}</div>
                <p className="howto-page-desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="howto-section">
          <div className="howto-section-label">PRO TIPS</div>
          <ul className="howto-tips-list">
            <li>Jersey numbers and team colors are visible clues</li>
            <li>Harder players earn you more rating points</li>
            <li>Wrong answers lock you out. Skip when unsure.</li>
            <li>Share your room code to invite friends instantly</li>
          </ul>
        </div>

        <div className="howto-section">
          <div className="howto-section-label">KNOWLEDGE RATINGS</div>
          <div className="rating-list">
            {RATINGS.map(({ label, range, color }) => (
              <div key={label} className="rating-row">
                <span className="rating-dot" style={{ background: color }} />
                <span className="rating-label">{label}</span>
                <span className="rating-range">{range}</span>
              </div>
            ))}
          </div>
        </div>
    </Overlay>
  );
}
