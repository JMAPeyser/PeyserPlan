// drag-drop.js — HTML5 drag & drop between sidebar topics and calendar cells

let dragPayload = null; // { type: 'new'|'move', examId, topicId, topicName, blockId }

// ── DRAG SOURCES (topic items in sidebar) ────────────────────────────────────
function initDragSources() {
  document.querySelectorAll('.topic-item[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragPayload = {
        type: 'new',
        examId:    item.dataset.examId,
        topicId:   item.dataset.topicId,
        topicName: item.dataset.topicName,
      };
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', item.dataset.topicName);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
  });
}

function initCalendarBlockDragSources() {
  document.querySelectorAll('.cal-revision-block[draggable="true"]').forEach(block => {
    block.addEventListener('dragstart', e => {
      e.stopPropagation();
      dragPayload = {
        type: 'move',
        blockId: block.dataset.blockId,
      };
      block.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'moving block');
    });

    block.addEventListener('dragend', () => {
      block.classList.remove('dragging');
    });
  });
}

// ── DROP TARGETS (calendar day cells) ────────────────────────────────────────
function initDropTargets() {
  document.querySelectorAll('.day-cell').forEach(cell => {
    cell.addEventListener('dragover', e => {
      if (!dragPayload) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = dragPayload.type === 'move' ? 'move' : 'copy';
      cell.classList.add('drag-over');
    });

    cell.addEventListener('dragleave', e => {
      // Only remove if leaving the cell itself (not a child)
      if (!cell.contains(e.relatedTarget)) {
        cell.classList.remove('drag-over');
      }
    });

    cell.addEventListener('drop', e => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      if (!dragPayload) return;

      const dateStr = cell.dataset.date;
      if (!dateStr) return;

      if (dragPayload.type === 'new' || !dragPayload.type) {
        addRevisionBlock(dragPayload.topicId, dragPayload.examId, dateStr);
      } else if (dragPayload.type === 'move') {
        updateRevisionBlock(dragPayload.blockId, { date: dateStr });
      }
      
      dragPayload = null;
      renderAll();
    });
  });
}
