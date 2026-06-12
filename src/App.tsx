import { useEffect, useState } from "react";
import type { RoomState } from "../shared/protocol";
import { socket, syncTime } from "./socket";
import { clearRoom, getNickname, getPlayerId, loadRoom, saveRoom } from "./session";
import { invitedCode } from "./share";
import JoinScreen from "./components/JoinScreen";
import Lobby from "./components/Lobby";
import GameView from "./components/GameView";
import WinScreen from "./components/WinScreen";

const playerId = getPlayerId();

export default function App() {
  const [state, setState] = useState<RoomState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [dropped, setDropped] = useState(false);

  useEffect(() => {
    const onState = (s: RoomState) => setState(s);
    const onError = (msg: string) => setToast(msg);
    const onDisconnect = () => setDropped(true);
    socket.on("state", onState);
    socket.on("error", onError);
    socket.on("disconnect", onDisconnect);

    // On every (re)connect: re-sync clocks, then silently retake our seat in
    // the last room if we have one — covers refresh and dropped connections.
    const onConnect = async () => {
      setDropped(false);
      await syncTime();
      // An invite link to a different room beats the saved session — the user
      // clicked it on purpose, so show the join screen instead of rejoining.
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

  // Page title tracks where you are — matters for tab-switchers and history.
  useEffect(() => {
    if (!inRoom) document.title = "Ballhog — name the hooper";
    else if (state.phase === "lobby") document.title = `Room ${state.code} · Ballhog`;
    else if (state.phase === "gameover") document.title = "Ballgame · Ballhog";
    else document.title = `Round ${state.roundNumber} · Ballhog`;
  }, [inRoom, state?.phase, state?.code, state?.roundNumber]);

  const handleEntered = (code: string) => saveRoom(code);
  const handleLeave = () => {
    socket.emit("leave");
    clearRoom();
    setState(null);
  };

  let screen;
  if (booting) {
    screen = <div className="boot">WARMING UP…</div>;
  } else if (!inRoom) {
    screen = <JoinScreen playerId={playerId} onEntered={handleEntered} onError={setToast} />;
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
        <span className="logo">
          BALL<span className="logo-accent">HOG</span>
        </span>
        {inRoom && state.phase !== "lobby" && (
          <span className="topbar-code">RM {state.code}</span>
        )}
      </header>
      {screen}
      {dropped && !booting && <div className="reconnect-banner">RECONNECTING…</div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
