// right-sidebar.js — Day detail right sidebar (single-click a calendar day)

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderRightSidebar(dateStr) {
  const body = document.getElementById('right-sidebar-body');
  const dateHeading = document.getElementById('right-sidebar-date-heading');
  const dateSubtitle = document.getElementById('right-sidebar-date-subtitle');
  if (!body) return;

  if (dateHeading) dateHeading.textContent = formatDateLong(dateStr);
  if (dateSubtitle) {
    const du = daysUntil(dateStr);
    if (du === 0) dateSubtitle.textContent = 'Today';
    else if (du === 1) dateSubtitle.textContent = 'Tomorrow';
    else if (du === -1) dateSubtitle.textContent = 'Yesterday';
    else if (du > 0) dateSubtitle.textContent = `In ${du} days`;
    else dateSubtitle.textContent = `${Math.abs(du)} days ago`;
  }

  const examsOnDay   = state.exams.filter(e => e.date === dateStr);
  const blocksOnDay  = state.revisionBlocks.filter(b => b.date === dateStr);

  let html = '';

  // ── Exams section ──
  if (examsOnDay.length > 0) {
    html += `<div class="overlay-section-title">📋 Exams on this day</div>`;
    html += examsOnDay.map(exam => `
      <div class="overlay-exam-item">
        ${imgTag(IMG.alertCat, '', 'Exam')}
        <span class="exam-label">${escHtml(exam.name)}</span>
        <span class="exam-badge-label">EXAM DAY</span>
      </div>`).join('');
  }

  // ── Revision blocks section ──
  if (blocksOnDay.length > 0) {
    html += `<div class="overlay-section-title" style="margin-top:${examsOnDay.length?'16px':'0'}">📚 Revision sessions</div>`;
    html += blocksOnDay.map(block => {
      const exam = state.exams.find(e => e.id === block.examId);
      const examName = exam ? exam.name : 'Unknown exam';
      const mins = block.duration || 30;
      return `
        <div class="overlay-block-item block-c${block.colourIdx % 8}" data-block-id="${block.id}">
          <div class="overlay-block-header">
            <div class="block-color-dot block-c${block.colourIdx % 8}" style="width:12px;height:12px;border-radius:50%;flex-shrink:0;"></div>
            <span class="overlay-block-name">${escHtml(block.topicName)}</span>
            <span class="overlay-block-exam">${escHtml(examName)}</span>
            <button class="overlay-block-delete" data-block-id="${block.id}" title="Remove session" style="margin-left:auto;color:var(--text-muted);font-size:18px;transition:color 0.2s;" onmouseover="this.style.color='var(--red-pencil)'" onmouseout="this.style.color='var(--text-muted)'">×</button>
          </div>
          <div class="duration-row">
            <label for="dur-${block.id}">⏱ Duration:</label>
            <input class="duration-input" id="dur-${block.id}" type="number"
                   min="5" max="480" step="5"
                   value="${mins}" data-block-id="${block.id}" />
            <span>minutes</span>
          </div>
          <div class="notes-row">
            <label for="notes-${block.id}">
              ${imgTag(IMG.discussionDog,'','')} Notes
            </label>
            <textarea class="notes-textarea" id="notes-${block.id}"
                      placeholder="Add notes for this revision session…"
                      data-block-id="${block.id}">${escHtml(block.notes || '')}</textarea>
          </div>
        </div>`;
    }).join('');
  }

  // ── Empty state ──
  if (examsOnDay.length === 0 && blocksOnDay.length === 0) {
    html = `
      <div class="overlay-empty">
        ${imgTag(IMG.thinkingCat, '', 'Nothing scheduled')}
        <p>Nothing scheduled on this day.<br>Drag topics from the sidebar onto this date to add revision sessions.</p>
      </div>`;
  }

  body.innerHTML = html;
  attachOverlayEvents();
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
function attachOverlayEvents() {
  // Duration change
  document.querySelectorAll('.duration-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const val = Math.max(5, Math.min(480, parseInt(inp.value) || 30));
      inp.value = val;
      updateRevisionBlock(inp.dataset.blockId, { duration: val });
      renderAll();
    });
  });

  // Notes change
  document.querySelectorAll('.notes-textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      updateRevisionBlock(ta.dataset.blockId, { notes: ta.value });
    });
  });

  // Delete block from overlay
  document.querySelectorAll('.overlay-block-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteRevisionBlock(btn.dataset.blockId);
      renderAll();
    });
  });
}
