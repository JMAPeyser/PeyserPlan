// ── STATE ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'peyserplan_v1';

let state = {
  exams: [],
  revisionBlocks: [],
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(), // 0-indexed
  selectedDateStr: null,
};

function genId() { return '_' + Math.random().toString(36).slice(2, 10); }

// ── PERSISTENCE ────────────────────────────────────────────────────────────
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
      if (!parsed.currentYear) state.currentYear = new Date().getFullYear();
      if (parsed.currentMonth === undefined) state.currentMonth = new Date().getMonth();
      // Initialize topic colours if missing
      state.exams.forEach(exam => {
        exam.topics.forEach(t => {
          if (t.colourIdx === undefined) {
            t.colourIdx = colourCursor % 8; // BLOCK_COLOURS
            colourCursor++;
          }
        });
      });
      // Restore colourCursor from existing blocks and topics
      let maxColour = -1;
      state.revisionBlocks.forEach(b => maxColour = Math.max(maxColour, b.colourIdx ?? -1));
      state.exams.forEach(e => e.topics.forEach(t => maxColour = Math.max(maxColour, t.colourIdx ?? -1)));
      if (maxColour >= 0) {
        colourCursor = maxColour + 1;
      }
    }
  } catch(e) { console.warn('Could not load state', e); }
  
  if (!state.selectedDateStr) {
    const today = new Date();
    state.selectedDateStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  }
}

// ── EXAM CRUD ───────────────────────────────────────────────────────────────
function addExam(name, date) {
  const exam = { id: genId(), name: name.trim(), date, topics: [], colourIdx: colourCursor % BLOCK_COLOURS };
  colourCursor++;
  state.exams.push(exam);
  saveState();
  return exam;
}
function updateExam(id, fields) {
  const exam = state.exams.find(e => e.id === id);
  if (exam) { Object.assign(exam, fields); saveState(); }
}
function deleteExam(id) {
  state.exams = state.exams.filter(e => e.id !== id);
  state.revisionBlocks = state.revisionBlocks.filter(b => b.examId !== id);
  saveState();
}

// ── TOPIC CRUD ──────────────────────────────────────────────────────────────
function addTopic(examId, name) {
  const exam = state.exams.find(e => e.id === examId);
  if (!exam) return;
  const topic = { id: genId(), name: name.trim(), confidence: 0, colourIdx: colourCursor % BLOCK_COLOURS };
  colourCursor++;
  exam.topics.push(topic);
  saveState();
  return topic;
}
function updateTopic(examId, topicId, fields) {
  const exam = state.exams.find(e => e.id === examId);
  if (!exam) return;
  const topic = exam.topics.find(t => t.id === topicId);
  if (topic) {
    if (fields.name !== undefined && fields.name !== topic.name) {
      state.revisionBlocks.forEach(b => {
        if (b.examId === examId && b.topicName === topic.name) {
          b.topicName = fields.name;
        }
      });
    }
    Object.assign(topic, fields);
    saveState();
  }
}
function deleteTopic(examId, topicId) {
  const exam = state.exams.find(e => e.id === examId);
  if (!exam) return;
  exam.topics = exam.topics.filter(t => t.id !== topicId);
  saveState();
}

// ── REVISION BLOCK CRUD ─────────────────────────────────────────────────────
const BLOCK_COLOURS = 8; // matches .block-c0 … .block-c7
let colourCursor = 0;

function addRevisionBlock(topicId, examId, dateStr) {
  const exam = state.exams.find(e => e.id === examId);
  const topic = exam?.topics.find(t => t.id === topicId);
  if (!topic) return;
  
  let colourIdx = topic.colourIdx;
  if (colourIdx === undefined) {
    colourIdx = colourCursor % BLOCK_COLOURS;
    colourCursor++;
  }
  
  const block = {
    id: genId(),
    topicName: topic.name,
    examId,
    date: dateStr,
    duration: 30,
    notes: '',
    colourIdx,
  };
  state.revisionBlocks.push(block);
  saveState();
  return block;
}
function updateRevisionBlock(id, fields) {
  const block = state.revisionBlocks.find(b => b.id === id);
  if (block) { Object.assign(block, fields); saveState(); }
}
function deleteRevisionBlock(id) {
  state.revisionBlocks = state.revisionBlocks.filter(b => b.id !== id);
  saveState();
}

// ── DATE HELPERS ─────────────────────────────────────────────────────────────
function toDateStr(year, month, day) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function parseDateStr(str) {
  // Returns { year, month (0-idx), day }
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}
function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── IMAGES ───────────────────────────────────────────────────────────────────
const IMG = {
  scienceDog:    'images/science-dog.png',
  alertCat:      'images/alert-cat.png',
  confusedCat:   'images/confused-cat.png',
  computerDog:   'images/computer-dog.png',
  writingCat:    'images/writing-cat.png',
  assessDog:     'images/assess-dog.png',
  discussionDog: 'images/discussion-dog.png',
  thinkingCat:   'images/thinking-cat.png',
};
function imgTag(src, cls='', alt='') {
  return `<img src="${src}" class="${cls}" alt="${alt}" onerror="this.style.display='none'">`;
}

// ── RENDER SIDEBAR ────────────────────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('exam-list');
  if (!list) return;

  if (state.exams.length === 0) {
    list.innerHTML = `
      <div class="sidebar-empty">
        ${imgTag(IMG.confusedCat, '', 'No exams yet')}
        <p>No exams yet!<br>Add one above to get started.</p>
      </div>`;
    return;
  }

  list.innerHTML = state.exams.map(exam => {
    const du = daysUntil(exam.date);
    let countdownClass = '';
    let countdownText = '';
    if (du !== null) {
      if (du < 0) { countdownText = 'Done'; countdownClass = ''; }
      else if (du === 0) { countdownText = 'TODAY!'; countdownClass = 'urgent'; }
      else if (du <= 7)  { countdownText = `${du}d`; countdownClass = 'urgent'; }
      else if (du <= 21) { countdownText = `${du}d`; countdownClass = 'soon'; }
      else               { countdownText = `${du}d`; }
    }

    const topicsHtml = exam.topics.map(topic => {
      const stars = [1,2,3,4].map(n =>
        `<span class="star ${topic.confidence >= n ? 'active' : ''}"
              data-exam="${exam.id}" data-topic="${topic.id}" data-star="${n}"
              title="${n} star${n>1?'s':''}">★</span>`
      ).join('');
      
      const topicBlocks = state.revisionBlocks.filter(b => b.examId === exam.id && b.topicName === topic.name);
      const numBlocks = topicBlocks.length;
      let statsHtml = '';
      if (numBlocks > 0) {
        const totalMins = topicBlocks.reduce((sum, b) => sum + parseInt(b.duration || 30), 0);
        const timeLabel = totalMins >= 60 ? `${Math.floor(totalMins/60)}h${totalMins%60 ? (totalMins%60)+'m' : ''}` : `${totalMins}m`;
        statsHtml = `<div class="topic-stats">${numBlocks} session${numBlocks !== 1 ? 's' : ''} &bull; ${timeLabel} total</div>`;
      }

      return `
        <div class="topic-item" draggable="true"
             data-exam-id="${exam.id}" data-topic-id="${topic.id}" data-topic-name="${escHtml(topic.name)}">
          <div class="topic-main-row">
            <span class="drag-handle" title="Drag to calendar">⠿</span>
            <div class="block-color-dot topic-color-btn block-c${(topic.colourIdx ?? 0) % BLOCK_COLOURS}" 
                 data-exam="${exam.id}" data-topic="${topic.id}" title="Click to change colour"
                 style="width:10px;height:10px;flex-shrink:0;cursor:pointer;"></div>
            <input class="topic-name" type="text" value="${escHtml(topic.name)}"
                   data-exam="${exam.id}" data-topic="${topic.id}"
                   placeholder="Topic name" />
            <button class="topic-delete" data-exam="${exam.id}" data-topic="${topic.id}" title="Delete topic">×</button>
          </div>
          <div class="topic-bottom-row">
            ${statsHtml}
            <div class="star-rating">${stars}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="exam-card" data-exam-id="${exam.id}">
        <div class="exam-card-header">
          <div class="exam-icon-container" style="display:flex; flex-direction:column; align-items:center; gap:6px; flex-shrink:0;">
            ${imgTag(IMG.alertCat, 'exam-icon', 'Exam')}
            <div class="block-color-dot exam-color-btn block-c${(exam.colourIdx ?? 0) % BLOCK_COLOURS}" 
                 data-exam="${exam.id}" title="Click to change colour"
                 style="width:10px;height:10px;flex-shrink:0;cursor:pointer;"></div>
          </div>
          <div class="exam-info">
            <input class="exam-name-input" type="text" value="${escHtml(exam.name)}"
                   data-exam="${exam.id}" placeholder="Exam name" />
            <input class="exam-date-input" type="date" value="${exam.date || ''}"
                   data-exam="${exam.id}" />
          </div>
          ${countdownText ? `<span class="exam-countdown ${countdownClass}">${countdownText}</span>` : ''}
          <button class="exam-delete-btn" data-exam="${exam.id}" title="Delete exam">×</button>
        </div>
        <div class="topic-list" id="topics-${exam.id}">
          ${topicsHtml}
        </div>
        ${exam.topics.length > 0 ? `<div class="drag-tip">⠿ Drag topics onto calendar days</div>` : ''}
        <div class="add-topic-row">
          <input class="add-topic-input" type="text" placeholder="New topic…" data-exam="${exam.id}" />
          <button class="add-topic-btn" data-exam="${exam.id}">+ Add</button>
        </div>
      </div>`;
  }).join('');

  attachSidebarEvents();
}

function attachSidebarEvents() {
  // Change exam colour
  document.querySelectorAll('.exam-color-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const exam = state.exams.find(ex => ex.id === btn.dataset.exam);
      if (exam) {
        exam.colourIdx = ((exam.colourIdx ?? 0) + 1) % BLOCK_COLOURS;
        saveState();
        renderAll();
      }
    });
  });

  // Change topic colour
  document.querySelectorAll('.topic-color-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const exam = state.exams.find(ex => ex.id === btn.dataset.exam);
      if (exam) {
        const topic = exam.topics.find(t => t.id === btn.dataset.topic);
        if (topic) {
          topic.colourIdx = ((topic.colourIdx ?? 0) + 1) % BLOCK_COLOURS;
          state.revisionBlocks.forEach(b => {
            if (b.examId === exam.id && b.topicName === topic.name) {
              b.colourIdx = topic.colourIdx;
            }
          });
          saveState();
          renderAll();
        }
      }
    });
  });

  // Delete exam
  document.querySelectorAll('.exam-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('Delete this exam and all its revision blocks?')) {
        deleteExam(btn.dataset.exam);
        renderAll();
      }
    });
  });

  // Edit exam name
  document.querySelectorAll('.exam-name-input').forEach(inp => {
    inp.addEventListener('change', () => {
      updateExam(inp.dataset.exam, { name: inp.value });
      renderCalendar();
    });
  });

  // Edit exam date
  document.querySelectorAll('.exam-date-input').forEach(inp => {
    inp.addEventListener('change', () => {
      updateExam(inp.dataset.exam, { date: inp.value });
      renderAll();
    });
  });

  // Star rating
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const { exam, topic, star: n } = star.dataset;
      updateTopic(exam, topic, { confidence: Number(n) });
      renderSidebar();
    });
    star.addEventListener('mouseover', () => {
      const n = Number(star.dataset.star);
      const examId = star.dataset.exam; const topicId = star.dataset.topic;
      document.querySelectorAll(`.star[data-exam="${examId}"][data-topic="${topicId}"]`)
        .forEach(s => s.style.color = Number(s.dataset.star) <= n ? 'var(--amber)' : '');
    });
    star.addEventListener('mouseout', () => {
      const examId = star.dataset.exam; const topicId = star.dataset.topic;
      const exam = state.exams.find(e => e.id === examId);
      const topic = exam?.topics.find(t => t.id === topicId);
      document.querySelectorAll(`.star[data-exam="${examId}"][data-topic="${topicId}"]`)
        .forEach(s => s.style.color = Number(s.dataset.star) <= (topic?.confidence||0) ? 'var(--amber)' : '');
    });
  });

  // Delete topic
  document.querySelectorAll('.topic-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteTopic(btn.dataset.exam, btn.dataset.topic);
      renderAll();
    });
  });

  // Edit topic name
  document.querySelectorAll('.topic-name').forEach(inp => {
    inp.addEventListener('change', () => {
      updateTopic(inp.dataset.exam, inp.dataset.topic, { name: inp.value });
      renderAll();
    });
    inp.addEventListener('blur', () => saveState());
  });

  // Add topic
  document.querySelectorAll('.add-topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const examId = btn.dataset.exam;
      const inp = document.querySelector(`.add-topic-input[data-exam="${examId}"]`);
      if (!inp || !inp.value.trim()) return;
      addTopic(examId, inp.value);
      inp.value = '';
      renderAll();
    });
  });
  document.querySelectorAll('.add-topic-input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const examId = inp.dataset.exam;
        if (!inp.value.trim()) return;
        addTopic(examId, inp.value);
        inp.value = '';
        renderAll();
      }
    });
  });

  // Drag events (topics)
  initDragSources();
}

// ── RENDER CALENDAR ───────────────────────────────────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('month-label');
  if (!grid || !label) return;

  const { currentYear: yr, currentMonth: mo } = state;
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  label.textContent = `${monthNames[mo]} ${yr}`;

  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const firstDay = new Date(yr, mo, 1);
  const lastDay  = new Date(yr, mo + 1, 0);
  // Week starts Monday: shift sunday (0) → 6, else day-1
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells = [];

  // Prefix cells from previous month
  const prevLastDay = new Date(yr, mo, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    const ds = toDateStr(yr, mo - 1, d);
    cells.push({ day: d, dateStr: ds, thisMonth: false });
  }
  // This month
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, dateStr: toDateStr(yr, mo, d), thisMonth: true });
  }
  // Suffix cells
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, dateStr: toDateStr(yr, mo + 1, d), thisMonth: false });
  }

  grid.innerHTML = cells.map(cell => {
    const isToday = cell.dateStr === todayStr;
    const isSelected = cell.dateStr === state.selectedDateStr;

    // Exams on this day
    const examsOnDay = state.exams.filter(e => e.date === cell.dateStr);
    const examBadges = examsOnDay.map(e =>
      `<div class="cal-exam-badge block-c${(e.colourIdx ?? 0) % BLOCK_COLOURS}">${imgTag(IMG.alertCat,'','!')}${escHtml(e.name)}</div>`
    ).join('');

    // Revision blocks on this day
    const blocksOnDay = state.revisionBlocks.filter(b => b.date === cell.dateStr);
    const blockHtml = blocksOnDay.map(b => {
      const mins = b.duration || 30;
      const timeLabel = mins >= 60
        ? `${Math.floor(mins/60)}h${mins%60 ? (mins%60)+'m' : ''}`
        : `${mins}m`;
      return `
        <div class="cal-revision-block block-c${b.colourIdx % BLOCK_COLOURS}" draggable="true"
             data-block-id="${b.id}" title="${escHtml(b.topicName)} — ${timeLabel}">
          ${escHtml(b.topicName)}
          <span class="block-time">${timeLabel}</span>
          <button class="block-delete" data-block-id="${b.id}" title="Remove">×</button>
        </div>`;
    }).join('');

    return `
      <div class="day-cell ${!cell.thisMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
           data-date="${cell.dateStr}">
        <div class="day-number">${cell.day}</div>
        ${examBadges}
        ${blockHtml}
      </div>`;
  }).join('');

  attachCalendarEvents();
}

function attachCalendarEvents() {
  // Single-click to select day and update right sidebar
  document.querySelectorAll('.day-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      state.selectedDateStr = cell.dataset.date;
      saveState();
      
      // Update cell visuals
      document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      
      if (typeof renderRightSidebar === 'function') {
        renderRightSidebar(state.selectedDateStr);
      }
    });
  });

  // Delete revision block
  document.querySelectorAll('.block-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteRevisionBlock(btn.dataset.blockId);
      renderAll();
    });
  });

  initDropTargets();
  initCalendarBlockDragSources();
}

// ── FULL RENDER ────────────────────────────────────────────────────────────────
function renderAll() {
  renderSidebar();
  renderCalendar();
  if (typeof renderRightSidebar === 'function') {
    renderRightSidebar(state.selectedDateStr);
  }
}

// ── ADD EXAM FORM ──────────────────────────────────────────────────────────────
function initAddExamForm() {
  const btn  = document.getElementById('add-exam-btn');
  const name = document.getElementById('new-exam-name');
  const date = document.getElementById('new-exam-date');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!name.value.trim()) { name.focus(); return; }
    addExam(name.value, date.value);
    name.value = ''; date.value = '';
    renderAll();
  });
  name.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
}

// ── MONTH NAV ─────────────────────────────────────────────────────────────────
function initMonthNav() {
  document.getElementById('prev-month')?.addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    saveState();
    renderCalendar();
  });
  document.getElementById('next-month')?.addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    saveState();
    renderCalendar();
  });
}

// ── UTILITY ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── AUTO-GENERATE PLAN ────────────────────────────────────────────────────────

function autoGeneratePlan(hoursPerDay, topicsPerDay) {
  const x = topicsPerDay; // sessions per day

  // 1. Collect all topics and compute weight a = 5 − confidence
  //    (0 stars → a=5, 1→4, 2→3, 3→2, 4→1)
  const allTopics = [];
  state.exams.forEach(exam => {
    if (!exam.date) return;
    exam.topics.forEach(topic => {
      const confidence = topic.confidence || 0;
      const a = 5 - confidence;
      allTopics.push({
        examId: exam.id,
        topicId: topic.id,
        topicName: topic.name,
        examDate: exam.date,
        confidence,
        a,
        colourIdx: topic.colourIdx ?? 0,
        targetSessions: 0,
      });
    });
  });

  if (allTopics.length === 0) {
    alert('Please add at least one exam with topics and a date before generating a plan.');
    return;
  }

  // 2. Group topics by exam, calculate y and z, then target sessions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group by examId
  const examGroups = {};
  allTopics.forEach(t => {
    if (!examGroups[t.examId]) {
      examGroups[t.examId] = { topics: [], examDate: t.examDate };
    }
    examGroups[t.examId].topics.push(t);
  });

  let anySchedulable = false;
  for (const examId in examGroups) {
    const group = examGroups[examId];
    const examDate = new Date(group.examDate + 'T00:00:00');
    const z = Math.round((examDate - today) / 86400000); // days until exam

    if (z <= 0) continue; // exam already passed or today

    const y = group.topics.reduce((sum, t) => sum + t.a, 0); // sum of weights

    group.topics.forEach(t => {
      // target sessions = x * z * a / y
      t.targetSessions = Math.round(x * z * t.a / y);
      if (t.targetSessions < 1) t.targetSessions = 1; // at least one session
      anySchedulable = true;
    });
  }

  if (!anySchedulable) {
    alert('All exam dates are today or in the past. Cannot generate a revision plan.');
    return;
  }

  // 3. Clear existing revision blocks
  state.revisionBlocks = [];

  // 4. Build the list of days from today to the day before the latest exam
  const examDates = allTopics.filter(t => t.targetSessions > 0)
                             .map(t => new Date(t.examDate + 'T00:00:00'));
  const latestExam = new Date(Math.max(...examDates));
  const days = [];
  const cursor = new Date(today);
  while (cursor < latestExam) {
    days.push(toDateStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }

  // 5. Calculate session duration
  const sessionDuration = Math.round((hoursPerDay * 60) / topicsPerDay);

  // 6. Distribute sessions day-by-day
  const topicKey = (t) => t.examId + '|' + t.topicId;
  const sessionCounts = {};
  allTopics.forEach(t => sessionCounts[topicKey(t)] = 0);
  let yesterdayTopics = new Set();

  for (const dayStr of days) {
    const dayDate = new Date(dayStr + 'T00:00:00');

    // Filter to topics that still need sessions and whose exam is after this day
    let candidates = allTopics.filter(t => {
      if (t.targetSessions <= 0) return false;
      const examD = new Date(t.examDate + 'T00:00:00');
      if (examD <= dayDate) return false;
      const current = sessionCounts[topicKey(t)] || 0;
      return current < t.targetSessions;
    });

    if (candidates.length === 0) continue;

    // Exclude topics scheduled yesterday (no consecutive days)
    let eligible = candidates.filter(t => !yesterdayTopics.has(topicKey(t)));
    if (eligible.length === 0) eligible = candidates; // fallback

    // Sort by proportion of sessions still remaining (most remaining first)
    eligible.sort((a, b) => {
      const remainA = a.targetSessions - (sessionCounts[topicKey(a)] || 0);
      const remainB = b.targetSessions - (sessionCounts[topicKey(b)] || 0);
      const ratioA = remainA / a.targetSessions;
      const ratioB = remainB / b.targetSessions;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return remainB - remainA; // tie-break: more absolute remaining first
    });

    // Pick up to x sessions for today
    const todayTopics = new Set();
    const picked = eligible.slice(0, x);

    for (const t of picked) {
      const block = {
        id: genId(),
        topicName: t.topicName,
        examId: t.examId,
        date: dayStr,
        duration: sessionDuration,
        notes: '',
        colourIdx: t.colourIdx % BLOCK_COLOURS,
      };
      state.revisionBlocks.push(block);
      sessionCounts[topicKey(t)] = (sessionCounts[topicKey(t)] || 0) + 1;
      todayTopics.add(topicKey(t));
    }

    yesterdayTopics = todayTopics;
  }

  saveState();
  renderAll();
}

// ── AUTOGEN MODAL ─────────────────────────────────────────────────────────────

function initAutoGenModal() {
  const openBtn = document.getElementById('autogen-open-btn');
  const clearBtn = document.getElementById('clear-plan-btn');
  const modal = document.getElementById('autogen-modal');
  const cancelBtn = document.getElementById('autogen-cancel-btn');
  const confirmBtn = document.getElementById('autogen-confirm-btn');
  const hoursInput = document.getElementById('autogen-hours');
  const topicsInput = document.getElementById('autogen-topics');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', () => {
    if (state.exams.length === 0) {
      alert('Add at least one exam with topics first!');
      return;
    }
    const hasTopics = state.exams.some(e => e.topics.length > 0 && e.date);
    if (!hasTopics) {
      alert('Add topics to your exams and set exam dates first!');
      return;
    }
    modal.style.display = 'flex';
  });

  cancelBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  confirmBtn?.addEventListener('click', () => {
    const hours = parseFloat(hoursInput.value) || 2;
    const topics = parseInt(topicsInput.value) || 4;

    if (hours <= 0 || topics <= 0) {
      alert('Please enter positive values for hours and topics.');
      return;
    }

    modal.style.display = 'none';
    autoGeneratePlan(hours, topics);
  });

  // Clear plan button
  clearBtn?.addEventListener('click', () => {
    if (state.revisionBlocks.length === 0) {
      alert('No revision sessions to clear.');
      return;
    }
    if (confirm('Are you sure you want to clear all revision sessions from the calendar?')) {
      state.revisionBlocks = [];
      saveState();
      renderAll();
    }
  });
}

// ── EXPORT ───────────────────────────────────────────────────────────────────

function initExportButtons() {
  const btnICS = document.getElementById('export-ics-btn');
  const btnPDF = document.getElementById('export-pdf-btn');

  if (btnPDF) {
    btnPDF.addEventListener('click', () => {
      window.print();
    });
  }

  if (btnICS) {
    btnICS.addEventListener('click', () => {
      let icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PeyserPlan//Revision Planner//EN',
        'CALSCALE:GREGORIAN',
      ];

      const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      // Exams
      state.exams.forEach(exam => {
        if (!exam.date) return;
        const start = exam.date.replace(/-/g, '');
        const nextDate = new Date(exam.date + 'T00:00:00');
        nextDate.setDate(nextDate.getDate() + 1);
        const end = toDateStr(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()).replace(/-/g, '');

        icsLines.push(
          'BEGIN:VEVENT',
          `UID:exam-${exam.id}@peyserplan`,
          `DTSTAMP:${nowStr}`,
          `DTSTART;VALUE=DATE:${start}`,
          `DTEND;VALUE=DATE:${end}`,
          `SUMMARY:EXAM: ${exam.name}`,
          'END:VEVENT'
        );
      });

      // Revision Blocks
      state.revisionBlocks.forEach(block => {
        if (!block.date) return;
        const start = block.date.replace(/-/g, '');
        const nextDate = new Date(block.date + 'T00:00:00');
        nextDate.setDate(nextDate.getDate() + 1);
        const end = toDateStr(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()).replace(/-/g, '');

        const mins = block.duration || 30;
        const timeLabel = mins >= 60
          ? `${Math.floor(mins/60)}h${mins%60 ? (mins%60)+'m' : ''}`
          : `${mins}m`;

        const exam = state.exams.find(e => e.id === block.examId);
        const examName = exam ? exam.name : 'Unknown exam';

        const summary = `[${timeLabel}] ${block.topicName}`;
        const description = `Revision for ${examName}.\\n\\n${block.notes ? block.notes.replace(/\n/g, '\\n') : ''}`;

        icsLines.push(
          'BEGIN:VEVENT',
          `UID:block-${block.id}@peyserplan`,
          `DTSTAMP:${nowStr}`,
          `DTSTART;VALUE=DATE:${start}`,
          `DTEND;VALUE=DATE:${end}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          'END:VEVENT'
        );
      });

      icsLines.push('END:VCALENDAR');

      const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PeyserPlan.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initAddExamForm();
  initMonthNav();
  initAutoGenModal();
  initExportButtons();
  renderAll();
});
