import { useRef, useState } from "react";
import { FEEDBACK_FORM_URL } from "../config";
import { socket } from "../socket";
import { getNickname, saveNickname } from "../session";
import { invitedCode } from "../share";
import BallMark from "./BallMark";

interface Props {
  playerId: string;
  onEntered: (code: string) => void;
  onError: (msg: string) => void;
  onOpenTerms: () => void;
}

const CreateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const JoinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M18 9v5M15.5 11.5h5" />
  </svg>
);

const SoloIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5.5 19c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" />
  </svg>
);

export default function JoinScreen({ playerId, onEntered, onError, onOpenTerms }: Props) {
  const [nickname, setNickname] = useState(getNickname());
  const [code, setCode] = useState(invitedCode ?? "");
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [joinOpen, setJoinOpen] = useState(invitedCode !== null);
  const codeRef = useRef<HTMLInputElement>(null);

  const validNick = nickname.trim().length >= 2;
  const validCode = code.trim().length === 4;
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
    if (!validNick || !validCode || busy) return;
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

  // The JOIN card reveals the code field on first tap, then joins once a valid
  // code is present (or immediately when arriving via an invite link).
  const onJoinCard = () => {
    if (!validNick || busy) return;
    if (validCode) join();
    else {
      setJoinOpen(true);
      setTimeout(() => codeRef.current?.focus(), 0);
    }
  };

  const playSolo = () => {
    if (!validNick || busy) return;
    setBusy(true);
    saveNickname(nickname.trim());
    socket.emit("create", { nickname: nickname.trim(), playerId, solo: true }, (res) => {
      setBusy(false);
      if (res.ok) onEntered(res.data.code);
      else onError(res.error);
    });
  };

  return (
    <main className="join">
      <div className="join-inner">
        <div className="join-hero">
          <BallMark size={80} className="join-ball" />
          <h1 className="join-title">
            BALL<span className="join-title-hog">HOG</span>
          </h1>
          <p className="join-tag">
            THINK YOU KNOW BALL? <span className="join-tag-hi">PROVE IT.</span>
          </p>
        </div>

        {invited && (
          <div className="invite-banner">
            YOU'RE INVITED TO ROOM <strong>{invitedCode}</strong>. Drop a name and join.
          </div>
        )}

        <label className="field">
          <span className="field-label">YOUR NAME</span>
          <input
            className="input"
            value={nickname}
            maxLength={16}
            placeholder="e.g. LEBRON"
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (invited ? join() : create())}
            autoComplete="off"
            autoFocus={!validNick}
          />
        </label>

        <div className="card-grid">
          <button
            className="card-btn card-btn-primary"
            disabled={!validNick || busy}
            onClick={create}
          >
            <span className="card-btn-icon"><CreateIcon /></span>
            <span className="card-btn-label">CREATE ROOM</span>
          </button>

          <button
            className="card-btn"
            disabled={!validNick || busy}
            onClick={onJoinCard}
            aria-expanded={joinOpen}
          >
            <span className="card-btn-icon"><JoinIcon /></span>
            <span className="card-btn-label">JOIN ROOM</span>
          </button>

          <button
            className="card-btn"
            disabled={!validNick || busy}
            onClick={playSolo}
          >
            <span className="card-btn-icon"><SoloIcon /></span>
            <span className="card-btn-label">SINGLE PLAYER MODE</span>
          </button>
        </div>

        {joinOpen && (
          <div className="join-row">
            <input
              ref={codeRef}
              className="input input-code"
              value={code}
              maxLength={4}
              placeholder="CODE"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              autoComplete="off"
            />
            <button
              className="btn btn-go"
              disabled={!validNick || !validCode || busy}
              onClick={join}
            >
              GO
            </button>
          </div>
        )}

        <section className="howto">
          <button className="howto-toggle" onClick={() => setShowRules(!showRules)}>
            HOW IT WORKS {showRules ? "−" : "+"}
          </button>
          {showRules && (
            <ol className="howto-steps">
              <li>
                <strong>A face drops.</strong> Every player sees the same NBA player at the same
                instant. 20 seconds on the shot clock.
              </li>
              <li>
                <strong>Name him.</strong> Type fast. First correct answer takes the round. Wrong
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
      </div>

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
    </main>
  );
}
