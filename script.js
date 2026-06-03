const STORAGE_CHORES = "dailyFlow_chores";
const STORAGE_DONE = "dailyFlow_done";

const todayLabel = document.getElementById("today-label");
const statsLine = document.getElementById("stats-line");
const flowList = document.getElementById("flow-list");
const emptyState = document.getElementById("empty-state");
const addForm = document.getElementById("add-chore");
const resetDayBtn = document.getElementById("reset-day");

const timerDisplay = document.getElementById("timer-display");
const timerMinutesInput = document.getElementById("timer-minutes");
const timerStart = document.getElementById("timer-start");
const timerPause = document.getElementById("timer-pause");
const timerReset = document.getElementById("timer-reset");
const timerStatus = document.getElementById("timer-status");

let chores = [];
let doneToday = {};
let timerSecondsLeft = 25 * 60;
let timerRunning = false;
let timerIntervalId = null;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadData() {
  try {
    chores = JSON.parse(localStorage.getItem(STORAGE_CHORES) || "[]");
  } catch {
    chores = [];
  }

  try {
    const allDone = JSON.parse(localStorage.getItem(STORAGE_DONE) || "{}");
    doneToday = allDone[todayKey()] || {};
  } catch {
    doneToday = {};
  }
}

function saveChores() {
  localStorage.setItem(STORAGE_CHORES, JSON.stringify(chores));
}

function saveDone() {
  let allDone = {};
  try {
    allDone = JSON.parse(localStorage.getItem(STORAGE_DONE) || "{}");
  } catch {
    allDone = {};
  }
  allDone[todayKey()] = doneToday;
  localStorage.setItem(STORAGE_DONE, JSON.stringify(allDone));
}

function formatTodayHeader() {
  const now = new Date();
  todayLabel.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function parseTimeToday(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function getTimeStatus(chore) {
  if (doneToday[chore.id]) return { label: "Done", className: "status-done" };

  if (!chore.time) {
    return { label: "Anytime today", className: "status-anytime" };
  }

  const due = parseTimeToday(chore.time);
  const now = new Date();
  const diffMs = due - now;

  if (diffMs > 60 * 60 * 1000) {
    const hours = Math.ceil(diffMs / (60 * 60 * 1000));
    return { label: `Upcoming · due ${formatTime12(chore.time)} (in ~${hours}h)`, className: "status-upcoming" };
  }

  if (diffMs > 0) {
    const mins = Math.ceil(diffMs / 60000);
    return { label: `Due soon · ${formatTime12(chore.time)} (in ${mins} min)`, className: "status-due" };
  }

  const overdueMins = Math.floor(-diffMs / 60000);
  if (overdueMins < 60) {
    return { label: `Overdue by ${overdueMins} min`, className: "status-overdue" };
  }
  const hours = Math.floor(overdueMins / 60);
  return { label: `Overdue by ${hours}h ${overdueMins % 60}m`, className: "status-overdue" };
}

function formatTime12(timeStr) {
  const d = parseTimeToday(timeStr);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function updateStats() {
  const total = chores.length;
  const done = chores.filter((c) => doneToday[c.id]).length;
  statsLine.textContent = `${done} of ${total} done today`;
}

function renderFlow() {
  flowList.innerHTML = "";
  emptyState.classList.toggle("hidden", chores.length > 0);

  chores.forEach((chore) => {
    const li = document.createElement("li");
    li.className = "flow-item" + (doneToday[chore.id] ? " done" : "");
    li.dataset.id = chore.id;

    const status = getTimeStatus(chore);

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "flow-check";
    check.checked = !!doneToday[chore.id];
    check.addEventListener("change", () => {
      doneToday[chore.id] = check.checked;
      saveDone();
      renderFlow();
    });

    const body = document.createElement("div");
    body.className = "flow-body";

    const title = document.createElement("p");
    title.className = "flow-title";
    title.textContent = chore.title;

    body.appendChild(title);

    if (chore.description) {
      const desc = document.createElement("p");
      desc.className = "flow-desc";
      desc.textContent = chore.description;
      body.appendChild(desc);
    }

    const meta = document.createElement("p");
    meta.className = `flow-meta ${status.className}`;
    meta.textContent = status.label;
    body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "flow-actions";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "Remove";
    del.addEventListener("click", () => {
      chores = chores.filter((c) => c.id !== chore.id);
      delete doneToday[chore.id];
      saveChores();
      saveDone();
      renderFlow();
    });
    actions.appendChild(del);

    li.append(check, body, actions);
    flowList.appendChild(li);
  });

  updateStats();
}

function formatTimerDisplay(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function stopTimerInterval() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerRunning = false;
}

function tickTimer() {
  if (timerSecondsLeft <= 0) {
    stopTimerInterval();
    timerDisplay.textContent = "00:00";
    timerStatus.textContent = "Time's up! Take a break or start again.";
    return;
  }
  timerSecondsLeft -= 1;
  timerDisplay.textContent = formatTimerDisplay(timerSecondsLeft);
  timerStatus.textContent = "Running…";
}

function seedExampleChoresIfEmpty() {
  if (chores.length > 0) return;
  chores = [
    {
      id: crypto.randomUUID(),
      title: "Water trees / plants",
      description: "Check soil — skip if it rained.",
      time: "08:00",
    },
    {
      id: crypto.randomUUID(),
      title: "Feed dogs",
      description: "Morning meal + fresh water.",
      time: "07:30",
    },
  ];
  saveChores();
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("chore-title").value.trim();
  const description = document.getElementById("chore-desc").value.trim();
  const time = document.getElementById("chore-time").value;

  if (!title) return;

  chores.push({
    id: crypto.randomUUID(),
    title,
    description,
    time: time || null,
  });

  saveChores();
  addForm.reset();
  renderFlow();
});

resetDayBtn.addEventListener("click", () => {
  if (!confirm("Uncheck all chores for today? (Chores stay in your list.)")) return;
  doneToday = {};
  saveDone();
  renderFlow();
});

timerStart.addEventListener("click", () => {
  if (!timerRunning) {
    if (timerSecondsLeft <= 0) {
      const mins = Math.max(1, Number(timerMinutesInput.value) || 25);
      timerSecondsLeft = mins * 60;
    }
    timerRunning = true;
    timerIntervalId = setInterval(tickTimer, 1000);
    timerStatus.textContent = "Running…";
  }
});

timerPause.addEventListener("click", () => {
  stopTimerInterval();
  timerStatus.textContent = "Paused";
});

timerReset.addEventListener("click", () => {
  stopTimerInterval();
  const mins = Math.max(1, Number(timerMinutesInput.value) || 25);
  timerSecondsLeft = mins * 60;
  timerDisplay.textContent = formatTimerDisplay(timerSecondsLeft);
  timerStatus.textContent = "Ready";
});

timerMinutesInput.addEventListener("change", () => {
  if (!timerRunning) {
    const mins = Math.max(1, Number(timerMinutesInput.value) || 25);
    timerSecondsLeft = mins * 60;
    timerDisplay.textContent = formatTimerDisplay(timerSecondsLeft);
  }
});

loadData();
formatTodayHeader();
seedExampleChoresIfEmpty();
renderFlow();

timerDisplay.textContent = formatTimerDisplay(timerSecondsLeft);

setInterval(() => {
  if (chores.length > 0) renderFlow();
}, 30000);
