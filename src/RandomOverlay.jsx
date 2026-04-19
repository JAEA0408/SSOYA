import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchSongs } from "./firebase";

const TAG_COLORS = {
  "신나요": { light: "#ff8fb2" },
  "슬퍼요": { light: "#7c8cff" },
  "몽글몽글": { light: "#c78bff" },
  "최애곡❤️": { light: "#ff5c93" },
  "HELL🔥": { light: "#ff6b81" },
  "연습중💦": { light: "#59c6ff" },
  "발라드": { light: "#8e7dff" },
  "락": { light: "#7f879a" },
  "힙합": { light: "#9d6bff" },
  "댄스": { light: "#30c99a" },
  "트로트": { light: "#f0a63a" },
};

const COVERS = [
  "linear-gradient(135deg,#ffd1dc,#ffb6c1)",
  "linear-gradient(135deg,#ffc0cb,#ff9bb0)",
  "linear-gradient(135deg,#ffd6e0,#ffb6c1)",
  "linear-gradient(135deg,#ffbfd4,#ffa3bc)",
  "linear-gradient(135deg,#ffe0ea,#ffb6c1)",
  "linear-gradient(135deg,#ffc8d8,#ff91af)",
  "linear-gradient(135deg,#ffe4ef,#ffb6c1)",
  "linear-gradient(135deg,#ffd7e5,#ffabc0)",
  "linear-gradient(135deg,#ffd0df,#ff8fad)",
  "linear-gradient(135deg,#ffe7f0,#ffb6c1)",
];

function hi(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h) % COVERS.length;
}

function LoadingShell() {
  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "center", padding: "22px", minHeight: "190px" }}>
      <div
        style={{
          width: "148px",
          height: "148px",
          borderRadius: "24px",
          background: "linear-gradient(135deg,#ffe3ec,#ffc9d8)",
          flexShrink: 0,
          opacity: 0.8,
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ width: "68%", height: "28px", borderRadius: "999px", background: "#ffd7e3", marginBottom: "12px", opacity: 0.9 }} />
        <div style={{ width: "46%", height: "20px", borderRadius: "999px", background: "#ffe5ec", marginBottom: "18px", opacity: 0.9 }} />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ width: "84px", height: "28px", borderRadius: "999px", background: "#ffe0ea" }} />
          <div style={{ width: "74px", height: "28px", borderRadius: "999px", background: "#ffe0ea" }} />
          <div style={{ width: "96px", height: "28px", borderRadius: "999px", background: "#ffe0ea" }} />
        </div>
      </div>
    </div>
  );
}

function IdleShell() {
  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "center", padding: "22px", minHeight: "190px" }}>
      <div
        style={{
          width: "148px",
          height: "148px",
          borderRadius: "24px",
          background: "linear-gradient(135deg,#ffd7e3,#ffb6c1)",
          boxShadow: "0 12px 30px rgba(255,182,193,0.34)",
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ width: "64%", height: "30px", borderRadius: "999px", background: "#ffd4e2", marginBottom: "12px" }} />
        <div style={{ width: "42%", height: "21px", borderRadius: "999px", background: "#ffe3ea", marginBottom: "18px" }} />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ width: "90px", height: "30px", borderRadius: "999px", background: "#fff0f5", border: "1px solid rgba(255,182,193,0.35)" }} />
          <div style={{ width: "82px", height: "30px", borderRadius: "999px", background: "#fff0f5", border: "1px solid rgba(255,182,193,0.35)" }} />
        </div>
      </div>
    </div>
  );
}

export default function RandomOverlay() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const prevBodyBg = document.body.style.background;
    const prevBodyMargin = document.body.style.margin;
    document.body.style.background = "transparent";
    document.body.style.margin = "0";

    return () => {
      document.body.style.background = prevBodyBg;
      document.body.style.margin = prevBodyMargin;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchSongs().then((data) => {
      if (!mounted) return;
      setSongs(data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const sortedSongs = useMemo(
    () => [...songs].sort((a, b) => (b.starCount || 0) - (a.starCount || 0)),
    [songs]
  );

  const startRandom = useCallback(() => {
    if (sortedSongs.length === 0 || running) return;
    setRunning(true);
    setResult(null);
    const chosen = sortedSongs[Math.floor(Math.random() * sortedSongs.length)];
    window.setTimeout(() => {
      setResult(chosen);
      setRunning(false);
    }, 2800);
  }, [running, sortedSongs]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        startRandom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startRandom]);

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif",
      }}
    >
      <div
        style={{
          width: "min(100%, 600px)",
          minHeight: "190px",
          borderRadius: "24px",
          border: "1px solid rgba(255,182,193,0.36)",
          background: "rgba(255,247,250,0.94)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 24px 70px rgba(255,182,193,0.28)",
          overflow: "hidden",
          color: "#7a3652",
        }}
      >
        {loading ? (
          <LoadingShell />
        ) : sortedSongs.length === 0 ? (
          <div style={{ minHeight: "190px", display: "flex", alignItems: "center", justifyContent: "center", color: "#c86b8a", fontSize: "16px", fontWeight: 700 }}>
            표시할 곡이 없어
          </div>
        ) : running ? (
          <RollingSlot songs={sortedSongs} />
        ) : result ? (
          <ResultCard song={result} onReroll={startRandom} />
        ) : (
          <div>
            <IdleShell />
            <div style={{ display: "flex", justifyContent: "center", padding: "0 22px 18px" }}>
              <button
                onClick={startRandom}
                disabled={sortedSongs.length === 0}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "12px 28px",
                  background: "linear-gradient(135deg,#ffb6c1,#ff8fb1)",
                  boxShadow: "0 10px 26px rgba(255,182,193,0.34)",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 800,
                  cursor: sortedSongs.length === 0 ? "not-allowed" : "pointer",
                  minWidth: "120px",
                }}
              >
                시작
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ song, onReroll }) {
  const bg = song.albumCover ? `url(${song.albumCover}) center/cover no-repeat` : COVERS[hi(song.id)];

  return (
    <div style={{ padding: "22px" }}>
      <div style={{ display: "flex", gap: "18px", alignItems: "center", minHeight: "160px" }}>
        <div
          style={{
            width: "148px",
            height: "148px",
            borderRadius: "24px",
            background: bg,
            flexShrink: 0,
            boxShadow: "0 14px 34px rgba(255,182,193,0.34)",
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "39.6px", fontWeight: 900, lineHeight: 1.15, marginBottom: "8px", color: "#8f3659", wordBreak: "keep-all" }}>{song.title}</div>
          <div style={{ fontSize: "26.4px", color: "#b05e7f", fontWeight: 700, marginBottom: "14px", wordBreak: "keep-all" }}>{song.artist}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "26.4px", color: "#c86b8a", fontWeight: 800 }}>⭐ {song.starCount || 0}</span>
              {(song.tags || []).map((tag) => {
                const c = TAG_COLORS[tag]?.light || "#c86b8a";
                return (
                  <span
                    key={tag}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 800,
                      background: `${c}16`,
                      color: c,
                      border: `1px solid ${c}33`,
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
            <button
              onClick={onReroll}
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "10px 22px",
                background: "linear-gradient(135deg,#ffb6c1,#ff8fb1)",
                boxShadow: "0 10px 26px rgba(255,182,193,0.34)",
                color: "#ffffff",
                fontSize: "20.8px",
                fontWeight: 800,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              다시뽑기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RollingSlot({ songs }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let timeoutId;
    const startedAt = Date.now();
    const duration = 2600;

    const tick = () => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      setIdx(Math.floor(Math.random() * songs.length));
      if (progress < 1) {
        timeoutId = window.setTimeout(tick, 100 + Math.pow(progress, 2.5) * 1200);
      }
    };

    timeoutId = window.setTimeout(tick, 50);
    return () => window.clearTimeout(timeoutId);
  }, [songs.length]);

  const song = songs[idx % songs.length];
  const bg = song?.albumCover ? `url(${song.albumCover}) center/cover no-repeat` : COVERS[hi(song?.id || "")];

  if (!song) return null;

  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "center", padding: "22px", minHeight: "190px" }}>
      <div
        style={{
          width: "148px",
          height: "148px",
          borderRadius: "24px",
          background: bg,
          flexShrink: 0,
          boxShadow: "0 14px 34px rgba(255,182,193,0.34)",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "33px", fontWeight: 900, lineHeight: 1.15, marginBottom: "8px", color: "#8f3659", wordBreak: "keep-all" }}>{song.title}</div>
        <div style={{ fontSize: "22px", color: "#b05e7f", fontWeight: 700, wordBreak: "keep-all" }}>{song.artist}</div>
      </div>
    </div>
  );
}
