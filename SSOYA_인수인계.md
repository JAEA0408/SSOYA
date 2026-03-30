# SSOYA 프로젝트 인수인계 문서

## 1. 프로젝트 개요

### 목적
SSOYA는 인터넷 방송인의 **노래책(노래 리스트) 웹사이트**. 시청자가 방송인이 부를 수 있는 노래를 검색하고, 관리자(방송인)가 노래를 관리하는 사이트.

### 주요 기능
**사용자 페이지 (`/`)**
- 노래 리스트 열람 (1699곡+)
- 검색 + 자동완성 (제목/아티스트, 매칭 글자 하이라이트)
- 태그 필터 (AND 방식: HELL, 연습곡, 신남, 슬픔)
- 좋아요 (하트 토글, localStorage 저장)
- 정렬 (기본=부른횟수순, 제목순, 가수순)
- 리스트↔카드 뷰 전환
- 슬롯머신 랜덤 선곡 (감속 애니메이션)
- 다크/라이트 모드
- 맨 위로 버튼
- 로고 배너 이미지

**관리자 페이지 (`/admin`)**
- Firebase Auth 이메일 로그인 (비밀번호만 입력, 이메일은 코드에 하드코딩)
- 노래 추가/수정/삭제
- iTunes 앨범커버 자동검색 (개별 + 일괄)
- 일괄 검색 시 아티스트명 동기화 옵션 (체크박스)
- CSV/엑셀 가져오기
- JSON 내보내기/가져오기
- 전체 삭제
- 부른횟수 버튼+직접입력
- 로그아웃

### 기술 스택
- **프론트엔드:** React 18 + Vite
- **DB:** Firebase Realtime Database
- **인증:** Firebase Authentication (이메일/비밀번호)
- **호스팅:** Vercel
- **앨범커버 API:** iTunes Search API (Vercel Edge Function 프록시 경유)
- **스타일링:** 인라인 스타일 (CSS-in-JS)
- **폰트:** Pretendard (CDN)
- **라이브러리:** react-router-dom, firebase, xlsx

### 외부 서비스 정보
- **Firebase 프로젝트:** ssoya-a2ae2
- **Firebase DB URL:** https://ssoya-a2ae2-default-rtdb.asia-southeast1.firebasedatabase.app
- **관리자 이메일:** admin@ssoya.com (Firebase Auth에 등록됨, 코드에 하드코딩)
- **관리자 비밀번호:** Ehelsdlek
- **GitHub:** github.com/JAEA0408/SSOYA
- **배포 URL:** ssoya.vercel.app
- **Firebase 보안 규칙:** songs → 읽기 전체허용, 쓰기 auth 필요
- **Last.fm API Key:** c1caacb58a87eacb83228ae1b47e58c9 (현재 미사용, iTunes로 전환됨)

---

## 2. 파일 구조

```
SSOYA/
├── index.html              ← <title>SSOYA</title>
├── package.json
├── vite.config.js
├── vercel.json              ← SPA rewrites 설정
├── api/
│   └── itunes.js            ← Vercel Edge Function (iTunes CORS 프록시)
├── public/
│   └── logo.png             ← 채널아트 배너 이미지 (1568x560)
├── src/
│   ├── main.jsx             ← 앱 진입점 (BrowserRouter)
│   ├── App.jsx              ← 라우터 (/ → SSOYA, /admin → Admin)
│   ├── SSOYA.jsx            ← 사용자 페이지
│   ├── Admin.jsx            ← 관리자 페이지
│   ├── firebase.js          ← Firebase 설정 + DB/Auth 함수
│   └── index.css            ← 애니메이션, 글로벌 스타일
```

---

## 3. 현재 코드 (전체)

### vercel.json
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

### api/itunes.js
```javascript
export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const country = searchParams.get("country") || "kr";

  if (!q) return new Response(JSON.stringify({ results: [] }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=5&country=${country}`;
    const r = await fetch(url);
    if (!r.ok) return new Response(JSON.stringify({ results: [] }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
```

### src/main.jsx
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### src/App.jsx
```jsx
import { Routes, Route } from "react-router-dom";
import SSOYA from "./SSOYA";
import Admin from "./Admin";

function App() {
  return (
    <Routes>
      <Route path="/" element={<SSOYA />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;
```

### src/firebase.js
```javascript
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, push, remove, update } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAyz7kFvcoNYH2PcDAhkEXaE_UXX1BB5G0",
  authDomain: "ssoya-a2ae2.firebaseapp.com",
  databaseURL: "https://ssoya-a2ae2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ssoya-a2ae2",
  storageBucket: "ssoya-a2ae2.firebasestorage.app",
  messagingSenderId: "643252613306",
  appId: "1:643252613306:web:0390fe79bb9ecedacb1283"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export async function adminLogin(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function adminLogout() { await signOut(auth); }
export function getCurrentUser() { return auth.currentUser; }

export async function fetchSongs() {
  try {
    const snapshot = await get(ref(db, "songs"));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.entries(data).map(([id, song]) => ({ id, ...song }));
  } catch (e) { console.error("Firebase fetch error:", e); return []; }
}

export async function addSong(songData) { const newRef = push(ref(db, "songs")); await set(newRef, songData); return newRef.key; }
export async function updateSong(id, songData) { await update(ref(db, `songs/${id}`), songData); }
export async function deleteSong(id) { await remove(ref(db, `songs/${id}`)); }
export async function setAllSongs(data) { await set(ref(db, "songs"), data); }
export async function setSong(id, songData) { await set(ref(db, `songs/${id}`), songData); }
```

### src/index.css
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

* { box-sizing: border-box; margin: 0; padding: 0; }
body { margin: 0; font-family: 'Pretendard', 'Noto Sans KR', -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #888; border-radius: 3px; }

@keyframes slotReveal { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
@keyframes glowPulse { 0%,100% { box-shadow: 0 0 15px rgba(59,130,246,0.3); } 50% { box-shadow: 0 0 35px rgba(59,130,246,0.6); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.sc { animation: fadeUp 0.3s ease forwards; transition: transform 0.2s, box-shadow 0.2s; }
.sc:hover { transform: translateY(-2px); }
.hb { transition: transform 0.2s; }
.hb:hover { transform: scale(1.25); }
.hb:active { transform: scale(0.9); }
.fb { transition: all 0.2s; }
.fb:hover { opacity: 0.85; }
```

### src/SSOYA.jsx
(사용자 페이지 — 검색 자동완성 포함)

[파일이 너무 길어서 프로젝트의 src/SSOYA.jsx 파일 자체를 참고할 것. 주요 구조:]

- 상단: 로고 배너 (`/logo.png`)
- 다크/라이트 모드 토글
- 검색창 + 자동완성 드롭다운 (1글자부터 활성, 최대 8개, 키보드 ↑↓ 지원, 매칭 글자 파란색 강조)
- 태그 필터 (AND), 좋아요 필터
- 곡 수 표시 + 뷰 전환(목록/카드) + 정렬 + 랜덤
- 노래 리스트 (각 항목: 앨범커버 110x110 + 제목 20px bold + 아티스트 16.5px + 부른횟수 + 태그)
- 맨 위로 버튼
- 슬롯머신 모달 (제목/문구 없이 심플)

### src/Admin.jsx
(관리자 페이지 — iTunes + 아티스트 동기화)

[파일이 너무 길어서 프로젝트의 src/Admin.jsx 파일 자체를 참고할 것. 주요 구조:]

- Firebase Auth 로그인 (비밀번호만 입력, 이메일은 ADMIN_EMAIL 상수)
- iTunes 프록시: `/api/itunes?q=검색어&country=kr` 경유
- `cleanQuery()`: 괄호/태그 제거
- `similarity()`: 문자열 유사도 비교
- `pickResult()`: 결과에서 커버+아티스트명 추출
- `fetchCoverAndArtist()`: 5단계 폴백 (KR→JP→US→제목만KR→제목만JP)
- 일괄 검색 시 `syncArtist` 체크박스로 아티스트명 동기화 옵션
- CSV/엑셀 가져오기, JSON 내보내기/가져오기, 전체삭제, 로그아웃

---

## 4. 현재 상태

### 완성된 기능
- 사용자 페이지 전체 (검색, 자동완성, 필터, 정렬, 좋아요, 랜덤, 다크모드, 뷰전환)
- 관리자 페이지 전체 (CRUD, CSV 가져오기, JSON 백업, 일괄 앨범커버+아티스트 동기화)
- Firebase 보안 규칙 (읽기 전체, 쓰기 auth)
- Vercel 배포 + SPA rewrites
- iTunes Edge Function 프록시

### 알고 있는 문제점
1. **앨범커버 검색 성공률이 낮음** — 한국 곡 중 iTunes에 없는 곡이 많음. 특히 인디/마이너 가수. Spotify API가 한국곡 커버리지가 더 넓지만 서버 필요.
2. **1699곡 일괄 로딩 시 느림** — Firebase에서 전체 데이터를 한번에 가져오기 때문. 페이지네이션이나 가상 스크롤 도입 고려 필요.
3. **모바일 UI 미최적화** — 접속자 90%가 모바일인데 세부 터치 UX, 폰트 크기, 간격 등 실기기 테스트 필요.
4. **GitHub에 불필요 파일** — songbook_admin.jsx, files.zip 등 옛날 파일이 남아있을 수 있음.

---

## 5. 다음에 해야 할 작업 (우선순위)

1. **모바일 UI 최적화** — 실제 폰에서 테스트하면서 폰트, 간격, 터치영역, 자동완성 드롭다운 등 세부 조정 (사용자의 최우선 요구사항)
2. **커스텀 도메인 연결** — ssoya.vercel.app 말고 짧은 도메인 구매 후 Vercel에 연결
3. **앨범커버 검색 개선** — iTunes에서 못 찾는 곡 비율 줄이기 (Spotify API 병행 또는 Melon/Bugs 이미지 스크래핑 검토)
4. **GitHub 불필요 파일 정리**
5. **성능 최적화** — 가상 스크롤(react-window 등)로 1700곡 렌더링 성능 개선
6. **노래 태그 편집 UX 개선** — 태그 종류 추가 예정이므로 확장 가능한 구조 필요

---

## 6. 중요한 결정사항 및 맥락

### 선택한 구조/방식과 이유
- **인라인 스타일 사용:** CSS 파일 분리 안 하고 인라인으로 통일. 사용자가 React 초보라 파일 수를 최소화하기 위해.
- **Firebase Realtime DB 선택:** Firestore보다 빠르고 실시간. 노래 수가 수천 곡 수준이라 적합.
- **Vercel Edge Function으로 iTunes 프록시:** 브라우저에서 iTunes API 직접 호출하면 CORS/403 에러 발생. 서버리스 함수로 우회.
- **관리자 비밀번호만 입력 방식:** 실제 사용자(방송인)가 컴퓨터에 익숙하지 않아서 이메일+비밀번호 대신 비밀번호 한 칸만 보이게 함. 이메일은 코드에 하드코딩.

### 시도했다가 포기한 것
- **Last.fm API:** 앨범커버 URL이 빈 문자열로 반환되는 문제로 성공률 10% 미만. iTunes로 전환함.
- **순수 HTML 버전:** 초반에 React 없이 HTML로 만들자는 의견 있었으나, 기능이 많아져서 React로 전환.
- **별도 아티스트 통일 버튼:** 앨범커버 검색과 분리하면 2번 돌려야 해서, 체크박스로 통합 (앨범커버 검색 시 동시에 아티스트명도 업데이트).

### 반드시 지켜야 할 제약사항
- **"songbook"이라는 용어 사용 금지.** 코드/파일명/주석/UI 어디서든 SSOYA로 통일.
- **반말 사용.** 사용자 요청.
- **12세 초보자에게 설명하듯이.** 기술 용어 사용 시 쉽게 풀어서.
- **명시한 요구사항만 구현.** 추천은 하되 임의로 추가하지 않기.
- **과잉공감 금지.** 모르는 건 모른다고.
- **localStorage 키 prefix:** `ssoya_` (likes, theme, view)

---

## 7. 새 채팅 첫 메시지 초안

아래를 그대로 복사해서 새 Claude 채팅 첫 메시지로 보내면 됨:

---

SSOYA 노래책 프로젝트를 이어서 작업해줘. 아래는 인수인계 문서야. 이걸 보고 프로젝트 맥락을 완벽히 파악한 다음, 내가 요청하는 작업을 진행해줘.

[위 인수인계 문서 전체를 여기에 붙여넣기]

현재 프로젝트 파일은 GitHub에 있어: github.com/JAEA0408/SSOYA
배포 주소: ssoya.vercel.app

지금 이어서 해야 할 작업은:
[여기에 구체적인 작업 내용 작성]

참고:
- 반말로 대화해줘
- 12세 초보자에게 설명하듯이 답변해줘
- 명시한 요구사항만 구현하고, 추천은 해주되 임의로 추가하지 마
- songbook 용어 쓰지 말고 SSOYA로 통일해줘
