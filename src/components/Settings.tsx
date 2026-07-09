import { useState } from "react";
import { FEEDBACK_FORM_URL } from "../config";
import Overlay from "./Overlay";

interface Props {
  onClose: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export function initDarkMode() {
  const saved = localStorage.getItem("darkMode");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = saved !== null ? saved === "true" : prefersDark;
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

function applyDarkMode(dark: boolean) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  localStorage.setItem("darkMode", String(dark));
}

export default function Settings({ onClose, onOpenPrivacy, onOpenTerms }: Props) {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark"
  );

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    applyDarkMode(next);
  };

  return (
    <Overlay title="SETTINGS" onClose={onClose}>
      <div className="settings-section-label">APPEARANCE</div>

      <button className="settings-row" onClick={toggleDark}>
        <div className="settings-row-text">
          <div className="settings-row-label">DARK MODE</div>
          <div className="settings-row-desc">Easier on the eyes at night</div>
        </div>
        <div className={`toggle ${dark ? "toggle-on" : ""}`}>
          <div className="toggle-knob" />
        </div>
      </button>

      <div className="settings-section-label">FEEDBACK</div>

      <a
        className="settings-row"
        href={FEEDBACK_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="settings-row-text">
          <div className="settings-row-label">SEND FEEDBACK</div>
          <div className="settings-row-desc">Report bugs or suggest players</div>
        </div>
        <span className="settings-row-external" aria-hidden="true">
          ↗
        </span>
      </a>

      <div className="settings-section-label">ABOUT THIS BUILD</div>

      <div className="settings-row settings-row-static">
        <div className="settings-row-text">
          <div className="settings-row-label">
            VERSION <span className="settings-beta-tag">BETA</span>
          </div>
          <div className="settings-row-desc">Early release. Features may change</div>
        </div>
      </div>

      {(onOpenPrivacy || onOpenTerms) && (
        <>
          <div className="settings-section-label">LEGAL</div>

          {onOpenPrivacy && (
            <button type="button" className="settings-row" onClick={onOpenPrivacy}>
              <div className="settings-row-text">
                <div className="settings-row-label">PRIVACY POLICY</div>
                <div className="settings-row-desc">What we store and who we use</div>
              </div>
            </button>
          )}

          {onOpenTerms && (
            <button type="button" className="settings-row" onClick={onOpenTerms}>
              <div className="settings-row-text">
                <div className="settings-row-label">TERMS &amp; CONDITIONS</div>
                <div className="settings-row-desc">Rules for using Ballhog</div>
              </div>
            </button>
          )}
        </>
      )}

      {import.meta.env.DEV && (
        <>
          <div className="settings-section-label">DEVELOPER</div>

          <a className="settings-row" href="#dev" onClick={onClose}>
            <div className="settings-row-text">
              <div className="settings-row-label">PLAYER REVIEW</div>
              <div className="settings-row-desc">Curate clue players locally</div>
            </div>
            <span className="settings-row-external" aria-hidden="true">
              ↗
            </span>
          </a>
        </>
      )}
    </Overlay>
  );
}
