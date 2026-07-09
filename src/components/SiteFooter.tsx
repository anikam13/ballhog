import { FEEDBACK_FORM_URL } from "../config";

interface Props {
  onOpenTerms: () => void;
}

export default function SiteFooter({ onOpenTerms }: Props) {
  return (
    <footer className="home-footer">
      <span className="home-footer-brand">
        BALL<span className="logo-accent">HOG</span>
      </span>
      <nav className="home-footer-links" aria-label="Legal and support">
        <a
          href={FEEDBACK_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="home-footer-link"
        >
          FEEDBACK
        </a>
        <button type="button" className="home-footer-link" onClick={onOpenTerms}>
          TERMS & CONDITIONS
        </button>
      </nav>
    </footer>
  );
}
