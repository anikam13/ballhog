import { useRef, useState } from "react";
import type { DecadeMode } from "../../shared/protocol";
import { socket } from "../socket";
import { getNickname, saveNickname } from "../session";
import { invitedCode, sharedRating } from "../share";
import BallMark from "./BallMark";
import DecadeCycle from "./DecadeCycle";

interface Props {
  playerId: string;
  inviteMode: boolean;
  onEntered: (code: string) => void;
  onError: (msg: string) => void;
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

export default function JoinScreen({ playerId, inviteMode, onEntered, onError }: Props) {
  const [nickname, setNickname] = useState(getNickname());
  const [code, setCode] = useState(inviteMode ? (invitedCode ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [joinOpen, setJoinOpen] = useState(inviteMode);
  const [soloOpen, setSoloOpen] = useState(false);
  const [soloDecadeMode, setSoloDecadeMode] = useState<DecadeMode>("all");
  const [nickError, setNickError] = useState(false);
  const [nickShake, setNickShake] = useState(false);
  const nickRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validNick = nickname.trim().length >= 2;
  const validCode = code.trim().length === 4;
  const invited = inviteMode && invitedCode !== null && code === invitedCode;

  /** Focus the name field and surface a clear requirement when nick is missing. */
  const requireNick = (): boolean => {
    if (validNick) {
      setNickError(false);
      return true;
    }
    setNickError(true);
    setNickShake(false);
    // Retrigger shake even on repeated clicks.
    requestAnimationFrame(() => setNickShake(true));
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setNickShake(false), 400);
    nickRef.current?.focus();
    return false;
  };

  const onNicknameChange = (value: string) => {
    setNickname(value);
    if (value.trim().length >= 2) setNickError(false);
  };

  const create = () => {
    if (busy || !requireNick()) return;
    setJoinOpen(false);
    setSoloOpen(false);
    setBusy(true);
    saveNickname(nickname.trim());
    socket.emit("create", { nickname: nickname.trim(), playerId }, (res) => {
      setBusy(false);
      if (res.ok) onEntered(res.data.code);
      else onError(res.error);
    });
  };

  const join = () => {
    if (busy || !requireNick()) return;
    if (!validCode) {
      codeRef.current?.focus();
      return;
    }
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
    if (busy || !requireNick()) return;
    setSoloOpen(false);
    if (validCode) join();
    else {
      setJoinOpen(true);
      setTimeout(() => codeRef.current?.focus(), 0);
    }
  };

  // The SOLO card reveals era options; GO starts the game.
  const onSoloCard = () => {
    if (busy || !requireNick()) return;
    setJoinOpen(false);
    setSoloOpen(true);
  };

  const playSolo = () => {
    if (busy || !requireNick()) return;
    setBusy(true);
    saveNickname(nickname.trim());
    socket.emit("create", { nickname: nickname.trim(), playerId, solo: true, decadeMode: soloDecadeMode }, (res) => {
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
            SEE THE FACE. <span className="join-tag-hi">NAME THE PLAYER.</span>
          </p>
          <p className="join-sub">Free in your browser. No app, no account.</p>
        </div>

        {invited && (
          <div className="invite-banner">
            YOU'RE INVITED TO ROOM <strong>{invitedCode}</strong>. Drop a name and join.
          </div>
        )}

        {sharedRating && (
          <div className="invite-banner">
            A friend rated <strong>{sharedRating.tier}</strong> ({sharedRating.score}/1000). Think you
            can top it?
          </div>
        )}

        <label className={`field${nickShake ? " field-shake" : ""}`}>
          <span className="field-label">YOUR NAME</span>
          <input
            ref={nickRef}
            className={`input${nickError ? " input-nick-error" : ""}`}
            value={nickname}
            maxLength={16}
            placeholder="e.g. LEBRON"
            onChange={(e) => onNicknameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (inviteMode ? join() : create())}
            autoComplete="off"
            autoFocus={!validNick}
            aria-invalid={nickError}
            aria-describedby={nickError ? "nick-error" : undefined}
          />
          {nickError && (
            <p id="nick-error" className="field-error" role="alert">
              Enter a name to play
            </p>
          )}
        </label>

        {inviteMode ? (
          <div className="join-invite">
            <div className="card-btn join-invite-card" aria-hidden="true">
              <span className="card-btn-icon"><JoinIcon /></span>
              <span className="card-btn-label">JOIN ROOM</span>
            </div>
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
                disabled={busy || (validNick && !validCode)}
                onClick={join}
              >
                GO
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card-grid">
              <div className="solo-col">
                <button
                  className={`card-btn${!joinOpen || soloOpen ? " card-btn-primary" : ""}`}
                  disabled={busy}
                  onClick={onSoloCard}
                  aria-expanded={soloOpen}
                >
                  <span className="card-btn-icon"><SoloIcon /></span>
                  <span className="card-btn-label">PLAY SOLO</span>
                </button>

                {soloOpen && (
                  <section className="join-decade" aria-label="Solo decade mode">
                    <DecadeCycle
                      value={soloDecadeMode}
                      onChange={setSoloDecadeMode}
                    />
                    <button
                      type="button"
                      className="btn btn-go join-solo-go"
                      disabled={busy}
                      onClick={playSolo}
                      aria-label="Start solo game"
                    >
                      START
                    </button>
                  </section>
                )}
              </div>

              <button
                className="card-btn"
                disabled={busy}
                onClick={create}
              >
                <span className="card-btn-icon"><CreateIcon /></span>
                <span className="card-btn-label">CREATE ROOM</span>
              </button>

              <button
                className={`card-btn${joinOpen ? " card-btn-primary" : ""}`}
                disabled={busy}
                onClick={onJoinCard}
                aria-expanded={joinOpen}
              >
                <span className="card-btn-icon"><JoinIcon /></span>
                <span className="card-btn-label">JOIN ROOM</span>
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
                  disabled={busy || (validNick && !validCode)}
                  onClick={join}
                >
                  GO
                </button>
              </div>
            )}
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
                instant. 20 seconds on the shot clock.
              </li>
              <li>
                <strong>Name the player.</strong> Type fast. First correct answer takes the round.
                Wrong guesses lock you out. Not sure? Skip it.
              </li>
              <li>
                <strong>First to X correct guesses wins.</strong> Host picks 3–10. Your knowledge
                rating moves every round: deep cuts earn more, easy misses cost you. Climb from
                CASUAL to SAVANT.
              </li>
              <li>
                <strong>Solo?</strong> Ten rounds, one rating. Prove you watch more than highlights.
              </li>
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
