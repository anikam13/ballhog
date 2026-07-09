import { FEEDBACK_FORM_URL } from "../config";

interface Props {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export default function SiteFooter({ onOpenTerms, onOpenPrivacy }: Props) {
  return (
    <footer className="home-footer">
      <div className="home-footer-brand-block">
        <span className="home-footer-brand">
          BALL<span className="logo-accent">HOG</span>
        </span>
        <span className="home-footer-meta">For players 13+</span>
      </div>
      <nav className="home-footer-links" aria-label="Legal and support">
        <a
          href={FEEDBACK_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="home-footer-link"
        >
          FEEDBACK
        </a>
        <button type="button" className="home-footer-link" onClick={onOpenPrivacy}>
          PRIVACY
        </button>
        <button type="button" className="home-footer-link" onClick={onOpenTerms}>
          TERMS
        </button>
      </nav>
    </footer>
  );
}
