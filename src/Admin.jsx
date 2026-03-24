// SSOYA 관리자 페이지

import { useState, useEffect } from "react";
import { fetchSongs, addSong, updateSong, deleteSong, setAllSongs, setSong } from "./firebase";
import * as XLSX from "xlsx";

const ADMIN_PW = "Ehelsdlek";
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

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif" }}>
        <div style={{ background: "#fff", padding: "40px 32px", borderRadius: "20px", boxShadow: "0 8px 30px rgba(0,0,0,0.08)", maxWidth: "360px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px", color: "#1e293b" }}>SSOYA 관리자</h1>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>비밀번호를 입력해주세요</p>
          <input type="password" placeholder="비밀번호" value={pw}
            onChange={(e) => { setPw(e.target.value); setPwErr(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { if (pw === ADMIN_PW) setAuthed(true); else setPwErr(true); } }}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${pwErr ? "#ef4444" : "#d1d5db"}`, fontSize: "15px", outline: "none", marginBottom: "12px" }} />
          {pwErr && <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>비밀번호가 틀렸어요</p>}
          <button onClick={() => { if (pw === ADMIN_PW) setAuthed(true); else setPwErr(true); }}
            style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "#3b82f6", color: "#fff", border: "none", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
            로그인
          </button>
        </div>
      </div>
    );
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("list");
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

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

  const s = { brd: "#e2e8f0", sub: "#64748b", acc: "#3b82f6", danger: "#ef4444", text: "#1e293b" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif", color: s.text }}>

      <div style={{ background: "#fff", borderBottom: `1px solid ${s.brd}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700 }}>⚙️ SSOYA 관리자</h1>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={handleImportCSV} style={{ padding: "6px 12px", borderRadius: "8px", background: "#f59e0b", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📄 CSV/엑셀</button>
          <button onClick={handleExport} style={{ padding: "6px 12px", borderRadius: "8px", background: "#10b981", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📤 내보내기</button>
          <button onClick={handleImportJSON} style={{ padding: "6px 12px", borderRadius: "8px", background: "#6366f1", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📥 JSON</button>
          <button onClick={handleDeleteAll} style={{ padding: "6px 12px", borderRadius: "8px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>🗑️ 전체삭제</button>
        </div>
      </div>

      {msg && (
        <div style={{ position: "fixed", top: "16px", right: "16px", background: msg.type === "error" ? "#fef2f2" : "#f0fdf4", color: msg.type === "error" ? "#ef4444" : "#16a34a", padding: "12px 20px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "14px", fontWeight: 600, zIndex: 999, border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
          {msg.text}
        </div>
      )}

      {importProgress && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", padding: "32px", borderRadius: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", zIndex: 999, textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>⏳</div>
          <p style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>{importProgress.total}곡 업로드 중...</p>
          <p style={{ fontSize: "13px", color: "#64748b" }}>잠시만 기다려주세요</p>
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
    // 빈 문자열이면 0으로 처리
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

      {/* 부른횟수 - 버튼 + 직접 입력 둘 다 가능 */}
      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>부른횟수 ⭐</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        <button onClick={() => setStarCount(Math.max(0, starCount - 1))} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${s.brd}`, background: "#f8fafc", fontSize: "18px", cursor: "pointer" }}>−</button>
        <input
          type="number"
          value={starCount}
          onChange={handleStarInput}
          min="0"
          style={{ width: "70px", height: "36px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "18px", fontWeight: 700, textAlign: "center", outline: "none", MozAppearance: "textfield", WebkitAppearance: "none" }}
        />
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
