import { useState, useEffect, useRef } from "react";

const DB_URL = "https://ssoya-a2ae2-default-rtdb.asia-southeast1.firebasedatabase.app";
const ADMIN_PW = "Ehelsdlek";

const ALL_TAGS = ["JPOP", "KPOP", "HELL", "연습곡", "신남", "슬픔"];

const TAG_COLORS = {
  JPOP: "#3b82f6", KPOP: "#10b981", HELL: "#ef4444",
  "연습곡": "#22c55e", "신남": "#f59e0b", "슬픔": "#6366f1",
};

const SAMPLE_DATA = {
  song_01:{title:"봄도둑(春泥棒)",artist:"ヨルシカ(요루시카)",albumCover:"",tags:["JPOP","슬픔"],starCount:3},
  song_02:{title:"귀여워서 미안해(可愛くてごめん)",artist:"ちゅーたん(나카무라 치즈루)",albumCover:"",tags:["JPOP","신남"],starCount:2},
  song_03:{title:"W/X/Y",artist:"たにゆうき(타니 유우키)",albumCover:"",tags:["JPOP"],starCount:1},
  song_04:{title:"Drowning",artist:"WOODZ",albumCover:"",tags:["KPOP","슬픔"],starCount:4},
  song_05:{title:"괴수의 꽃 노래",artist:"Vaundy",albumCover:"",tags:["JPOP","신남"],starCount:2},
  song_06:{title:"방해쟁이(おじゃま虫)",artist:"하츠네 미쿠",albumCover:"",tags:["JPOP","연습곡"],starCount:5},
  song_07:{title:"FIRE",artist:"BTS",albumCover:"",tags:["KPOP","신남","HELL"],starCount:3},
  song_08:{title:"만찬가(晩餐歌)",artist:"tuki.",albumCover:"",tags:["JPOP","HELL"],starCount:1},
  song_09:{title:"타바코(たばこ, 담배)",artist:"コレサワ(코레사와)",albumCover:"",tags:["JPOP","슬픔"],starCount:2},
  song_10:{title:"첫사랑(初恋)",artist:"Hikaru Utada",albumCover:"",tags:["JPOP","슬픔","연습곡"],starCount:6},
};

// Firebase REST helpers
async function fbGet(path) {
  const r = await fetch(`${DB_URL}/${path}.json`);
  return r.json();
}
async function fbSet(path, data) {
  const r = await fetch(`${DB_URL}/${path}.json`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return r.json();
}
async function fbPush(path, data) {
  const r = await fetch(`${DB_URL}/${path}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return r.json();
}
async function fbDelete(path) {
  await fetch(`${DB_URL}/${path}.json`, { method: "DELETE" });
}
async function fbUpdate(path, data) {
  const r = await fetch(`${DB_URL}/${path}.json`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return r.json();
}

// iTunes 앨범커버 검색
async function searchCover(title, artist) {
  try {
    const q = encodeURIComponent(`${artist} ${title}`);
    const r = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=5`);
    const d = await r.json();
    return (d.results || []).map(r => ({
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
        <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');*{box-sizing:border-box;margin:0;padding:0}`}</style>
        <div style={{ background: "#fff", padding: "40px 32px", borderRadius: "20px", boxShadow: "0 8px 30px rgba(0,0,0,0.08)", maxWidth: "360px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔐</div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px", color: "#1e293b" }}>관리자 로그인</h1>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>비밀번호를 입력해주세요</p>
          <input
            type="password" placeholder="비밀번호" value={pw}
            onChange={e => { setPw(e.target.value); setPwErr(false); }}
            onKeyDown={e => { if (e.key === "Enter") { if (pw === ADMIN_PW) setAuthed(true); else setPwErr(true); } }}
            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1.5px solid ${pwErr ? "#ef4444" : "#d1d5db"}`, fontSize: "15px", outline: "none", marginBottom: "12px", transition: "border .2s" }}
          />
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
  const [tab, setTab] = useState("list"); // list | add | edit
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await fbGet("songs");
    if (data) setSongs(Object.entries(data).map(([id, s]) => ({ id, ...s })));
    else setSongs([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`"${title}" 을(를) 정말 삭제할까요?`)) return;
    await fbDelete(`songs/${id}`);
    showMsg(`"${title}" 삭제 완료`);
    load();
  };

  const handleSeed = async () => {
    if (!confirm("샘플 데이터 10곡을 추가할까요? (기존 데이터는 유지됩니다)")) return;
    for (const [k, v] of Object.entries(SAMPLE_DATA)) {
      await fbSet(`songs/${k}`, v);
    }
    showMsg("샘플 데이터 10곡 추가 완료!");
    load();
  };

  const handleExport = () => {
    const obj = {};
    songs.forEach(s => { const { id, ...rest } = s; obj[id] = rest; });
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "songbook_backup.json"; a.click();
    URL.revokeObjectURL(url);
    showMsg("JSON 내보내기 완료");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!confirm(`${Object.keys(data).length}곡을 가져올까요? (기존 데이터에 덮어씁니다)`)) return;
        await fbSet("songs", data);
        showMsg("가져오기 완료!");
        load();
      } catch { showMsg("JSON 파일 형식이 잘못됐어요", "error"); }
    };
    input.click();
  };

  const s = { bg: "#f1f5f9", card: "#ffffff", text: "#1e293b", sub: "#64748b", brd: "#e2e8f0", acc: "#3b82f6", danger: "#ef4444" };

  return (
    <div style={{ minHeight: "100vh", background: s.bg, fontFamily: "'Pretendard','Noto Sans KR',-apple-system,sans-serif", color: s.text }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');*{box-sizing:border-box;margin:0;padding:0}body{margin:0}`}</style>

      {/* 헤더 */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${s.brd}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700 }}>⚙️ 노래책 관리자</h1>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={handleSeed} style={{ padding: "6px 14px", borderRadius: "8px", background: "#f59e0b", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📦 샘플 데이터</button>
          <button onClick={handleExport} style={{ padding: "6px 14px", borderRadius: "8px", background: "#10b981", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📤 내보내기</button>
          <button onClick={handleImport} style={{ padding: "6px 14px", borderRadius: "8px", background: "#6366f1", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>📥 가져오기</button>
        </div>
      </div>

      {/* 알림 */}
      {msg && (
        <div style={{ position: "fixed", top: "16px", right: "16px", background: msg.type === "error" ? "#fef2f2" : "#f0fdf4", color: msg.type === "error" ? "#ef4444" : "#16a34a", padding: "12px 20px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "14px", fontWeight: 600, zIndex: 999, border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>
          {msg.text}
        </div>
      )}

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 16px" }}>
        {/* 탭 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button onClick={() => { setTab("list"); setEditId(null); }} style={{ padding: "8px 18px", borderRadius: "10px", border: `1.5px solid ${tab === "list" ? s.acc : s.brd}`, background: tab === "list" ? s.acc + "12" : "transparent", color: tab === "list" ? s.acc : s.sub, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>📋 노래 목록 ({songs.length})</button>
          <button onClick={() => { setTab("add"); setEditId(null); }} style={{ padding: "8px 18px", borderRadius: "10px", border: `1.5px solid ${tab === "add" ? s.acc : s.brd}`, background: tab === "add" ? s.acc + "12" : "transparent", color: tab === "add" ? s.acc : s.sub, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>➕ 노래 추가</button>
        </div>

        {/* 노래 목록 */}
        {tab === "list" && (
          loading ? <p style={{ color: s.sub, textAlign: "center", padding: "40px" }}>불러오는 중...</p> :
          songs.length === 0 ? <p style={{ color: s.sub, textAlign: "center", padding: "40px" }}>등록된 노래가 없어요. 샘플 데이터를 넣어보세요!</p> :
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {songs.map(song => (
              <div key={song.id} style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", border: `1px solid ${s.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
                  <div style={{ fontSize: "12px", color: s.sub }}>{song.artist}</div>
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                    {(song.tags || []).map(tag => <span key={tag} style={{ padding: "1px 6px", borderRadius: "6px", fontSize: "10px", fontWeight: 600, background: (TAG_COLORS[tag] || "#888") + "20", color: TAG_COLORS[tag] || "#888" }}>{tag}</span>)}
                    <span style={{ fontSize: "11px", color: s.sub }}>⭐{song.starCount || 0}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => { setTab("edit"); setEditId(song.id); }} style={{ padding: "6px 12px", borderRadius: "8px", background: "#f8fafc", border: `1px solid ${s.brd}`, color: s.text, fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>✏️ 수정</button>
                  <button onClick={() => handleDelete(song.id, song.title)} style={{ padding: "6px 12px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: s.danger, fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>🗑️ 삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 노래 추가 */}
        {tab === "add" && (
          <SongForm
            onSave={async (data) => {
              await fbPush("songs", data);
              showMsg(`"${data.title}" 추가 완료!`);
              setTab("list");
              load();
            }}
            onCancel={() => setTab("list")}
          />
        )}

        {/* 노래 수정 */}
        {tab === "edit" && editId && (
          <SongForm
            initial={songs.find(s => s.id === editId)}
            onSave={async (data) => {
              await fbUpdate(`songs/${editId}`, data);
              showMsg(`"${data.title}" 수정 완료!`);
              setTab("list");
              setEditId(null);
              load();
            }}
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

  const toggleTag = (tag) => setTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);

  const handleSearchCover = async () => {
    if (!title && !artist) return;
    setCoverLoading(true);
    const results = await searchCover(title, artist);
    setCoverResults(results);
    setCoverLoading(false);
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

      {/* 제목 */}
      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>제목 *</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="노래 제목"
        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "14px", outline: "none", marginBottom: "14px" }} />

      {/* 아티스트 */}
      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>아티스트 *</label>
      <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="원곡자"
        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "14px", outline: "none", marginBottom: "14px" }} />

      {/* 앨범커버 */}
      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>앨범커버</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input value={albumCover} onChange={e => setAlbumCover(e.target.value)} placeholder="이미지 URL (직접 입력 또는 아래에서 검색)"
          style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: `1px solid ${s.brd}`, fontSize: "13px", outline: "none" }} />
        <button onClick={handleSearchCover} disabled={coverLoading}
          style={{ padding: "10px 16px", borderRadius: "10px", background: s.acc, color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          {coverLoading ? "검색중..." : "🔍 자동검색"}
        </button>
      </div>
      {albumCover && (
        <div style={{ marginBottom: "10px" }}>
          <img src={albumCover} alt="cover" style={{ width: "80px", height: "80px", borderRadius: "10px", objectFit: "cover", border: `1px solid ${s.brd}` }}
            onError={e => { e.target.style.display = "none"; }} />
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

      {/* 태그 */}
      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "6px" }}>태그</label>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        {ALL_TAGS.map(tag => {
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

      {/* 부른횟수 */}
      <label style={{ fontSize: "13px", fontWeight: 600, color: s.sub, display: "block", marginBottom: "4px" }}>부른횟수 ⭐</label>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <button onClick={() => setStarCount(Math.max(0, starCount - 1))} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${s.brd}`, background: "#f8fafc", fontSize: "18px", cursor: "pointer" }}>−</button>
        <span style={{ fontSize: "20px", fontWeight: 700, minWidth: "30px", textAlign: "center" }}>{starCount}</span>
        <button onClick={() => setStarCount(starCount + 1)} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${s.brd}`, background: "#f8fafc", fontSize: "18px", cursor: "pointer" }}>+</button>
      </div>

      {/* 버튼 */}
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
