import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchSongs, triggerRandom, listenRandomTrigger } from "./firebase";

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
          boxShadow: "0 2px 4px rgba(180,100,120,0.15), 0 8px 16px rgba(180,100,120,0.12), 0 20px 40px rgba(180,100,120,0.08)",
          border: "1px solid rgba(255,255,255,0.25)",
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

function IdleShell({ onStart, disabled }) {
  return (
    <div style={{ padding: "22px" }}>
      <div style={{ display: "flex", gap: "18px", alignItems: "center", minHeight: "160px" }}>
        <div
          style={{
            width: "148px",
            height: "148px",
            borderRadius: "24px",
            background: "linear-gradient(135deg,#ffd7e3,#ffb6c1)",
            boxShadow: "0 2px 4px rgba(180,100,120,0.15), 0 8px 16px rgba(180,100,120,0.12), 0 20px 40px rgba(180,100,120,0.08)",
            border: "1px solid rgba(255,255,255,0.25)",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ width: "64%", height: "39.6px", borderRadius: "999px", background: "#ffd4e2", marginBottom: "8px" }} />
          <div style={{ width: "42%", height: "26.4px", borderRadius: "999px", background: "#ffe3ea", marginBottom: "14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "90px", height: "26.4px", borderRadius: "999px", background: "#fff0f5", border: "1px solid rgba(255,182,193,0.35)" }} />
            </div>
            <button
              onClick={onStart}
              disabled={disabled}
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "10px 22px",
                background: "linear-gradient(135deg,#ffb6c1,#ff8fb1)",
                boxShadow: "0 10px 26px rgba(255,182,193,0.34)",
                color: "#ffffff",
                fontSize: "20.8px",
                fontWeight: 800,
                cursor: disabled ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              시작
            </button>
          </div>
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
  const [winner, setWinner] = useState(null);

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

  // 최신 곡 목록을 ref로 유지 (신호 감지 콜백에서 항상 최신 목록 참조)
  const sortedSongsRef = useRef(sortedSongs);
  useEffect(() => { sortedSongsRef.current = sortedSongs; }, [sortedSongs]);

  const runningRef = useRef(false);
  useEffect(() => { runningRef.current = running; }, [running]);

  // 실제 슬롯을 돌리는 함수 (신호를 받으면 실행됨)
  const runSlot = useCallback((song) => {
    if (!song) return;
    setWinner(song);
    setRunning(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(song);
      setRunning(false);
    }, 4000);
  }, []);

  // 버튼/키 입력 → 곡을 뽑아서 Firebase에 신호만 기록 (직접 안 돌림)
  const requestRandom = useCallback(() => {
    if (sortedSongs.length === 0 || running) return;
    const chosen = sortedSongs[Math.floor(Math.random() * sortedSongs.length)];
    triggerRandom(chosen.id);
  }, [running, sortedSongs]);

  // Firebase 신호 감시 → 신호 오면 양쪽 화면이 동시에 같은 곡으로 슬롯 돌림
  const lastNonceRef = useRef(null);
  useEffect(() => {
    const unsubscribe = listenRandomTrigger(({ songId, nonce }) => {
      if (lastNonceRef.current === nonce) return; // 같은 신호 중복 방지
      lastNonceRef.current = nonce;
      if (runningRef.current) return; // 이미 돌고 있으면 무시
      const list = sortedSongsRef.current;
      const song = list.find((s) => s.id === songId);
      if (song) runSlot(song);
    });
    return () => unsubscribe();
  }, [runSlot]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        requestRandom();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestRandom]);

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
      <style>{`
        @keyframes ssoyaContainerGlow {
          0% { box-shadow: 0 2px 4px rgba(180,100,120,0.15), 0 8px 16px rgba(180,100,120,0.12), 0 0 0px rgba(255,143,177,0); }
          30% { box-shadow: 0 0 40px 12px rgba(255,143,177,0.85), 0 0 80px 24px rgba(255,209,102,0.55); }
          100% { box-shadow: 0 2px 4px rgba(180,100,120,0.15), 0 8px 16px rgba(180,100,120,0.12), 0 20px 40px rgba(180,100,120,0.1); }
        }
        @keyframes ssoyaContainerBorder {
          0%, 100% { border-color: rgba(255,182,193,0.35); }
          25% { border-color: rgba(255,209,102,1); }
          50% { border-color: rgba(255,143,177,1); }
          75% { border-color: rgba(255,209,102,1); }
        }
      `}</style>
      <div
        style={{
          width: "min(100%, 600px)",
          minHeight: "190px",
          borderRadius: "24px",
          border: "2px solid rgba(255,182,193,0.35)",
          background: "rgba(255,240,245,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 2px 4px rgba(180,100,120,0.15), 0 8px 16px rgba(180,100,120,0.12), 0 20px 40px rgba(180,100,120,0.1), 0 0 0 1px rgba(255,255,255,0.15)",
          transform: "translateY(-4px)",
          overflow: "hidden",
          color: "#7a3652",
          animation: result ? "ssoyaContainerGlow 1.2s ease-out, ssoyaContainerBorder 1s ease-out" : "none",
        }}
      >
        {loading ? (
          <LoadingShell />
        ) : sortedSongs.length === 0 ? (
          <div style={{ minHeight: "190px", display: "flex", alignItems: "center", justifyContent: "center", color: "#c86b8a", fontSize: "16px", fontWeight: 700 }}>
            표시할 곡이 없어
          </div>
        ) : running ? (
          <RollingSlot songs={sortedSongs} winner={winner} />
        ) : result ? (
          <ResultCard song={result} onReroll={requestRandom} />
        ) : (
          <IdleShell onStart={requestRandom} disabled={sortedSongs.length === 0} />
        )}
      </div>
    </div>
  );
}

// 색종이 한 조각
function ConfettiPiece({ delay, left, color, rotate }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "-20px",
        left: `${left}%`,
        width: "10px",
        height: "14px",
        background: color,
        borderRadius: "2px",
        opacity: 0,
        animation: `ssoyaConfetti 1.4s ease-out ${delay}s forwards`,
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}

function ResultCard({ song, onReroll }) {
  const bg = song.albumCover ? `url(${song.albumCover}) center/cover no-repeat` : COVERS[hi(song.id)];

  // 색종이 조각들 (한 번만 생성)
  const confetti = useMemo(() => {
    const colors = ["#ff8fb1", "#ffd166", "#06d6a0", "#7c8cff", "#ff5c93", "#c78bff"];
    return Array.from({ length: 40 }, (_, i) => ({
      delay: Math.random() * 0.3,
      left: Math.random() * 100,
      color: colors[i % colors.length],
      rotate: Math.random() * 360,
    }));
  }, [song.id]);

  return (
    <div style={{ padding: "22px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes ssoyaConfetti {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(260px) rotate(540deg); }
        }
        @keyframes ssoyaPop {
          0% { transform: scale(1); }
          40% { transform: scale(1.08); }
          70% { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* 색종이 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
        {confetti.map((c, i) => (
          <ConfettiPiece key={i} {...c} />
        ))}
      </div>

      <div style={{ display: "flex", gap: "18px", alignItems: "center", minHeight: "160px", animation: "ssoyaPop 0.6s ease-out" }}>
        <div
          style={{
            width: "148px",
            height: "148px",
            borderRadius: "24px",
            background: bg,
            flexShrink: 0,
            boxShadow: "0 2px 4px rgba(180,100,120,0.15), 0 8px 16px rgba(180,100,120,0.12), 0 20px 40px rgba(180,100,120,0.08)",
            border: "1px solid rgba(255,255,255,0.25)",
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

// 한 칸(곡 하나)을 그리는 컴포넌트 — 릴 안에 세로로 쌓임
function ReelCell({ song, height }) {
  const bg = song?.albumCover ? `url(${song.albumCover}) center/cover no-repeat` : COVERS[hi(song?.id || "")];
  return (
    <div style={{ height: `${height}px`, display: "flex", gap: "18px", alignItems: "center", padding: "0 22px", boxSizing: "border-box" }}>
      <div
        style={{
          width: "148px",
          height: "148px",
          borderRadius: "24px",
          background: bg,
          flexShrink: 0,
          boxShadow: "0 2px 4px rgba(180,100,120,0.15), 0 8px 16px rgba(180,100,120,0.12), 0 20px 40px rgba(180,100,120,0.08)",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "33px", fontWeight: 900, lineHeight: 1.15, marginBottom: "8px", color: "#8f3659", wordBreak: "keep-all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song?.title}</div>
        <div style={{ fontSize: "22px", color: "#b05e7f", fontWeight: 700, wordBreak: "keep-all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song?.artist}</div>
      </div>
    </div>
  );
}

function RollingSlot({ songs, winner }) {
  const CELL_H = 190;       // 한 칸 높이
  const SPIN_COUNT = 11;    // 흐르는 칸 개수 (당첨 칸 전까지)
  const BUFFER = 4;         // 당첨 칸 뒤 여분 칸 (반동용)
  const [offset, setOffset] = useState(0);

  // 릴 시퀀스: 랜덤곡 SPIN_COUNT개 + 당첨곡 + 여분 랜덤곡 BUFFER개
  const reel = useMemo(() => {
    const arr = [];
    for (let i = 0; i < SPIN_COUNT; i++) {
      arr.push(songs[Math.floor(Math.random() * songs.length)]);
    }
    arr.push(winner || songs[0]); // 당첨 칸 (인덱스 = SPIN_COUNT)
    for (let i = 0; i < BUFFER; i++) {
      arr.push(songs[Math.floor(Math.random() * songs.length)]);
    }
    return arr;
  }, [songs, winner]);

  const finalOffset = SPIN_COUNT * CELL_H; // 당첨 칸까지의 거리

  useEffect(() => {
    let rafId;
    const startedAt = performance.now();
    const duration = 4000;
    const overshoot = CELL_H * 1.1; // 반동 크기 (당첨 칸을 1.1칸 지나침)
    const peakOffset = finalOffset + overshoot; // 가장 많이 지나친 지점

    // 릴 평균 속도(픽셀/ms). 넘어가는 구간을 이 속도에 맞춤
    const reelSpeed = peakOffset / duration;
    // 되돌아오는 데 쓸 시간 비율 (전체의 마지막 18%)
    const returnRatio = 0.18;
    const goEnd = 1 - returnRatio; // 넘어가기 끝나는 시점(비율)

    // 넘어가는 구간: 거의 일정 속도(약한 감속), peakOffset까지 도달
    const easeOutSine = (x) => Math.sin((x * Math.PI) / 2);

    const animate = (now) => {
      const elapsed = now - startedAt;
      const t = Math.min(elapsed / duration, 1);

      let pos;
      if (t <= goEnd) {
        // 1단계: peakOffset까지 일정 속도로 넘어감 (릴 속도 유지)
        const tt = t / goEnd; // 0→1
        pos = peakOffset * easeOutSine(tt);
      } else {
        // 2단계: peakOffset에서 finalOffset으로 부드럽게 되돌아옴
        const tt = (t - goEnd) / returnRatio; // 0→1
        const easeBack = 1 - Math.pow(1 - tt, 2); // 빠르게 시작해 천천히 안착
        pos = peakOffset - overshoot * easeBack;
      }

      setOffset(pos);
      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setOffset(finalOffset); // 정확히 당첨 칸에 고정
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [finalOffset]);

  return (
    <div style={{ height: `${CELL_H}px`, overflow: "hidden", position: "relative" }}>
      <div
        style={{
          transform: `translateY(${-offset}px)`,
          willChange: "transform",
        }}
      >
        {reel.map((song, i) => (
          <ReelCell key={i} song={song} height={CELL_H} />
        ))}
      </div>
    </div>
  );
}
