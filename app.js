const STORAGE_KEY = "yue-music-site-v1";
const DB_NAME = "yue-music-site-media";
const DB_STORE = "audio";

const seed = window.YUE_SITE_SEED || { songs: [], notes: [], photos: [] };
let state = loadState();
let currentSong = 0;
const runtimeUrls = new Map();
const DEFAULT_COVER = "assets/cover-default-music.png";

const $ = (id) => document.getElementById(id);
const audio = $("audio");
const viewIds = ["home", "music", "video", "inspiration", "stories", "photos"];

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return mergeSeed(JSON.parse(saved));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return structuredClone(seed);
}

function mergeSeed(saved) {
  const merged = {
    songs: Array.isArray(saved.songs) ? saved.songs : [],
    notes: Array.isArray(saved.notes) ? saved.notes : [],
    photos: Array.isArray(saved.photos) ? saved.photos : []
  };
  const songTitles = new Set(merged.songs.map((song) => song.title));
  seed.songs.forEach((song) => {
    if (!songTitles.has(song.title)) merged.songs.push(structuredClone(song));
  });
  merged.songs = merged.songs.map((song) => {
    const seeded = seed.songs.find((item) => item.title === song.title);
    return seeded ? { ...seeded, ...song, cover: song.cover || seeded.cover } : song;
  });
  const photoSrcs = new Set(merged.photos.map((photo) => photo.src));
  seed.photos.forEach((photo) => {
    if (!photoSrcs.has(photo.src)) merged.photos.push(structuredClone(photo));
  });
  seed.notes.forEach((note) => {
    if (!merged.notes.includes(note)) merged.notes.push(note);
  });
  return merged;
}

function saveState() {
  const clean = {
    ...state,
    songs: state.songs.filter((song) => !song.sessionOnly)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

function render() {
  $("songCount").textContent = state.songs.length;
  $("photoCount").textContent = state.photos.length;
  $("noteCount").textContent = state.notes.length;
  renderSongs();
  renderNotes();
  renderPhotos();
  selectSong(Math.min(currentSong, Math.max(0, state.songs.length - 1)), false);
}

function renderSongs() {
  const list = $("songList");
  list.innerHTML = "";
  state.songs.forEach((song, index) => {
    const item = document.createElement("article");
    item.className = `song ${index === currentSong ? "active" : ""}`;
    item.style.setProperty("--cover", `url("${escapeAttr(song.cover || DEFAULT_COVER)}")`);
    item.innerHTML = `
      <div class="songIcon">♪</div>
      <div>
        <strong>${escapeHtml(song.title || "未命名歌曲")}</strong>
        <small>${escapeHtml(song.mood || "未设置标签")}</small>
      </div>
      <small>${song.url || song.localOnly ? "可播放" : "待发布"}</small>
    `;
    item.addEventListener("click", () => selectSong(index, true));
    list.appendChild(item);
  });
}

async function selectSong(index, shouldPlay) {
  if (!state.songs.length) return;
  currentSong = index;
  const song = state.songs[index];
  $("nowTag").textContent = song.mood || "月月原创";
  $("nowTitle").textContent = song.title || "未命名歌曲";
  $("nowStory").textContent = song.story || "还没写故事，等月月补一句灵感。";
  $("songTitle").value = song.title || "";
  $("songMood").value = song.mood || "";
  $("disc").style.setProperty("--cover", `url("${escapeAttr(song.cover || DEFAULT_COVER)}")`);
  audio.src = await playableUrl(song);
  $("disc").classList.toggle("playing", shouldPlay && Boolean(audio.src));
  renderSongs();
  if (shouldPlay && audio.src) audio.play().catch(() => {});
}

function renderNotes() {
  const notes = $("notes");
  notes.innerHTML = "";
  state.notes.slice().reverse().forEach((text) => {
    const card = document.createElement("article");
    card.className = "note";
    card.textContent = text;
    notes.appendChild(card);
  });
}

function renderPhotos() {
  const grid = $("galleryGrid");
  grid.innerHTML = "";
  state.photos.forEach((photo) => {
    const fig = document.createElement("figure");
    fig.innerHTML = `<img src="${photo.src}" alt="${escapeHtml(photo.caption || "照片")}"><figcaption>${escapeHtml(photo.caption || "月月的照片")}</figcaption>`;
    grid.appendChild(fig);
  });
}

$("musicInput").addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    const id = crypto.randomUUID();
    let stored = true;
    let previewUrl = "";
    try {
      await putAudio(id, file);
    } catch {
      stored = false;
      previewUrl = URL.createObjectURL(file);
    }
    state.songs.push({
      id,
      title: file.name.replace(/\.[^.]+$/, ""),
      mood: "新上传",
      story: stored ? "月月刚放进小站的新歌。" : "这首歌正在本次浏览中预览；如果刷新后消失，改用本地服务版打开。",
      cover: DEFAULT_COVER,
      url: previewUrl,
      localOnly: stored,
      sessionOnly: !stored
    });
  }
  currentSong = Math.max(0, state.songs.length - files.length);
  saveState();
  render();
  selectSong(currentSong, true);
});

$("photoInput").addEventListener("change", (event) => {
  Array.from(event.target.files || []).forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      state.photos.unshift({ src: reader.result, caption: file.name.replace(/\.[^.]+$/, "") });
      saveState();
      render();
    };
    reader.readAsDataURL(file);
  });
});

$("saveSongMeta").addEventListener("click", () => {
  if (!state.songs.length) return;
  const song = state.songs[currentSong];
  song.title = $("songTitle").value.trim() || song.title;
  song.mood = $("songMood").value.trim() || song.mood;
  saveState();
  render();
});

$("addNote").addEventListener("click", () => {
  const text = $("noteText").value.trim();
  if (!text) return;
  state.notes.push(text);
  $("noteText").value = "";
  saveState();
  render();
});

$("exportData").addEventListener("click", () => {
  const exportable = {
    ...state,
    songs: state.songs.map((song) => song.localOnly ? { ...song, url: "" } : song)
  };
  const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "yueyue-music-site-data.json";
  link.click();
  URL.revokeObjectURL(url);
});

$("importData").addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state = JSON.parse(reader.result);
    currentSong = 0;
    saveState();
    render();
  };
  reader.readAsText(file, "utf-8");
});

audio.addEventListener("play", () => $("disc").classList.add("playing"));
audio.addEventListener("pause", () => $("disc").classList.remove("playing"));
$("heroPlay").addEventListener("click", () => selectSong(currentSong, true));

document.querySelectorAll("[data-view]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showView(link.dataset.view);
  });
});

window.addEventListener("hashchange", () => {
  const next = location.hash.replace("#", "") || "home";
  showView(next, false);
});

function showView(viewId, updateHash = true) {
  const safeView = viewIds.includes(viewId) ? viewId : "home";
  document.body.dataset.view = safeView;
  viewIds.forEach((id) => {
    $(id)?.classList.toggle("active", id === safeView);
  });
  document.querySelectorAll("[data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === safeView);
  });
  if (updateHash && location.hash !== `#${safeView}`) {
    history.pushState(null, "", `#${safeView}`);
  }
  window.scrollTo(0, 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

async function playableUrl(song) {
  if (song.url) return song.url;
  if (!song.localOnly || !song.id) return "";
  if (runtimeUrls.has(song.id)) return runtimeUrls.get(song.id);
  const blob = await getAudio(song.id);
  if (!blob) return "";
  const url = URL.createObjectURL(blob);
  runtimeUrls.set(song.id, url);
  return url;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putAudio(id, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAudio(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const canvas = $("stars");
const ctx = canvas.getContext("2d");
let stars = [];

function resizeStars() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + .4,
    s: Math.random() * .35 + .08,
    c: Math.random() > .55 ? "255,110,168" : "105,216,255"
  }));
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach((star) => {
    star.y += star.s * devicePixelRatio;
    if (star.y > canvas.height) star.y = -8;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${star.c}, ${Math.random() * .35 + .25})`;
    ctx.arc(star.x, star.y, star.r * devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();
  });
  requestAnimationFrame(drawStars);
}

window.addEventListener("resize", resizeStars);
resizeStars();
drawStars();
render();
showView(location.hash.replace("#", "") || "home", false);
