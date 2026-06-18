import { useState } from "react";

interface Props {
  onClose: () => void;
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

const BackArrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

export default function Settings({ onClose }: Props) {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark"
  );

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    applyDarkMode(next);
  };

  return (
    <div className="overlay">
      <div className="overlay-header">
        <button className="btn-icon overlay-back" onClick={onClose} aria-label="Close">
          <BackArrow />
        </button>
        <span className="overlay-title">SETTINGS</span>
        <span className="overlay-spacer" />
      </div>

      <div className="overlay-body">
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
      </div>
    </div>
  );
}
