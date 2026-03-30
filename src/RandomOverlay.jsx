import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchSongs } from "./firebase";

const TAG_COLORS = {
  "신나요": { light: "#f59e0b", dark: "#fbbf24" },
  "슬퍼요": { light: "#3b82f6", dark: "#60a5fa" },
  "몽글몽글": { light: "#c084fc", dark: "#d8b4fe" },
  "최애곡❤️": { light: "#ec4899", dark: "#f472b6" },
  "HELL🔥": { light: "#ef4444", dark: "#f87171" },
  "연습중💦": { light: "#06b6d4", dark: "#22d3ee" },
  "발라드": { light: "#6366f1", dark: "#818cf8" },
  "락": { light: "#64748b", dark: "#94a3b8" },
  "힙합": { light: "#8b5cf6", dark: "#a78bfa" },
  "댄스": { light: "#10b981", dark: "#34d399" },
  "트로트": { light: "#eab308", dark: "#facc15" },
};

const COVERS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)",
  "linear-gradient(135deg,#f5576c,#ff9a9e)",
  "linear-gradient(135deg,#667eea,#43e97b)",
];

function hi(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h) % COVERS.length;
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
    if (!loading && sortedSongs.length > 0 && !result && !running) {
      startRandom();
    }
  }, [loading, sortedSongs, result, running, startRandom]);

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
          width: "min(100%, 560px)",
          borderRadius: "28px",
          background: "rgba(15,23,42,0.86)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 20px 70px rgba(0,0,0,0.45)",
          backdropFilter: "blur(14px)",
          padding: "24px",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#93c5fd", fontWeight: 700, marginBottom: "4px", letterSpacing: "0.04em" }}>SSOYA RANDOM OVERLAY</div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, lineHeight: 1.2 }}>랜덤 선곡</h1>
          </div>
          <button
            onClick={startRandom}
            disabled={loading || sortedSongs.length === 0 || running}
            style={{
              border: "none",
              borderRadius: "999px",
              padding: "12px 18px",
              background: running ? "rgba(148,163,184,0.5)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading || running ? "not-allowed" : "pointer",
              flexShrink: 0,
            }}
          >
            {running ? "돌리는 중..." : result ? "🔄 다시 뽑기" : "🎲 시작"}
          </button>
        </div>

        <div
          style={{
            minHeight: "180px",
            borderRadius: "22px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(2,6,23,0.72)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: "16px", fontWeight: 600 }}>
              ⏳ 곡 불러오는 중...
            </div>
          ) : sortedSongs.length === 0 ? (
            <div style={{ minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: "16px", fontWeight: 600 }}>
              곡이 없어서 랜덤 선곡을 할 수 없어
            </div>
          ) : running ? (
            <RollingSlot songs={sortedSongs} />
          ) : result ? (
            <ResultCard song={result} />
          ) : (
            <div style={{ minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: "16px", fontWeight: 600 }}>
              랜덤 선곡 준비 완료
            </div>
          )}
        </div>

        <div style={{ marginTop: "14px", fontSize: "12px", color: "#94a3b8", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <span>OBS 브라우저 소스에 이 경로를 그대로 넣으면 돼</span>
          <span>엔터 / 스페이스로 다시 뽑기 가능</span>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ song }) {
  const bg = song.albumCover ? `url(${song.albumCover}) center/cover no-repeat` : COVERS[hi(song.id)];

  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "center", padding: "20px", minHeight: "180px" }}>
      <div
        style={{
          width: "140px",
          height: "140px",
          borderRadius: "22px",
          background: bg,
          flexShrink: 0,
          boxShadow: "0 0 36px rgba(99,102,241,0.35)",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "31px", fontWeight: 900, lineHeight: 1.15, marginBottom: "8px", wordBreak: "keep-all" }}>{song.title}</div>
        <div style={{ fontSize: "21px", color: "#cbd5e1", fontWeight: 600, marginBottom: "14px", wordBreak: "keep-all" }}>{song.artist}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
          <span style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 700 }}>⭐ {song.starCount || 0}</span>
          {(song.tags || []).map((tag) => {
            const c = TAG_COLORS[tag]?.light || "#94a3b8";
            return (
              <span
                key={tag}
                style={{
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: `${c}22`,
                  color: c,
                  border: `1px solid ${c}44`,
                }}
              >
                {tag}
              </span>
            );
          })}
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
      setIdx((prev) => (prev + 1) % songs.length);
      if (progress < 1) {
        timeoutId = window.setTimeout(tick, 50 + Math.pow(progress, 2.5) * 600);
      }
    };

    timeoutId = window.setTimeout(tick, 50);
    return () => window.clearTimeout(timeoutId);
  }, [songs.length]);

  const song = songs[idx % songs.length];
  const bg = song?.albumCover ? `url(${song.albumCover}) center/cover no-repeat` : COVERS[hi(song?.id || "")];

  if (!song) return null;

  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "center", padding: "20px", minHeight: "180px" }}>
      <div style={{ width: "140px", height: "140px", borderRadius: "22px", background: bg, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "18px", color: "#60a5fa", fontWeight: 800, marginBottom: "8px" }}>🎰 랜덤 선곡 중...</div>
        <div style={{ fontSize: "31px", fontWeight: 900, lineHeight: 1.15, marginBottom: "8px", wordBreak: "keep-all" }}>{song.title}</div>
        <div style={{ fontSize: "21px", color: "#cbd5e1", fontWeight: 600, wordBreak: "keep-all" }}>{song.artist}</div>
      </div>
    </div>
  );
}
