import { useEffect, useState } from "react";
import type { RoomState } from "../shared/protocol";
import { socket, syncTime } from "./socket";
import { clearRoom, getNickname, getPlayerId, loadRoom, saveRoom } from "./session";
import { invitedCode } from "./share";
import JoinScreen from "./components/JoinScreen";
import Lobby from "./components/Lobby";
import GameView from "./components/GameView";
import WinScreen from "./components/WinScreen";
import HowToPlay from "./components/HowToPlay";
import About from "./components/About";
import Terms from "./components/Terms";
import Settings, { initDarkMode } from "./components/Settings";
import BallMark from "./components/BallMark";

const playerId = getPlayerId();

type Page = "howto" | "about" | "settings" | "terms" | null;

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);

const QuestionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

export default function App() {
  const [state, setState] = useState<RoomState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [dropped, setDropped] = useState(false);
  const [page, setPage] = useState<Page>(null);
  const [inviteMode, setInviteMode] = useState(invitedCode !== null);

  useEffect(() => { initDarkMode(); }, []);

  useEffect(() => {
    const onState = (s: RoomState) => setState(s);
    const onError = (msg: string) => setToast(msg);
    const onDisconnect = () => setDropped(true);
    socket.on("state", onState);
    socket.on("error", onError);
    socket.on("disconnect", onDisconnect);

    const onConnect = async () => {
      setDropped(false);
      await syncTime();
      const saved = loadRoom();
      const code = invitedCode && invitedCode !== saved ? null : saved;
      if (invitedCode && invitedCode !== saved) clearRoom();
      if (code) {
        socket.emit("join", { code, nickname: getNickname(), playerId }, (res) => {
          if (!res.ok) {
            clearRoom();
            setState(null);
          }
          setBooting(false);
        });
      } else {
        setBooting(false);
      }
    };
    socket.on("connect", onConnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off("state", onState);
      socket.off("error", onError);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const me = state?.players.find((p) => p.id === playerId) ?? null;
  const inRoom = state !== null && me !== null;

  useEffect(() => {
    if (!inRoom) document.title = "Ballhog: name the hooper";
    else if (state.phase === "lobby") document.title = `Room ${state.code} · Ballhog`;
    else if (state.phase === "gameover") document.title = "Ballgame · Ballhog";
    else document.title = `Round ${state.roundNumber} · Ballhog`;
  }, [inRoom, state?.phase, state?.code, state?.roundNumber]);

  const handleEntered = (code: string) => {
    saveRoom(code);
    setInviteMode(false);
  };
  const handleLeave = () => {
    socket.emit("leave");
    clearRoom();
    setState(null);
  };

  let screen;
  if (booting) {
    screen = (
      <div className="boot">
        <BallMark size={52} className="boot-mark" />
        <span className="boot-text">WARMING UP…</span>
      </div>
    );
  } else if (!inRoom) {
    screen = (
      <JoinScreen
        key={inviteMode ? "invite" : "default"}
        playerId={playerId}
        inviteMode={inviteMode}
        onEntered={handleEntered}
        onError={setToast}
        onOpenTerms={() => setPage("terms")}
      />
    );
  } else if (state.phase === "lobby" && state.isSolo) {
    screen = (
      <div className="boot">
        <BallMark size={52} className="boot-mark" />
        <span className="boot-text">TIP-OFF…</span>
      </div>
    );
  } else if (state.phase === "lobby") {
    screen = <Lobby state={state} meId={playerId} onLeave={handleLeave} />;
  } else if (state.phase === "gameover") {
    screen = <WinScreen state={state} meId={playerId} onLeave={handleLeave} />;
  } else {
    screen = <GameView state={state} meId={playerId} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          {inRoom || inviteMode ? (
            <button
              className="btn-icon topbar-home"
              onClick={inRoom ? handleLeave : () => setInviteMode(false)}
              aria-label="Home"
            >
              <HomeIcon />
            </button>
          ) : null}
          <span className="logo">
            <BallMark size={28} className="logo-mark" />
            <span className="logo-word">
              BALL<span className="logo-accent">HOG</span>
            </span>
          </span>
        </div>
        <nav className="topbar-right">
          <button
            className="navlink"
            onClick={() => setPage(page === "howto" ? null : "howto")}
            aria-label="How to play"
            aria-pressed={page === "howto"}
          >
            <span className="navlink-icon"><QuestionIcon /></span>
            <span className="navlink-text">RULES</span>
          </button>
          <button
            className="navlink"
            onClick={() => setPage(page === "about" ? null : "about")}
            aria-label="About"
            aria-pressed={page === "about"}
          >
            <span className="navlink-icon"><InfoIcon /></span>
            <span className="navlink-text">ABOUT</span>
          </button>
          <button
            className="navlink"
            onClick={() => setPage(page === "settings" ? null : "settings")}
            aria-label="Settings"
            aria-pressed={page === "settings"}
          >
            <span className="navlink-icon"><GearIcon /></span>
            <span className="navlink-text">SETTINGS</span>
          </button>
        </nav>
      </header>
      {screen}
      {page === "howto" && <HowToPlay onClose={() => setPage(null)} />}
      {page === "about" && <About onClose={() => setPage(null)} />}
      {page === "settings" && <Settings onClose={() => setPage(null)} />}
      {page === "terms" && <Terms onClose={() => setPage(null)} />}
      {dropped && !booting && <div className="reconnect-banner">RECONNECTING…</div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
