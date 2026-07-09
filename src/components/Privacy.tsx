import { FEEDBACK_FORM_URL } from "../config";
import Overlay from "./Overlay";

interface Props {
  onClose: () => void;
}

export default function Privacy({ onClose }: Props) {
  return (
    <Overlay title="PRIVACY POLICY" onClose={onClose}>
      <p className="terms-disclaimer">
        This policy explains what Ballhog stores, what third parties may see when you use the
        game, and how to reach us. It is written in plain language for a casual browser game,
        not a substitute for legal advice.
      </p>

      <div className="about-section">
        <div className="about-section-title">WHAT WE COLLECT</div>
        <p className="about-section-text">
          Ballhog does not require an account or email to play. In your browser we store a
          random player id, your nickname, last room code, and appearance preference
          (dark mode) in localStorage so you can rejoin a room after a refresh. During
          multiplayer games, your nickname, guesses, and score travel over a realtime
          Socket.IO connection to our game server so other players in the room can see the
          match. Solo ratings and session feedback dismissals may also be kept in browser
          storage on your device.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">COOKIES &amp; LOCAL STORAGE</div>
        <p className="about-section-text">
          We use localStorage (and occasionally sessionStorage) for gameplay continuity, not
          advertising cookies. Clearing site data in your browser removes this information.
          We do not sell your personal information.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">THIRD PARTIES</div>
        <p className="about-section-text">
          The game loads fonts from Google Fonts. Feedback opens a form hosted by Tally. The
          app and Socket.IO game traffic are hosted on Railway (or whatever host we deploy
          to). Those providers may process technical data such as IP address, user agent, and
          request logs under their own policies when you load fonts, submit feedback, or play.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">ANALYTICS &amp; ADS MEASUREMENT</div>
        <p className="about-section-text">
          Today Ballhog does not ship advertising pixels or product analytics by default. If
          we enable measurement later (for example Google Analytics 4 or Meta Pixel), it will
          only load when configured in our deployment environment, and this policy will be
          updated to name the tools in use. Any such tools may collect device and usage data
          to help us understand traffic and ad performance.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">CHILDREN</div>
        <p className="about-section-text">
          Ballhog is a general-audience basketball trivia game. It is not directed at children
          under 13. If you believe a child has provided us information, contact us and we will
          take reasonable steps to delete it from systems we control.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">CHANGES</div>
        <p className="about-section-text">
          We may update this policy as the product changes. The &ldquo;Last updated&rdquo; date
          below will change when we do. Continued use after an update means you accept the
          revised policy.
        </p>
      </div>

      <div className="about-section">
        <div className="about-section-title">CONTACT</div>
        <p className="about-section-text">
          Questions about privacy? Reach us through our{" "}
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
