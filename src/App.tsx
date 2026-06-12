import { useEffect, useState } from "react";
import type { RoomState } from "../shared/protocol";
import { socket, syncTime } from "./socket";
import { clearRoom, getNickname, getPlayerId, loadRoom, saveRoom } from "./session";
import JoinScreen from "./components/JoinScreen";
import Lobby from "./components/Lobby";
import GameView from "./components/GameView";
import WinScreen from "./components/WinScreen";

const playerId = getPlayerId();

export default function App() {
  const [state, setState] = useState<RoomState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const onState = (s: RoomState) => setState(s);
    const onError = (msg: string) => setToast(msg);
    socket.on("state", onState);
    socket.on("error", onError);

    // On every (re)connect: re-sync clocks, then silently retake our seat in
    // the last room if we have one — covers refresh and dropped connections.
    const onConnect = async () => {
      await syncTime();
      const code = loadRoom();
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
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const me = state?.players.find((p) => p.id === playerId) ?? null;
  const inRoom = state !== null && me !== null;

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
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
