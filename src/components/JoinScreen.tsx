import { useState } from "react";
import { socket } from "../socket";
import { getNickname, saveNickname } from "../session";

interface Props {
  playerId: string;
  onEntered: (code: string) => void;
  onError: (msg: string) => void;
}

export default function JoinScreen({ playerId, onEntered, onError }: Props) {
  const [nickname, setNickname] = useState(getNickname());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const validNick = nickname.trim().length >= 2;

  const create = () => {
    if (!validNick || busy) return;
    setBusy(true);
    saveNickname(nickname.trim());
    socket.emit("create", { nickname: nickname.trim(), playerId }, (res) => {
      setBusy(false);
      if (res.ok) onEntered(res.data.code);
      else onError(res.error);
    });
  };

  const join = () => {
    if (!validNick || code.trim().length !== 4 || busy) return;
    setBusy(true);
    saveNickname(nickname.trim());
    socket.emit(
      "join",
      { code: code.trim().toUpperCase(), nickname: nickname.trim(), playerId },
      (res) => {
        setBusy(false);
        if (res.ok) onEntered(res.data.code);
        else onError(res.error);
      }
    );
  };

  return (
    <main className="join">
      <div className="join-hero">
        <h1 className="join-title">
          BALL<span className="logo-accent">HOG</span>
      </h1>
        <p className="join-tag">NAME THE HOOPER. FASTEST CORRECT BUCKET WINS. FIRST TO 5.</p>
      </div>

      <label className="field">
        <span className="field-label">YOUR NAME</span>
        <input
          className="input"
          value={nickname}
          maxLength={16}
          placeholder="e.g. SPIDA"
          onChange={(e) => setNickname(e.target.value)}
          autoComplete="off"
        />
      </label>

      <button className="btn btn-primary" disabled={!validNick || busy} onClick={create}>
        CREATE A ROOM
      </button>

      <div className="join-divider">
        <span>OR JOIN ONE</span>
      </div>

      <div className="join-row">
        <input
          className="input input-code"
          value={code}
          maxLength={4}
          placeholder="CODE"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
          autoComplete="off"
        />
        <button
          className="btn btn-secondary"
          disabled={!validNick || code.trim().length !== 4 || busy}
          onClick={join}
        >
          JOIN
        </button>
      </div>
    </main>
  );
}
