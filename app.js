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

const STEP_TEXT = [
  "Step 1/4: No subs",
  "Step 2/4: EN list (jump)",
  "Step 3/4: CN→EN",
  "Step 4/4: Review"
];

let clips = [];
let currentClip = null;
let lines = [];
let step = 0;

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
  return `answers:${currentClip.id}`;
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

function renderSubs() {
  subsEl.innerHTML = "";
  lines.forEach((ln, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="meta">${ln.start}s → ${ln.end}s</div>
      <div class="en">${ln.en || ""}</div>
      ${ln.zh ? `<div class="zh">${ln.zh}</div>` : ""}
    `;
    div.onclick = () => {
      video.currentTime = ln.start;
      video.play();
    };
    subsEl.appendChild(div);
  });

  video.ontimeupdate = () => {
  const t = video.currentTime;
  let activeIndex = -1;

  lines.forEach((ln, i) => {
    const el = subsEl.children[i];
    const active = (t >= ln.start && t <= ln.end);
    el.style.background = active ? "#f2f2f2" : "#fff";
    if (active) activeIndex = i;
  });

  // 自动滚动到当前句（只在找到当前句时触发）
  if (activeIndex >= 0) {
    const activeEl = subsEl.children[activeIndex];
    activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};
}

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

    // 双击卡片跳转播放
    div.ondblclick = () => {
      video.currentTime = ln.start;
      video.play();
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
    div.ondblclick = () => {
      video.currentTime = ln.start;
      video.play();
    };
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

async function loadClipById(id) {
  currentClip = clips.find(c => c.id === id);
  if (!currentClip) return;

  // media
  video.src = currentClip.videoSrc;
  const rate = Number(speedSelect.value || 1);
video.playbackRate = rate;
audio.playbackRate = rate;
  if (currentClip.audioSrc) {
    audio.src = currentClip.audioSrc;
    audio.classList.remove("hidden");
    mediaHint.textContent = "视频用于观看；音频可用于跟读（可选）。";
  } else {
    audio.classList.add("hidden");
    mediaHint.textContent = "视频用于观看（无字幕 Step1 / 英文句子 Step2 点击跳转）。";
  }

  // lines
  const res = await fetch(currentClip.linesSrc);
  lines = await res.json();

  // reset step
  step = 0;
  setVisible();
  renderSubs();
  renderTranslate();
  renderReview();
}
speedSelect.addEventListener("change", () => {
  const rate = Number(speedSelect.value);
  video.playbackRate = rate;
  audio.playbackRate = rate;
});
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

prevBtn.onclick = () => {
  step = Math.max(0, step - 1);
  setVisible();
  if (step === 1) renderSubs();
  if (step === 2) renderTranslate();
  if (step === 3) renderReview();
};
nextBtn.onclick = () => {
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
  if (step === 1) renderSubs();
  if (step === 2) renderTranslate();
  if (step === 3) renderReview();
};
resetBtn.onclick = () => {
  localStorage.removeItem(`answers:${currentClip.id}`);
  step = 0;
  setVisible();
  renderTranslate();
  renderReview();
};

init();
