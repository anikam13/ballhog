import { useState } from "react";
import Overlay from "./Overlay";

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
    </Overlay>
  );
}
