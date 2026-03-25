import { useState, useEffect, useRef, useCallback } from "react";
import { fetchSongs, updateSong, adminLogin, adminLogout } from "./firebase";

const FILTER_TAGS = ["HELL", "연습곡", "신남", "슬픔"];
const ALL_TAGS = ["JPOP", "KPOP", "HELL", "연습곡", "신남", "슬픔"];
const ADMIN_EMAIL = "admin@ssoya.com";

const TAG_COLORS = {
  JPOP: { light: "#3b82f6", dark: "#60a5fa" },
  KPOP: { light: "#10b981", dark: "#34d399" },
  HELL: { light: "#ef4444", dark: "#f87171" },
  "연습곡": { light: "#22c55e", dark: "#4ade80" },
  "신남": { light: "#f59e0b", dark: "#fbbf24" },
  "슬픔": { light: "#6366f1", dark: "#818cf8" },
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

function hi(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h) % COVERS.length;
}

export default function SSOYA() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selTags, setSelTags] = useState([]);
  const [likeF, setLikeF] = useState(false);
  const [sortBy, setSortBy] = useState("stars");
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem("ssoya_view") || "list"; } catch { return "list"; }
  });
  const [likes, setLikes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ssoya_likes") || "{}"); } catch { return {}; }
  });
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("ssoya_theme") === "dark"; } catch { return false; }
  });
  const [showTop, setShowTop] = useState(false);
  const [slotModal, setSlotModal] = useState(false);
  const [slotResult, setSlotResult] = useState(null);
  const [slotRun, setSlotRun] = useState(false);
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(-1);
  const searchRef = useRef(null);
  const acRef = useRef(null);
  const sortR = useRef(null);

  // ─── 관리자 상태 ───
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [editCoverOpen, setEditCoverOpen] = useState(false);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef(null);

  useEffect(() => { fetchSongs().then((d) => { setSongs(d); setLoading(false); }); }, []);
  useEffect(() => { localStorage.setItem("ssoya_likes", JSON.stringify(likes)); }, [likes]);
  useEffect(() => { localStorage.setItem("ssoya_theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { localStorage.setItem("ssoya_view", viewMode); }, [viewMode]);
  useEffect(() => {
    const h = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  useEffect(() => {
    const h = (e) => {
      if (sortR.current && !sortR.current.contains(e.target)) setSortOpen(false);
      if (acRef.current && !acRef.current.contains(e.target) && searchRef.current && !searchRef.current.contains(e.target)) setAcOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleLike = (id) => setLikes((p) => ({ ...p, [id]: !p[id] }));
  const toggleTag = (tag) => setSelTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const acSuggestions = search.length >= 1
    ? songs.filter((s) => {
        const q = search.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const handleSearchChange = (val) => { setSearch(val); setAcOpen(val.length >= 1); setAcIndex(-1); };
  const handleAcSelect = (song) => { setSearch(song.title); setAcOpen(false); };
  const handleSearchKeyDown = (e) => {
    if (!acOpen || acSuggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAcIndex((p) => (p + 1) % acSuggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAcIndex((p) => (p - 1 + acSuggestions.length) % acSuggestions.length); }
    else if (e.key === "Enter" && acIndex >= 0) { e.preventDefault(); handleAcSelect(acSuggestions[acIndex]); }
    else if (e.key === "Escape") { setAcOpen(false); }
  };

  const filtered = songs.filter((s) => {
    const q = search.toLowerCase();
    const ms = !search || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    const mt = selTags.length === 0 || selTags.every((tag) => (s.tags || []).includes(tag));
    const ml = !likeF || likes[s.id];
    return ms && mt && ml;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title, "ko");
    if (sortBy === "artist") return a.artist.localeCompare(b.artist, "ko");
    return (b.starCount || 0) - (a.starCount || 0);
  });

  const startSlot = useCallback(() => {
    if (sorted.length === 0) return;
    setSlotRun(true); setSlotResult(null);
    const chosen = sorted[Math.floor(Math.random() * sorted.length)];
    setTimeout(() => { setSlotResult(chosen); setSlotRun(false); }, 2800);
  }, [sorted]);

  // ─── 관리자 함수 ───
  const handleLogoClick = () => {
    if (isAdmin) return;
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      setShowLoginModal(true);
    } else {
      logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 1500);
    }
  };

  const handleAdminLogin = async () => {
    if (!loginPw) return;
    setLoginLoading(true); setLoginErr("");
    try {
      await adminLogin(ADMIN_EMAIL, loginPw);
      setIsAdmin(true); setShowLoginModal(false); setLoginPw(""); setLoginErr("");
    } catch (e) {
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") setLoginErr("비밀번호가 틀렸어요");
      else if (e.code === "auth/too-many-requests") setLoginErr("잠시 후 다시 시도해주세요");
      else setLoginErr("로그인 실패");
    }
    setLoginLoading(false);
  };

  const handleAdminLogout = () => {
    adminLogout(); setIsAdmin(false); setEditingId(null); setEditData(null); setEditCoverOpen(false);
  };

  const startEdit = (song) => {
    setEditingId(song.id);
    setEditData({
      title: song.title,
      artist: song.artist,
      starCount: song.starCount || 0,
      tags: [...(song.tags || [])],
      albumCover: song.albumCover || "",
    });
    setEditCoverOpen(false);
  };

  const cancelEdit = () => { setEditingId(null); setEditData(null); setEditCoverOpen(false); };

  const saveEdit = async () => {
    if (!editData.title.trim()) return;
    const updated = {
      title: editData.title.trim(),
      artist: editData.artist.trim(),
      starCount: Number(editData.starCount) || 0,
      tags: editData.tags,
      albumCover: editData.albumCover,
    };
    await updateSong(editingId, updated);
    setSongs((prev) => prev.map((s) => s.id === editingId ? { ...s, ...updated } : s));
    setEditingId(null); setEditData(null); setEditCoverOpen(false);
  };

  const toggleEditTag = (tag) =>
    setEditData((p) => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag] }));

  const t = dark
    ? { bg: "#0f0f1a", card: "#1a1a2e", text: "#e2e8f0", sub: "#94a3b8", brd: "#2d2d44", acc: "#3b82f6", inBg: "#1a1a2e", inBrd: "#2d2d44", shd: "0 2px 12px rgba(0,0,0,0.4)", mod: "rgba(0,0,0,0.75)", acBg: "#1e1e32", acHover: "#252542" }
    : { bg: "#f1f5f9", card: "#ffffff", text: "#1e293b", sub: "#64748b", brd: "#e2e8f0", acc: "#3b82f6", inBg: "#f8fafc", inBrd: "#d1d5db", shd: "0 2px 12px rgba(0,0,0,0.08)", mod: "rgba(0,0,0,0.5)", acBg: "#ffffff", acHover: "#f1f5f9" };

  const sL = { default: "기본순", title: "제목순", artist: "가수순", stars: "부른횟수순" };

  const hlText = (text, query) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return <>{text.slice(0, idx)}<span style={{ color: t.acc, fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>;
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif", transition: "background .3s,color .3s" }}>

      {/* 로고 배너 — 빠르게 5번 클릭하면 관리자 모드 진입 */}
      <div style={{ width: "100%", background: dark ? "#0f0f1a" : "#f1f5f9" }}>
        <img
          src="/logo.png"
          alt="SSOYA"
          onClick={handleLogoClick}
          style={{ width: "100%", height: "auto", display: "block", maxWidth: "1200px", margin: "0 auto", userSelect: "none" }}
        />
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px" }}>

        {/* 다크모드 토글 + 관리자 배지 */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 0 0", gap: "8px", alignItems: "center" }}>
          {isAdmin && (
            <>
              <span style={{ fontSize: "12px", color: t.acc, fontWeight: 600, padding: "5px 11px", borderRadius: "20px", background: t.acc + "18", border: `1px solid ${t.acc}40` }}>
                ⚙️ 관리자 모드
              </span>
              <button
                onClick={handleAdminLogout}
                style={{ background: "#ef444418", color: "#ef4444", border: "1px solid #ef444430", borderRadius: "50px", padding: "5px 14px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
              >
                나가기
              </button>
            </>
          )}
          <button
            onClick={() => setDark(!dark)}
            style={{ background: dark ? "#fbbf24" : "#1e293b", color: dark ? "#1e293b" : "#f1f5f9", border: "none", borderRadius: "50px", padding: "7px 16px", fontSize: "13px", cursor: "pointer", fontWeight: 600, transition: "all .3s", display: "flex", alignItems: "center", gap: "5px" }}
          >
            {dark ? "☀️ 라이트" : "🌙 다크"}
          </button>
        </div>

        {/* 검색 + 자동완성 */}
        <div style={{ padding: "10px 0", position: "relative", zIndex: 150 }}>
          <div style={{ position: "relative" }} ref={searchRef}>
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", opacity: .45 }}>🔍</span>
            <input
              type="text"
              placeholder="제목 또는 아티스트 검색..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => { if (search.length >= 1) setAcOpen(true); }}
              onKeyDown={handleSearchKeyDown}
              style={{ width: "100%", padding: "11px 38px 11px 40px", borderRadius: acOpen && acSuggestions.length > 0 ? "12px 12px 0 0" : "12px", border: `1px solid ${acOpen && acSuggestions.length > 0 ? t.acc : t.inBrd}`, background: t.inBg, color: t.text, fontSize: "14px", outline: "none", transition: "border-radius 0.15s, border-color 0.15s" }}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setAcOpen(false); }}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: t.sub, cursor: "pointer", fontSize: "16px" }}
              >✕</button>
            )}
          </div>
          {acOpen && acSuggestions.length > 0 && (
            <div ref={acRef} style={{ position: "absolute", left: 0, right: 0, background: t.acBg, border: `1px solid ${t.acc}`, borderTop: "none", borderRadius: "0 0 12px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", maxHeight: "360px", overflowY: "auto", zIndex: 160 }}>
              {acSuggestions.map((song, i) => {
                const coverBg = song.albumCover ? `url(${song.albumCover}) center/cover no-repeat` : COVERS[hi(song.id)];
                return (
                  <div
                    key={song.id}
                    onClick={() => handleAcSelect(song)}
                    onMouseEnter={() => setAcIndex(i)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", transition: "background 0.1s", background: acIndex === i ? t.acHover : "transparent", borderBottom: i < acSuggestions.length - 1 ? `1px solid ${t.brd}` : "none" }}
                  >
                    <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: coverBg, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hlText(song.title, search)}</div>
                      <div style={{ fontSize: "12px", color: t.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hlText(song.artist, search)}</div>
                    </div>
                    <span style={{ fontSize: "11px", color: t.sub, flexShrink: 0 }}>⭐{song.starCount || 0}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 태그 필터 + 좋아요 필터 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", padding: "2px 0 10px", alignItems: "center" }}>
          {FILTER_TAGS.map((tag) => {
            const a = selTags.includes(tag); const c = TAG_COLORS[tag]?.[dark ? "dark" : "light"] || "#888";
            return <button key={tag} className="fb" onClick={() => toggleTag(tag)} style={{ padding: "5px 13px", borderRadius: "20px", border: `1.5px solid ${a ? c : t.brd}`, background: a ? c + "22" : "transparent", color: a ? c : t.sub, fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>{tag}</button>;
          })}
          <button className="fb" onClick={() => setLikeF(!likeF)} style={{ padding: "5px 13px", borderRadius: "20px", border: `1.5px solid ${likeF ? "#ef4444" : t.brd}`, background: likeF ? "rgba(239,68,68,.12)" : "transparent", color: likeF ? "#ef4444" : t.sub, fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>{likeF ? "❤️" : "🤍"} 좋아요</button>
        </div>

        {/* 곡 수 + 뷰전환 + 정렬 + 랜덤 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0 14px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: t.sub, fontWeight: 500 }}>총 {songs.length}곡 중 <strong style={{ color: t.acc }}>{sorted.length}</strong>곡</span>
          <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
            <button onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")} style={{ padding: "6px 12px", borderRadius: "10px", border: `1px solid ${t.brd}`, background: t.card, color: t.text, fontSize: "12.5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontWeight: 500 }}>{viewMode === "list" ? "▦ 카드 보기" : "☰ 목록 보기"}</button>
            <div ref={sortR} style={{ position: "relative" }}>
              <button onClick={() => setSortOpen(!sortOpen)} style={{ padding: "6px 13px", borderRadius: "10px", border: `1px solid ${t.brd}`, background: t.card, color: t.text, fontSize: "12.5px", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>{sL[sortBy]} <span style={{ fontSize: "9px" }}>▼</span></button>
              {sortOpen && (
                <div style={{ position: "absolute", top: "110%", right: 0, background: t.card, border: `1px solid ${t.brd}`, borderRadius: "10px", boxShadow: t.shd, zIndex: 100, overflow: "hidden", minWidth: "120px" }}>
                  {Object.entries(sL).map(([k, v]) => (
                    <button key={k} onClick={() => { setSortBy(k); setSortOpen(false); }} style={{ display: "block", width: "100%", padding: "9px 15px", border: "none", background: sortBy === k ? t.acc + "18" : "transparent", color: sortBy === k ? t.acc : t.text, fontSize: "12.5px", cursor: "pointer", textAlign: "left", fontWeight: sortBy === k ? 600 : 400 }}>{v}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setSlotModal(true); setSlotResult(null); setSlotRun(false); }} disabled={sorted.length === 0} style={{ padding: "6px 13px", borderRadius: "10px", background: sorted.length > 0 ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : t.brd, color: sorted.length > 0 ? "#fff" : t.sub, border: "none", fontSize: "12.5px", cursor: sorted.length > 0 ? "pointer" : "not-allowed", fontWeight: 600 }}>🎲 랜덤</button>
          </div>
        </div>

        {/* 노래 목록 */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: t.sub }}><div style={{ fontSize: "36px", marginBottom: "10px" }}>⏳</div><p>노래를 불러오는 중...</p></div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: t.sub }}><div style={{ fontSize: "42px", marginBottom: "10px" }}>🎵</div><p>{songs.length === 0 ? "등록된 노래가 없어요" : "조건에 맞는 노래가 없어요"}</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill,minmax(min(100%,280px),1fr))" : "1fr", gap: "10px", paddingBottom: "80px" }}>
            {sorted.map((s, i) => {
              const isEditing = editingId === s.id;
              const bg = s.albumCover ? `url(${s.albumCover}) center/cover no-repeat` : COVERS[hi(s.id)];
              const editBg = isEditing
                ? (editData.albumCover ? `url(${editData.albumCover}) center/cover no-repeat` : COVERS[hi(s.id)])
                : bg;

              return (
                <div
                  key={s.id}
                  className="sc"
                  style={{ background: t.card, borderRadius: "14px", overflow: "hidden", border: `1px solid ${isEditing ? t.acc : t.brd}`, boxShadow: isEditing ? `0 0 0 2px ${t.acc}30` : t.shd, animationDelay: `${Math.min(i, 20) * 0.02}s` }}
                >

                  {/* ─── 관리자 버튼 바 (관리자 모드일 때만 표시) ─── */}
                  {isAdmin && (
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "6px 10px", gap: "6px", borderBottom: `1px solid ${t.brd}`, background: isEditing ? t.acc + "0c" : "transparent" }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={cancelEdit}
                            style={{ padding: "4px 13px", borderRadius: "8px", border: `1px solid ${t.brd}`, background: "transparent", color: t.sub, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                          >✕ 취소</button>
                          <button
                            onClick={saveEdit}
                            style={{ padding: "4px 13px", borderRadius: "8px", border: "none", background: t.acc, color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                          >💾 저장</button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(s)}
                          style={{ padding: "4px 13px", borderRadius: "8px", border: `1px solid ${t.brd}`, background: "transparent", color: t.sub, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                        >✏️ 편집</button>
                      )}
                    </div>
                  )}

                  {/* ─── 편집 모드 ─── */}
                  {isEditing ? (
                    <div style={{ padding: "12px 14px" }}>

                      {/* 앨범커버 + 제목/아티스트 입력 */}
                      <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>

                        {/* 앨범커버 영역 */}
                        <div style={{ position: "relative", width: "82px", minWidth: "82px", height: "82px", background: editBg, borderRadius: "10px", flexShrink: 0, overflow: "hidden" }}>
                          {/* 삭제 버튼 — 커버 있을 때만 */}
                          {editData.albumCover && (
                            <button
                              onClick={() => { setEditData((p) => ({ ...p, albumCover: "" })); setEditCoverOpen(false); }}
                              title="커버 삭제"
                              style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", background: "rgba(239,68,68,0.85)", border: "none", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                            >✕</button>
                          )}
                          {/* 추가/변경 버튼 */}
                          <button
                            onClick={() => setEditCoverOpen((p) => !p)}
                            title="커버 URL 입력"
                            style={{ position: "absolute", bottom: "4px", right: "4px", width: "24px", height: "24px", borderRadius: "50%", background: "rgba(59,130,246,0.85)", border: "none", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                          >+</button>
                        </div>

                        {/* 제목 + 아티스트 입력 */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "7px" }}>
                          <input
                            value={editData.title}
                            onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
                            placeholder="제목"
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: `1.5px solid ${t.acc}`, background: t.inBg, color: t.text, fontSize: "14px", fontWeight: 700, outline: "none" }}
                          />
                          <input
                            value={editData.artist}
                            onChange={(e) => setEditData((p) => ({ ...p, artist: e.target.value }))}
                            placeholder="아티스트"
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: `1px solid ${t.inBrd}`, background: t.inBg, color: t.text, fontSize: "13px", outline: "none" }}
                          />
                        </div>
                      </div>

                      {/* 앨범커버 URL 입력창 (+ 버튼 클릭 시 토글) */}
                      {editCoverOpen && (
                        <div style={{ marginBottom: "10px" }}>
                          <input
                            value={editData.albumCover}
                            onChange={(e) => setEditData((p) => ({ ...p, albumCover: e.target.value }))}
                            placeholder="앨범커버 이미지 URL"
                            style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: `1px solid ${t.inBrd}`, background: t.inBg, color: t.text, fontSize: "12px", outline: "none" }}
                          />
                        </div>
                      )}

                      {/* 부른횟수 */}
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "12px", color: t.sub, fontWeight: 600 }}>⭐ 부른횟수</span>
                        <button
                          onClick={() => setEditData((p) => ({ ...p, starCount: Math.max(0, p.starCount - 1) }))}
                          style={{ width: "28px", height: "28px", borderRadius: "8px", border: `1px solid ${t.brd}`, background: t.inBg, color: t.text, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >−</button>
                        <input
                          type="number"
                          value={editData.starCount}
                          min="0"
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            setEditData((p) => ({ ...p, starCount: isNaN(n) || n < 0 ? 0 : n }));
                          }}
                          style={{ width: "60px", padding: "4px", borderRadius: "8px", border: `1px solid ${t.inBrd}`, background: t.inBg, color: t.text, fontSize: "15px", fontWeight: 700, textAlign: "center", outline: "none" }}
                        />
                        <button
                          onClick={() => setEditData((p) => ({ ...p, starCount: p.starCount + 1 }))}
                          style={{ width: "28px", height: "28px", borderRadius: "8px", border: `1px solid ${t.brd}`, background: t.inBg, color: t.text, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >+</button>
                      </div>

                      {/* 태그 선택 */}
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {ALL_TAGS.map((tag) => {
                          const active = editData.tags.includes(tag);
                          const c = TAG_COLORS[tag]?.[dark ? "dark" : "light"] || "#888";
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleEditTag(tag)}
                              style={{ padding: "3px 11px", borderRadius: "16px", border: `1.5px solid ${active ? c : t.brd}`, background: active ? c + "22" : "transparent", color: active ? c : t.sub, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                            >{active ? "✓ " : ""}{tag}</button>
                          );
                        })}
                      </div>
                    </div>

                  ) : (
                    // ─── 일반 보기 모드 ───
                    <div style={{ display: "flex", minHeight: "110px" }}>
                      <div style={{ position: "relative", width: "110px", minWidth: "110px", height: "110px", background: bg, flexShrink: 0 }}>
                        <button className="hb" onClick={() => toggleLike(s.id)} style={{ position: "absolute", top: "5px", left: "5px", background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "15px" }}>{likes[s.id] ? "❤️" : "🤍"}</button>
                      </div>
                      <div style={{ flex: 1, padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: "8px", minWidth: 0 }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "5px", minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.02em", lineHeight: 1.3 }}>{s.title}</div>
                          <div style={{ fontSize: "16.5px", color: t.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{ fontSize: "15px", color: t.sub, fontWeight: 600, whiteSpace: "nowrap" }}>⭐ {s.starCount || 0}</span>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {(s.tags || []).map((tag) => { const c = TAG_COLORS[tag]?.[dark ? "dark" : "light"] || "#888"; return <span key={tag} style={{ padding: "2px 9px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, background: c + "20", color: c }}>{tag}</span>; })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 맨 위로 버튼 */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ position: "fixed", bottom: "24px", right: "24px", width: "46px", height: "46px", borderRadius: "50%", background: t.acc, color: "#fff", border: "none", fontSize: "20px", cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,.3)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
        >↑</button>
      )}

      {/* 슬롯머신 모달 */}
      {slotModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !slotRun) setSlotModal(false); }}
          style={{ position: "fixed", inset: 0, background: t.mod, backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "20px" }}
        >
          <div style={{ background: t.card, borderRadius: "20px", padding: "28px 24px", maxWidth: "400px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.3)", border: `1px solid ${t.brd}` }}>
            <div style={{ height: "120px", overflow: "hidden", borderRadius: "14px", background: dark ? "#0f0f1a" : "#f1f5f9", marginBottom: "18px", border: `1px solid ${t.brd}` }}>
              {slotRun ? <Slot songs={sorted} t={t} /> : slotResult ? (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", height: "100%", animation: "slotReveal .5s ease" }}>
                  <div style={{ width: "90px", height: "90px", borderRadius: "12px", background: slotResult.albumCover ? `url(${slotResult.albumCover}) center/cover` : COVERS[hi(slotResult.id)], flexShrink: 0, animation: "glowPulse 1.5s ease infinite" }} />
                  <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "18px", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slotResult.title}</div>
                    <div style={{ fontSize: "15px", color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slotResult.artist}</div>
                    <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                      {(slotResult.tags || []).map((tag) => { const c = TAG_COLORS[tag]?.[dark ? "dark" : "light"] || "#888"; return <span key={tag} style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, background: c + "20", color: c }}>{tag}</span>; })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.sub, fontSize: "14px" }}>아래 버튼을 눌러 시작!</div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button onClick={startSlot} disabled={slotRun || sorted.length === 0} style={{ padding: "9px 22px", borderRadius: "12px", background: slotRun ? t.brd : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: slotRun ? t.sub : "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: slotRun ? "not-allowed" : "pointer" }}>{slotRun ? "돌리는 중..." : slotResult ? "🔄 다시 돌리기" : "🎲 돌리기"}</button>
              {!slotRun && <button onClick={() => setSlotModal(false)} style={{ padding: "9px 22px", borderRadius: "12px", background: "transparent", color: t.sub, border: `1px solid ${t.brd}`, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>닫기</button>}
            </div>
          </div>
        </div>
      )}

      {/* 관리자 로그인 모달 */}
      {showLoginModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setShowLoginModal(false); setLoginPw(""); setLoginErr(""); } }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "20px" }}
        >
          <div style={{ background: t.card, padding: "36px 28px", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxWidth: "320px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "42px", marginBottom: "10px" }}>🔐</div>
            <p style={{ fontSize: "14px", color: t.sub, marginBottom: "20px" }}>비밀번호를 입력해주세요</p>
            <input
              type="password"
              value={loginPw}
              placeholder="비밀번호"
              autoFocus
              onChange={(e) => { setLoginPw(e.target.value); setLoginErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdminLogin(); }}
              style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: `1.5px solid ${loginErr ? "#ef4444" : t.inBrd}`, background: t.inBg, color: t.text, fontSize: "15px", outline: "none", marginBottom: "10px" }}
            />
            {loginErr && <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "10px" }}>{loginErr}</p>}
            <button
              onClick={handleAdminLogin}
              disabled={loginLoading}
              style={{ width: "100%", padding: "12px", borderRadius: "12px", background: loginLoading ? "#94a3b8" : t.acc, color: "#fff", border: "none", fontSize: "15px", fontWeight: 600, cursor: loginLoading ? "not-allowed" : "pointer" }}
            >{loginLoading ? "확인 중..." : "로그인"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Slot({ songs, t }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    let to;
    const st = Date.now(), dur = 2600;
    const tick = () => {
      const p = Math.min((Date.now() - st) / dur, 1);
      setIdx((i) => (i + 1) % songs.length);
      if (p < 1) to = setTimeout(tick, 50 + Math.pow(p, 2.5) * 600);
    };
    to = setTimeout(tick, 50);
    return () => clearTimeout(to);
  }, [songs.length]);
  const s = songs[idx % songs.length];
  if (!s) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", height: "100%" }}>
      <div style={{ width: "90px", height: "90px", borderRadius: "12px", background: s.albumCover ? `url(${s.albumCover}) center/cover` : COVERS[hi(s.id)], flexShrink: 0 }} />
      <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: "18px", color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
        <div style={{ fontSize: "15px", color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.artist}</div>
      </div>
    </div>
  );
}
