import { FEEDBACK_FORM_URL } from "../config";
import Overlay from "./Overlay";

interface Props {
  onClose: () => void;
}

export default function Terms({ onClose }: Props) {
  return (
    <Overlay title="TERMS & CONDITIONS" onClose={onClose}>
      <p className="terms-disclaimer">
        These terms govern your use of Ballhog, a free browser-based basketball trivia game.
        They are written in plain language and are not a substitute for legal advice.
      </p>

      <div className="about-section">
        <div className="about-section-title">ACCEPTANCE</div>
        <p className="about-section-text">
          By playing Ballhog — creating a room, joining one, or using solo mode — you agree to
          these terms and our Privacy Policy. If you do not agree, please do not use the
          service.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">USE OF SERVICE</div>
        <p className="about-section-text">
          Ballhog is a free, browser-based NBA player identification game provided for
          entertainment. We may update features, player pools, ratings, or availability at any
          time without notice. We may suspend or discontinue the service.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">ACCOUNTS &amp; DATA</div>
        <p className="about-section-text">
          No account is required. You choose a display nickname when you play. A random player
          id, nicknames, and room codes are stored locally in your browser so you can rejoin.
          Gameplay data is sent to our servers during live rooms. See our Privacy Policy for
          details. We do not sell your personal information.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">USER CONDUCT</div>
        <p className="about-section-text">
          Keep it sportsmanlike. Do not use offensive nicknames, harass other players, cheat,
          disrupt rooms, scrape the service, or abuse infrastructure. We may restrict access if
          you do.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">INTELLECTUAL PROPERTY</div>
        <p className="about-section-text">
          Ballhog, its design, and original content belong to its creators. NBA player names,
          images, logos, and related marks are property of their respective owners. Ballhog is
          an independent fan project and is not affiliated with, endorsed by, or sponsored by
          the NBA, its teams, or players.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">DISCLAIMERS</div>
        <p className="about-section-text">
          The game is provided &ldquo;as is&rdquo; without warranties of any kind. Player
          photos, ratings, and trivia may contain errors. Do not rely on Ballhog for factual,
          betting, or professional purposes.
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
        <div className="about-section-title">GOVERNING LAW</div>
        <p className="about-section-text">
          These terms are governed by the laws of the United States, without regard to conflict
          of law rules, except where mandatory local consumer protections apply.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">CHANGES</div>
        <p className="about-section-text">
          We may update these terms from time to time. Continued use of Ballhog after changes
          are posted means you accept the updated terms.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">CONTACT</div>
        <p className="about-section-text">
          Questions about these terms? Reach us through our{" "}
          <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer">
            feedback form
          </a>
          .
        </p>
      </div>

      <p className="terms-updated">Last updated: July 2026</p>
    </Overlay>
  );
}
