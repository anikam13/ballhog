import { useEffect, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const BackArrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

/**
 * Shared chrome for the top-menu pages (How to play / About / Settings).
 * On mobile it's a full-screen slide-up sheet; on desktop the same markup
 * becomes a centered modal card over a dimmed backdrop. Closes on Escape or
 * a click on the backdrop.
 */
export default function Overlay({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay-scrim" onClick={onClose}>
      <div
        className="overlay"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overlay-header">
          <button className="btn-icon overlay-back" onClick={onClose} aria-label="Close">
            <span className="overlay-back-mobile"><BackArrow /></span>
            <span className="overlay-back-desktop"><CloseIcon /></span>
          </button>
          <span className="overlay-title">{title}</span>
          <span className="overlay-spacer" />
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}
