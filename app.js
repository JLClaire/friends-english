// ===== DOM =====
const clipSelect = document.getElementById("clipSelect");
const stepLabel = document.getElementById("stepLabel");
const mediaHint = document.getElementById("mediaHint");

const speedSelect = document.getElementById("speedSelect");
const video = document.getElementById("video");
const audio = document.getElementById("audio");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const resetBtn = document.getElementById("resetBtn");

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const step4 = document.getElementById("step4");

const subsEl = document.getElementById("subs");
const translateEl = document.getElementById("translate");
const reviewEl = document.getElementById("review");
const highlightsEl = document.getElementById("highlights");

// Step2 controls (must exist in index.html)
const viewListBtn = document.getElementById("viewListBtn");
const viewSingleBtn = document.getElementById("viewSingleBtn");
const toggleZhBtn = document.getElementById("toggleZhBtn");
const singleBar = document.getElementById("singleBar");
const singleText = document.getElementById("singleText");
const prevLineBtn = document.getElementById("prevLineBtn");
const nextLineBtn = document.getElementById("nextLineBtn");

// ===== State =====
const STEP_TEXT = [
  "Step 1/4: No subs",
  "Step 2/4: EN (shadowing)",
  "Step 3/4: CN→EN",
  "Step 4/4: Review"
];

let clips = [];
let currentClip = null;
let lines = [];
let step = 0;

// Step2 view
let viewMode = "list";     // "list" | "single"
let showZh = false;        // 中文默认隐藏
let activeIndex = 0;       // single view 当前句
let segmentEnd = null;     // 单句播放到点自动暂停（仅当通过 playSegment 播放时生效）

// ===== Helpers =====
function setVisible() {
  stepLabel.textContent = STEP_TEXT[step];
  step1.classList.toggle("hidden", step !== 0);
  step2.classList.toggle("hidden", step !== 1);
  step3.classList.toggle("hidden", step !== 2);
  step4.classList.toggle("hidden", step !== 3);

  prevBtn.disabled = step === 0;
  nextBtn.disabled = step === 3;
}

function keyAnswersStorageKey() {
  return `answers:${currentClip?.id || "unknown"}`;
}

function loadAnswers() {
  try {
    return JSON.parse(localStorage.getItem(keyAnswersStorageKey()) || "[]");
  } catch {
    return [];
  }
}

function saveAnswers(arr) {
  localStorage.setItem(keyAnswersStorageKey(), JSON.stringify(arr));
}

// ===== Step2: Segment playback =====
function playSegment(i) {
  if (!lines[i]) return;
  activeIndex = i;

  // 只有通过点击句子/切句进入“单句训练”时才设置 segmentEnd
  segmentEnd = lines[i].end;

  video.currentTime = lines[i].start;
  video.play();

  if (viewMode === "single") renderSingleBar();
}

function renderSingleBar() {
  if (!lines.length) return;
  const ln = lines[activeIndex];

  singleText.innerHTML = `
    <div class="meta">${ln.start}s → ${ln.end}s</div>
    <div class="en">${ln.en || ""}</div>
    ${showZh ? `<div class="zh" style="margin-top:6px;">${ln.zh || "（暂无中文）"}</div>` : ""}
  `;
}

function setViewMode(mode) {
  viewMode = mode;

  viewListBtn.classList.toggle("primary", mode === "list");
  viewSingleBtn.classList.toggle("primary", mode === "single");

  // 切换显示区域
  singleBar.classList.toggle("hidden", mode !== "single");
  subsEl.classList.toggle("hidden", mode !== "list");

  // 切换模式不强行暂停当前播放
  // 但要清掉 segmentEnd，避免你从头播放时突然被暂停
  segmentEnd = null;

  if (mode === "single") {
    renderSingleBar();
  }
}

// List View 渲染
function renderSubs() {
  subsEl.innerHTML = "";

  lines.forEach((ln, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="meta">${ln.start}s → ${ln.end}s</div>
      <div class="en">${ln.en || ""}</div>
      ${showZh ? `<div class="zh">${ln.zh || "（暂无中文）"}</div>` : ""}
    `;

    // 点击该句：只播放该句并自动暂停
    div.addEventListener("click", () => playSegment(i));

    subsEl.appendChild(div);
  });

  // ontimeupdate：单句到点暂停 + list 高亮滚动 + single 跟随显示（可选）
  video.ontimeupdate = () => {
    const t = video.currentTime;

    // 单句播放到点暂停（仅当 segmentEnd != null 时）
    if (segmentEnd !== null && t >= segmentEnd) {
      video.pause();
      segmentEnd = null;
      return;
    }

    // List View 高亮 + 滚动
    if (viewMode === "list" && subsEl.children.length) {
      let idx = -1;
      lines.forEach((ln, i) => {
        const el = subsEl.children[i];
        const active = (t >= ln.start && t <= ln.end);
        el.style.background = active ? "#f2f2f2" : "#fff";
        if (active) idx = i;
      });

      if (idx >= 0) {
        subsEl.children[idx].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    // Single View：随播放更新显示（你如果不想“随播放自动换句”，删掉这段即可）
    if (viewMode === "single") {
      const idx = lines.findIndex(x => t >= x.start && t <= x.end);
      if (idx >= 0 && idx !== activeIndex) {
        activeIndex = idx;
        renderSingleBar();
      }
    }
  };
}

// ===== Step3/4 =====
function renderTranslate() {
  const answers = loadAnswers();
  translateEl.innerHTML = "";

  lines.forEach((ln, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="meta">${ln.start}s → ${ln.end}s</div>
      <div class="zh">${ln.zh || "（请在 lines JSON 里补充 zh 作为中文提示）"}</div>
      <textarea rows="2" data-i="${i}" placeholder="写你的英文翻译…"></textarea>
    `;

    const ta = div.querySelector("textarea");
    ta.value = answers[i] || "";
    ta.addEventListener("input", () => {
      const a = loadAnswers();
      a[i] = ta.value;
      saveAnswers(a);
    });

    // 双击跳转播放
    div.ondblclick = () => {
      playSegment(i); // 用单句播放更符合训练
    };

    translateEl.appendChild(div);
  });
}

function renderReview() {
  const answers = loadAnswers();
  reviewEl.innerHTML = "";

  lines.forEach((ln, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="meta">${ln.start}s → ${ln.end}s</div>
      <div class="meta">你的翻译</div>
      <div>${(answers[i] || "（未填写）")}</div>
      <div class="meta" style="margin-top:8px;">参考答案</div>
      <div class="en">${ln.en || ""}</div>
    `;

    div.ondblclick = () => playSegment(i);
    reviewEl.appendChild(div);
  });

  highlightsEl.innerHTML = "";
  (currentClip.highlights || []).forEach(h => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="en">${h.en || ""}</div>
      <div>${h.zh || ""}</div>
      <div class="meta">${h.note || ""}</div>
    `;
    highlightsEl.appendChild(div);
  });
}

// ===== Load clip =====
async function loadClipById(id) {
  currentClip = clips.find(c => c.id === id);
  if (!currentClip) return;

  // media
  video.src = currentClip.videoSrc;

  const rate = Number(speedSelect?.value || 1);
  video.playbackRate = rate;
  audio.playbackRate = rate;

  if (currentClip.audioSrc) {
    audio.src = currentClip.audioSrc;
    audio.classList.remove("hidden");
    mediaHint.textContent = "视频用于观看；音频可用于跟读（可选）。";
  } else {
    audio.classList.add("hidden");
    mediaHint.textContent = "视频用于观看（Step1 无字幕；Step2 点句子进行影子跟读）。";
  }

  // lines
  const res = await fetch(currentClip.linesSrc);
  lines = await res.json();

  // reset step & Step2 states
  step = 0;
  showZh = false;
  toggleZhBtn.textContent = "ZH Show";
  activeIndex = 0;
  segmentEnd = null;

  // keep viewMode as user last choice, but ensure UI reflects it
  setVisible();
  renderSubs();
  setViewMode(viewMode);
  renderTranslate();
  renderReview();
}

// ===== Events =====
if (speedSelect) {
  speedSelect.addEventListener("change", () => {
    const rate = Number(speedSelect.value);
    video.playbackRate = rate;
    audio.playbackRate = rate;
  });
}

viewListBtn.onclick = () => setViewMode("list");
viewSingleBtn.onclick = () => setViewMode("single");

toggleZhBtn.onclick = () => {
  showZh = !showZh;
  toggleZhBtn.textContent = showZh ? "ZH Hide" : "ZH Show";

  // 两种视图都要刷新
  if (viewMode === "list") renderSubs();
  if (viewMode === "single") renderSingleBar();
};

prevLineBtn.onclick = () => {
  activeIndex = Math.max(0, activeIndex - 1);
  playSegment(activeIndex);
};

nextLineBtn.onclick = () => {
  activeIndex = Math.min(lines.length - 1, activeIndex + 1);
  playSegment(activeIndex);
};

// 键盘左右箭头（只在 Step2 + 单句视图生效）
window.addEventListener("keydown", (e) => {
  if (step !== 1) return;
  if (viewMode !== "single") return;

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    prevLineBtn.click();
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    nextLineBtn.click();
  }
});

prevBtn.onclick = () => {
  step = Math.max(0, step - 1);
  setVisible();

  // 切页时重渲染，确保数据同步
  if (step === 1) { renderSubs(); setViewMode(viewMode); }
  if (step === 2) renderTranslate();
  if (step === 3) renderReview();
};

nextBtn.onclick = () => {
  // Step3 -> Step4 前校验
  if (step === 2) {
    const a = loadAnswers();
    const hasAny = a.some(x => (x || "").trim().length > 0);
    if (!hasAny) {
      alert("至少先写一句翻译再 Next（随便写也行）");
      return;
    }
  }

  step = Math.min(3, step + 1);
  setVisible();

  if (step === 1) { renderSubs(); setViewMode(viewMode); }
  if (step === 2) renderTranslate();
  if (step === 3) renderReview();
};

resetBtn.onclick = () => {
  localStorage.removeItem(keyAnswersStorageKey());
  step = 0;
  setVisible();

  // reset training
  segmentEnd = null;
  renderTranslate();
  renderReview();
};

// ===== Init =====
async function init() {
  const res = await fetch("./data/clips.json");
  clips = await res.json();

  clipSelect.innerHTML = "";
  clips.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.title;
    clipSelect.appendChild(opt);
  });

  clipSelect.addEventListener("change", () => loadClipById(clipSelect.value));

  if (clips.length) {
    clipSelect.value = clips[0].id;
    await loadClipById(clips[0].id);
  }
}

init();
