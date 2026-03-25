// SSOYA 관리자 페이지

import { useState, useEffect, useRef } from "react";
import { fetchSongs, addSong, updateSong, deleteSong, setAllSongs, setSong, adminLogin, adminLogout } from "./firebase";
import * as XLSX from "xlsx";

const ADMIN_EMAIL = "admin@ssoya.com";
const ALL_TAGS = ["JPOP", "KPOP", "HELL", "연습곡", "신남", "슬픔"];
const TAG_COLORS = {
  JPOP: "#3b82f6", KPOP: "#10b981", HELL: "#ef4444",
  "연습곡": "#22c55e", "신남": "#f59e0b", "슬픔": "#6366f1",
};

async function searchCover(title, artist) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const r = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=5`);
    const d = await r.json();
    return (d.results || []).map((r) => ({
      name: `${r.trackName} - ${r.artistName}`,
      cover: r.artworkUrl100?.replace("100x100", "600x600") || r.artworkUrl100,
      small: r.artworkUrl100,
    }));
  } catch { return []; }
}

// iTunes API에서 첫 번째 결과의 커버만 가져오기
async function fetchFirstCover(title, artist) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const r = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=1`);
    const d = await r.json();
    if (d.results && d.results.length > 0) {
      return d.results[0].artworkUrl100?.replace("100x100", "600x600") || null;
    }
    return null;
  } catch { return null; }
}

// 딜레이 함수 (API 속도 제한 방지)
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async () => {
    if (!pw) return;
    setLoginLoading(true);
    setLoginErr("");
    try {
      await adminLogin(ADMIN_EMAIL, pw);
      setAuthed(true);
    } catch (e) {
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") {
        setLoginErr("비밀번호가 틀렸어요");
      } else if (e.code === "auth/too-many-requests") {
        setLoginErr("로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요");
      } else {
        setLoginErr("로그인 실패: " + e.message);
      }
    }
    setLoginLoading(false);
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif" }}>
        <div style={{ background: "#fff", padding: "40px 32px", borderRadius: "20px", boxShadow: "0 8px 30px rgba(0,0,0,0.08)", maxWidth: "360px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px", color: "#1e293b" }}>SSOYA 관리자</h1>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>비밀번호를 입력해주세요</p>
          <input type="password" placeholder="비밀번호" value={pw}
            onChange={(e) => { setPw(e.target.value); setLoginErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${loginErr ? "#ef4444" : "#d1d5db"}`, fontSize: "15px", outline: "none", marginBottom: "12px" }} />
          {loginErr && <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>{loginErr}</p>}
          <button onClick={handleLogin} disabled={loginLoading}
            style={{ width: "100%", padding: "12px", borderRadius: "12px", background: loginLoading ? "#94a3b8" : "#3b82f6", color: "#fff", border: "none", fontSize: "15px", fontWeight: 600, cursor: loginLoading ? "not-allowed" : "pointer" }}>
            {loginLoading ? "로그인 중..." : "로그인"}
          </button>
        </div>
      </div>
    );
  }
  return <AdminPanel onLogout={() => { adminLogout(); setAuthed(false); }} />;
}

function AdminPanel({ onLogout }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("list");
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

  // 앨범커버 일괄 검색 상태
  const [coverProgress, setCoverProgress] = useState(null); // { current, total, found, skipped, currentTitle }
  const stopCoverRef = useRef(false); // 중지 플래그

  const load = async () => {
    setLoading(true);
    const data = await fetchSongs();
    setSongs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`"${title}" 을(를) 정말 삭제할까요?`)) return;
    await deleteSong(id);
    showMsg(`"${title}" 삭제 완료`);
    load();
  };

  const handleExport = () => {
    const obj = {};
    songs.forEach((s) => { const { id, ...rest } = s; obj[id] = rest; });
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ssoya_backup.json"; a.click();
    URL.revokeObjectURL(url);
    showMsg("JSON 내보내기 완료");
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!confirm(`${Object.keys(data).length}곡을 가져올까요? (기존 데이터에 덮어씁니다)`)) return;
        await setAllSongs(data);
        showMsg("JSON 가져오기 완료!");
        load();
      } catch { showMsg("JSON 파일 형식이 잘못됐어요", "error"); }
    };
    input.click();
  };

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".csv,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const header = rows[0];
        const dataRows = rows.slice(1).filter((r) => r[0]);

        const titleIdx = header.findIndex((h) => /title|제목/i.test(String(h)));
        const artistIdx = header.findIndex((h) => /artist|아티스트|가수/i.test(String(h)));
        const countIdx = header.findIndex((h) => /count|횟수|부른/i.test(String(h)));
        const tagIdx = header.findIndex((h) => /tag|태그/i.test(String(h)));
        const coverIdx = header.findIndex((h) => /cover|커버|앨범/i.test(String(h)));

        if (titleIdx === -1 || artistIdx === -1) {
          showMsg("title(제목)과 artist(아티스트) 열이 필요해요", "error");
          return;
        }

        const songCount = dataRows.length;
        if (!confirm(`${songCount}곡을 가져올까요? (기존 데이터에 추가됩니다)`)) return;

        setImportProgress({ total: songCount });

        const allSongs = {};
        const existing = await fetchSongs();
        existing.forEach((s) => { const { id, ...rest } = s; allSongs[id] = rest; });

        dataRows.forEach((row, i) => {
          const title = String(row[titleIdx] || "").trim();
          const artist = String(row[artistIdx] || "").trim();
          if (!title || !artist) return;

          const starCount = countIdx !== -1 ? (Number(row[countIdx]) || 0) : 0;
          const tagStr = tagIdx !== -1 ? String(row[tagIdx] || "") : "";
          const tags = tagStr ? tagStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
          const albumCover = coverIdx !== -1 ? String(row[coverIdx] || "") : "";

          const key = `csv_${String(i + 1).padStart(4, "0")}`;
          allSongs[key] = { title, artist, albumCover, tags, starCount };
        });

        await setAllSongs(allSongs);
        setImportProgress(null);
        showMsg(`${songCount}곡 가져오기 완료!`);
        load();
      } catch (err) {
        console.error(err);
        setImportProgress(null);
        showMsg("파일을 읽는 중 오류가 발생했어요", "error");
      }
    };
    input.click();
  };

  const handleDeleteAll = async () => {
    if (!confirm(`정말 모든 노래(${songs.length}곡)를 삭제할까요? 되돌릴 수 없어요!`)) return;
    if (!confirm("정말정말 확실해요?")) return;
    await setAllSongs(null);
    showMsg("전체 삭제 완료");
    load();
  };

  // ─── 앨범커버 일괄 자동매칭 ───
  const handleBulkCover = async () => {
    // 커버가 없는 곡만 필터
    const noCover = songs.filter((s) => !s.albumCover);
    if (noCover.length === 0) {
      showMsg("모든 곡에 이미 앨범커버가 있어요!");
      return;
    }

    if (!confirm(`앨범커버가 없는 ${noCover.length}곡을 iTunes에서 자동 검색할까요?\n약 ${Math.ceil(noCover.length * 0.35 / 60)}분 정도 걸려요.`)) return;

    stopCoverRef.current = false;
    let found = 0;
    let skipped = 0;

    // 50곡 단위로 모아서 DB에 저장 (효율적)
    let batch = {};
    let batchCount = 0;

    for (let i = 0; i < noCover.length; i++) {
      // 중지 버튼 눌렀으면 멈추기
      if (stopCoverRef.current) {
        // 남은 배치 저장
        if (batchCount > 0) {
          for (const [id, cover] of Object.entries(batch)) {
            await updateSong(id, { albumCover: cover });
          }
        }
        break;
      }

      const song = noCover[i];
      setCoverProgress({ current: i + 1, total: noCover.length, found, skipped, currentTitle: song.title });

      const cover = await fetchFirstCover(song.title, song.artist);

      if (cover) {
        batch[song.id] = cover;
        batchCount++;
        found++;
      } else {
        skipped++;
      }

      // 50곡마다 DB에 저장
      if (batchCount >= 50) {
        for (const [id, cover] of Object.entries(batch)) {
          await updateSong(id, { albumCover: cover });
        }
        batch = {};
        batchCount = 0;
      }

      // API 속도 제한 방지 (0.3초 간격)
      await delay(300);
    }

    // 마지막 남은 배치 저장
    if (batchCount > 0) {
      for (const [id, cover] of Object.entries(batch)) {
        await updateSong(id, { albumCover: cover });
      }
    }

    const stopped = stopCoverRef.current;
    setCoverProgress(null);
    showMsg(`앨범커버 검색 ${stopped ? "중지" : "완료"}! 찾음: ${found}곡, 못찾음: ${skipped}곡`);
    load();
  };

  const handleStopCover = () => {
    stopCoverRef.current = true;
  };

  const s = { brd: "#e2e8f0", sub: "#64748b", acc: "#3b82f6", danger: "#ef4444", text: "#1e293b" };

  // 커버 없는 곡 수
  const noCoverCount = songs.filter((s) => !s.albumCover).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif", color: s.text }}>

      <div style={{ background: "#fff", borderBottom: `1px solid ${s.brd}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700 }}>⚙️ SSOYA 관리자</h1>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={handleImportCSV} style={{ padding: "6px 12px", borderRadius: "8px", background: "#f59e0b", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📄 CSV/엑셀</button>
          <button onClick={handleBulkCover} disabled={!!coverProgress} style={{ padding: "6px 12px", borderRadius: "8px", background: coverProgress ? "#94a3b8" : "#e879f9", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: coverProgress ? "not-allowed" : "pointer" }}>
            🎨 앨범커버 ({noCoverCount})
          </button>
          <button onClick={handleExport} style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📤 내보내기</button>
          <button onClick={handleImportJSON} style={{ padding: "6px 12px", borderRadius: "8px", background: "#6366f1", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📥 JSON</button>
          <button onClick={handleDeleteAll} style={{ padding: "6px 12px", borderRadius: "8px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>🗑️ 전체삭제</button>
          <button onClick={onLogout} style={{ padding: "6px 12px", borderRadius: "8px", background: "#1e293b", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>🚪 로그아웃</button>
        </div>
      </div>

      {/* 알림 */}
      {msg && (
        <div style={{ position: "fixed", top: "16px", right: "16px", background: msg.type === "error" ? "#fef2f2" : "#f0fdf4", color: msg.type === "error" ? "#ef4444" : "#16a34a", padding: "12px 20px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "14px", fontWeight: 600, zIndex: 999, border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
          {msg.text}
        </div>
      )}

      {/* CSV 가져오기 진행 */}
      {importProgress && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", padding: "32px", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 999, textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
          <p style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>{importProgress.total}곡 업로드 중...</p>
          <p style={{ fontSize: "13px", color: "#64748b" }}>잠시만 기다려주세요</p>
        </div>
      )}

      {/* 앨범커버 일괄 검색 진행 */}
      {coverProgress && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", padding: "32px 28px", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 999, textAlign: "center", maxWidth: "360px", width: "90%" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎨</div>
          <p style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>앨범커버 검색 중</p>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "#3b82f6", marginBottom: "8px" }}>
            {coverProgress.current} / {coverProgress.total}
          </p>
          {/* 진행 바 */}
          <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "12px", overflow: "hidden" }}>
            <div style={{ width: `${(coverProgress.current / coverProgress.total) * 100}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #e879f9)", borderRadius: "4px", transition: "width 0.3s" }} />
          </div>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            🔍 {coverProgress.currentTitle}
          </p>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
            ✅ 찾음: {coverProgress.found} &nbsp; ❌ 못찾음: {coverProgress.skipped}
          </p>
          <button onClick={handleStopCover} style={{ padding: "8px 20px", borderRadius: "10px", background: "#ef4444", color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            ⏹️ 중지 (지금까지 결과 저장)
          </button>
        </div>
      )}

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 16px" }}>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button onClick={() => { setTab("list"); setEditId(null); }} style={{ padding: "8px 18px", borderRadius: "10px", border: `1.5px solid ${tab === "list" ? s.acc : s.brd}`, background: tab === "list" ? s.acc + "12" : "transparent", color: tab === "list" ? s.acc : s.sub, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            📋 노래 목록 ({songs.length})
          </button>
          <button onClick={() => { setTab("add"); setEditId(null); }} style={{ padding: "8px 18px", borderRadius: "10px", border: `1.5px solid ${tab === "add" ? s.acc : s.brd}`, background: tab === "add" ? s.acc + "12" : "transparent", color: tab === "add" ? s.acc : s.sub, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            ➕ 노래 추가
          </button>
        </div>

        {tab === "list" && (
          loading ? <p style={{ color: s.sub, textAlign: "center", padding: "40px" }}>불러오는 중...</p> :
          songs.length === 0 ? <p style={{ color: s.sub, textAlign: "center", padding: "40px" }}>등록된 노래가 없어요. CSV 파일을 가져와보세요!</p> :
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {songs.map((song) => (
              <div key={song.id} style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", border: `1px solid ${s.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", gap: "10px", flex: 1, minWidth: 0, alignItems: "center" }}>
                  {/* 앨범커버 미리보기 */}
                  {song.albumCover ? (
                    <img src={song.albumCover} alt="" style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>🎵</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
                    <div style={{ fontSize: "12px", color: s.sub }}>{song.artist}</div>
                    <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                      {(song.tags || []).map((tag) => (
                        <span key={tag} style={{ padding: "1px 6px", borderRadius: "6px", fontSize: "10px", fontWeight: 600, background: (TAG_COLORS[tag] || "#888") + "20", color: TAG_COLORS[tag] || "#888" }}>{tag}</span>
                      ))}
                      <span style={{ fontSize: "11px", color: s.sub }}>⭐{song.starCount || 0}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => { setTab("edit"); setEditId(song.id); }} style={{ padding: "6px 12px", borderRadius: "8px", background: "#f8fafc", border: `1px solid ${s.brd}`, color: s.text, fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>✏️</button>
                  <button onClick={() => handleDelete(song.id, song.title)} style={{ padding: "6px 12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: s.danger, fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "add" && (
          <SongForm
            onSave={async (data) => { await addSong(data); showMsg(`"${data.title}" 추가 완료!`); setTab("list"); load(); }}
            onCancel={() => setTab("list")}
          />
        )}

        {tab === "edit" && editId && (
          <SongForm
            initial={songs.find((s) => s.id === editId)}
            onSave={async (data) => { await updateSong(editId, data); showMsg(`"${data.title}" 수정 완료!`); setTab("list"); setEditId(null); load(); }}
            onCancel={() => { setTab("list"); setEditId(null); }}
          />
        )}
      </div>
    </div>
  );
}

function SongForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [artist, setArtist] = useState(initial?.artist || "");
  const [albumCover, setAlbumCover] = useState(initial?.albumCover || "");
  const [tags, setTags] = useState(initial?.tags || []);
  const [starCount, setStarCount] = useState(initial?.starCount || 0);
  const [coverResults, setCoverResults] = useState([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag) => setTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  const handleSearchCover = async () => {
    if (!title && !artist) return;
    setCoverLoading(true);
    const results = await searchCover(title, artist);
    setCoverResults(results);
    setCoverLoading(false);
  };

  const handleStarInput = (e) => {
    const val = e.target.value;
    if (val === "") { setStarCount(0); return; }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) setStarCount(num);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert("제목을 입력해주세요");
    if (!artist.trim()) return alert("아티스트를 입력해주세요");
    setSaving(true);
    await onSave({ title: title.trim(), artist: artist.trim(), albumCover, tags, starCount: Number(starCount) || 0 });
    setSaving(false);
  };

  const s = { brd: "#e2e8f0", sub: "#64748b", acc: "#3b82f6" };

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px 20px", border: `1px solid ${s.brd}` }}>
      <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>{initial ? "✏️ 노래 수정" : "➕ 새 노래 추가"}</h3>

      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>제목 *</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="노래 제목"
        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "14px", outline: "none", marginBottom: "14px" }} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>아티스트 *</label>
      <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="원곡자"
        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "14px", outline: "none", marginBottom: "14px" }} />

      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>앨범커버</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input value={albumCover} onChange={(e) => setAlbumCover(e.target.value)} placeholder="이미지 URL (직접 입력 또는 아래에서 검색)"
          style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "13px", outline: "none" }} />
        <button onClick={handleSearchCover} disabled={coverLoading}
          style={{ padding: "10px 16px", borderRadius: "10px", background: s.acc, color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          {coverLoading ? "검색중..." : "🔍 자동검색"}
        </button>
      </div>
      {albumCover && (
        <div style={{ marginBottom: "10px" }}>
          <img src={albumCover} alt="cover" style={{ width: "80px", height: "80px", borderRadius: "10px", objectFit: "cover", border: `1px solid ${s.brd}` }}
            onError={(e) => { e.target.style.display = "none"; }} />
        </div>
      )}
      {coverResults.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", padding: "10px", background: "#f8fafc", borderRadius: "10px" }}>
          {coverResults.map((r, i) => (
            <div key={i} onClick={() => { setAlbumCover(r.cover); setCoverResults([]); }} style={{ cursor: "pointer", textAlign: "center", width: "80px" }}>
              <img src={r.small} alt="" style={{ width: "70px", height: "70px", borderRadius: "8px", objectFit: "cover", border: albumCover === r.cover ? `2px solid ${s.acc}` : `1px solid ${s.brd}` }} />
              <div style={{ fontSize: "9px", color: s.sub, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
            </div>
          ))}
        </div>
      )}

      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "6px" }}>태그</label>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        {ALL_TAGS.map((tag) => {
          const active = tags.includes(tag);
          const c = TAG_COLORS[tag] || "#888";
          return (
            <button key={tag} onClick={() => toggleTag(tag)}
              style={{ padding: "5px 13px", borderRadius: "20px", border: `1.5px solid ${active ? c : s.brd}`, background: active ? c + "22" : "transparent", color: active ? c : s.sub, fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}>
              {active ? "✓ " : ""}{tag}
            </button>
          );
        })}
      </div>

      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>부른횟수 ⭐</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        <button onClick={() => setStarCount(Math.max(0, starCount - 1))} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${s.brd}`, background: "#f8fafc", fontSize: "18px", cursor: "pointer" }}>−</button>
        <input type="number" value={starCount} onChange={handleStarInput} min="0"
          style={{ width: "70px", height: "36px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "18px", fontWeight: 700, textAlign: "center", outline: "none" }} />
        <button onClick={() => setStarCount(starCount + 1)} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${s.brd}`, background: "#f8fafc", fontSize: "18px", cursor: "pointer" }}>+</button>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleSubmit} disabled={saving}
          style={{ flex: 1, padding: "12px", borderRadius: "12px", background: saving ? "#94a3b8" : s.acc, color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "저장 중..." : initial ? "수정 완료" : "추가 완료"}
        </button>
        <button onClick={onCancel} style={{ padding: "12px 20px", borderRadius: "12px", background: "transparent", color: s.sub, border: `1px solid ${s.brd}`, fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>취소</button>
      </div>
    </div>
  );
}
