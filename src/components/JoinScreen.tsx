import { useState } from "react";
import { socket } from "../socket";
import { getNickname, saveNickname } from "../session";
import { invitedCode } from "../share";

interface Props {
  playerId: string;
  onEntered: (code: string) => void;
  onError: (msg: string) => void;
}

export default function JoinScreen({ playerId, onEntered, onError }: Props) {
  const [nickname, setNickname] = useState(getNickname());
  const [code, setCode] = useState(invitedCode ?? "");
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const validNick = nickname.trim().length >= 2;
  const invited = invitedCode !== null && code === invitedCode;

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

      {invited && (
        <div className="invite-banner">
          YOU'RE INVITED TO ROOM <strong>{invitedCode}</strong> — drop a name and join
        </div>
      )}

      <label className="field">
        <span className="field-label">YOUR NAME</span>
        <input
          className="input"
          value={nickname}
          maxLength={16}
          placeholder="e.g. SPIDA"
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (invited ? join() : create())}
          autoComplete="off"
          autoFocus={!validNick}
        />
      </label>

      {invited ? (
        <>
          <button className="btn btn-go" disabled={!validNick || busy} onClick={join}>
            JOIN ROOM {invitedCode}
          </button>
          <div className="join-divider">
            <span>OR START YOUR OWN</span>
          </div>
          <button className="btn btn-ghost" disabled={!validNick || busy} onClick={create}>
            CREATE A ROOM
          </button>
        </>
      ) : (
        <>
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
        </>
      )}

      <section className="howto">
        <button className="howto-toggle" onClick={() => setShowRules(!showRules)}>
          HOW IT WORKS {showRules ? "−" : "+"}
        </button>
        {showRules && (
          <ol className="howto-steps">
            <li>
              <strong>A face drops.</strong> Every player sees the same NBA player at the same
              instant — 20 seconds on the shot clock.
            </li>
            <li>
              <strong>Name him.</strong> Type fast — first correct answer takes the round. Wrong
              guesses lock you out. Not sure? Skip it.
            </li>
            <li>
              <strong>First to 5 wins.</strong> Your knowledge rating moves every round: deep cuts
              earn more, easy misses cost you. Climb from CASUAL to SAVANT.
            </li>
            <li>
              <strong>Solo?</strong> Five rounds, one rating. Prove you watch more than highlights.
            </li>
          </ol>
        )}
      </section>

      <footer className="join-footer">
        <span>3,000+ hoopers · 1990–2026 eras</span>
        <span className="join-footer-dot">·</span>
        <span>no login, no app, just hoops</span>
      </footer>
    </main>
  );
}
