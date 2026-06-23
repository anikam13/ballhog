import Overlay from "./Overlay";

interface Props {
  onClose: () => void;
}

export default function Terms({ onClose }: Props) {
  return (
    <Overlay title="TERMS & CONDITIONS" onClose={onClose}>
      <p className="terms-disclaimer">
        These terms are a plain-language placeholder for a casual basketball trivia game.
        They are not legal advice.
      </p>

      <div className="about-section">
        <div className="about-section-title">ACCEPTANCE</div>
        <p className="about-section-text">
          By playing Ballhog, whether you create a room, join one, or use solo mode, you agree to
          these terms. If you do not agree, please do not use the service.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">USE OF SERVICE</div>
        <p className="about-section-text">
          Ballhog is a free, browser-based NBA player identification game. We may update
          features, player pools, or availability at any time without notice. The game is
          provided for entertainment only.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">ACCOUNTS & DATA</div>
        <p className="about-section-text">
          No account is required. You choose a display name when you play. Room codes and
          nicknames are stored locally in your browser so you can rejoin. We do not sell your
          personal information.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">USER CONDUCT</div>
        <p className="about-section-text">
          Keep it sportsmanlike. Do not use offensive nicknames, harass other players, attempt
          to cheat, disrupt rooms, or abuse the service. We may restrict access if you do.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">INTELLECTUAL PROPERTY</div>
        <p className="about-section-text">
          Ballhog, its design, and original content belong to its creators. NBA player names,
          images, and related marks are property of their respective owners. Ballhog is not
          affiliated with or endorsed by the NBA.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">DISCLAIMERS</div>
        <p className="about-section-text">
          The game is provided &ldquo;as is&rdquo; without warranties of any kind. Player photos,
          ratings, and trivia may contain errors. Do not rely on Ballhog for factual, betting,
          or professional purposes.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">LIMITATION OF LIABILITY</div>
        <p className="about-section-text">
          To the fullest extent permitted by law, Ballhog and its creators are not liable for
          any indirect, incidental, or consequential damages arising from your use of the game.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">CHANGES</div>
        <p className="about-section-text">
          We may update these terms from time to time. Continued use of Ballhog after changes
          are posted means you accept the updated terms.
        </p>
      </div>

      <p className="terms-updated">Last updated: June 2026</p>
    </Overlay>
  );
}
