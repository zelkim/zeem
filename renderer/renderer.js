const api = window.zeem;

const addBtn = document.getElementById('add-btn');
const meetingsList = document.getElementById('meetings-list');
const editModal = document.getElementById('edit-modal');
const confirmModal = document.getElementById('confirm-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const editForm = document.getElementById('edit-form');
const meetingIdEl = document.getElementById('meeting-id');
const meetingTitleEl = document.getElementById('meeting-title');
const meetingUrlEl = document.getElementById('meeting-url');
const meetingStartEl = document.getElementById('meeting-start');
const meetingEndEl = document.getElementById('meeting-end');
const meetingEnabledEl = document.getElementById('meeting-enabled');
const statusBadge = document.getElementById('status-badge');
const statusTitle = document.getElementById('status-title');
const statusStart = document.getElementById('status-start');
const statusEnd = document.getElementById('status-end');
const statusJoin = document.getElementById('status-join');
const statusLeave = document.getElementById('status-leave');
const miniList = document.getElementById('mini-list');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const clockEl = document.getElementById('clock');

let meetings = [];
let toDeleteId = null;

function fmt(dt) {
  const d = new Date(dt);
  return d.toLocaleString(undefined, { hour12: false });
}

async function load() {
  meetings = await api.listMeetings();
  render();
}

function render() {
  meetingsList.innerHTML = '';
  for (const m of meetings) {
    const li = document.createElement('li');
    // toggle
    const toggle = document.createElement('input');
    toggle.type = 'checkbox'; toggle.className = 'meeting-toggle'; toggle.checked = m.enabled;
    toggle.addEventListener('change', async () => {
      await api.toggleMeeting(m.id, toggle.checked);
      await load();
    });
    li.appendChild(toggle);

    const info = document.createElement('div');
    info.className = 'meeting-info';
    const title = document.createElement('div');
    title.textContent = m.title;
    const times = document.createElement('div');
    times.className = 'muted';
    times.textContent = `${fmt(m.start_time)} → ${fmt(m.end_time)}`;
    const url = document.createElement('div');
    url.className = 'muted';
    url.textContent = m.url;
    info.appendChild(title); info.appendChild(times); info.appendChild(url);
    li.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'meeting-actions';
  const editBtn = document.createElement('button'); editBtn.textContent = '✎'; editBtn.title = 'Edit';
  const delBtn = document.createElement('button'); delBtn.textContent = '🗑'; delBtn.title = 'Delete'; delBtn.className = 'danger';
    editBtn.addEventListener('click', () => openEdit(m));
    delBtn.addEventListener('click', () => openConfirm(m.id));
    actions.appendChild(editBtn); actions.appendChild(delBtn);
    li.appendChild(actions);

    meetingsList.appendChild(li);
  }

  renderSidebar();
}

function openEdit(m) {
  document.getElementById('modal-title').textContent = m ? 'Edit Meeting' : 'Add Meeting';
  meetingIdEl.value = m?.id || '';
  meetingTitleEl.value = m?.title || '';
  meetingUrlEl.value = m?.url || '';
  meetingStartEl.value = m ? localInputValue(m.start_time) : '';
  meetingEndEl.value = m ? localInputValue(m.end_time) : '';
  meetingEnabledEl.checked = m?.enabled ?? true;
  editModal.hidden = false;
}

function localInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function closeEdit() { editModal.hidden = true; }

function openConfirm(id) { toDeleteId = id; confirmModal.hidden = false; }
function closeConfirm() { toDeleteId = null; confirmModal.hidden = true; }

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = meetingIdEl.value ? Number(meetingIdEl.value) : undefined;
  const payload = {
    id,
    title: meetingTitleEl.value.trim(),
    url: meetingUrlEl.value.trim(),
    start_time: new Date(meetingStartEl.value).toISOString(),
    end_time: new Date(meetingEndEl.value).toISOString(),
    enabled: meetingEnabledEl.checked
  };
  if (id) await api.updateMeeting(payload); else await api.createMeeting(payload);
  closeEdit();
  await load();
});

cancelEditBtn.addEventListener('click', closeEdit);
cancelDeleteBtn.addEventListener('click', closeConfirm);
confirmDeleteBtn.addEventListener('click', async () => {
  if (toDeleteId != null) await api.deleteMeeting(toDeleteId);
  closeConfirm();
  await load();
});

addBtn.addEventListener('click', () => openEdit(null));

function renderSidebar() {
  // Determine ongoing and next
  const now = Date.now();
  const ongoing = meetings.find(m => new Date(m.start_time).getTime() <= now && now <= new Date(m.end_time).getTime());
  let next = meetings.filter(m => new Date(m.start_time).getTime() > now).sort((a,b)=> new Date(a.start_time)-new Date(b.start_time))[0] || null;

  if (ongoing) {
    statusBadge.hidden = false;
    statusTitle.textContent = ongoing.title;
    statusStart.textContent = fmt(ongoing.start_time);
    statusEnd.textContent = fmt(ongoing.end_time);
  } else {
    statusBadge.hidden = true;
    if (next) {
      statusTitle.textContent = next.title;
      statusStart.textContent = fmt(next.start_time);
      statusEnd.textContent = fmt(next.end_time);
    } else {
      statusTitle.textContent = 'No upcoming meetings';
      statusStart.textContent = '';
      statusEnd.textContent = '';
    }
  }

  statusJoin.onclick = async () => {
    const target = ongoing || next;
    if (target) await api.joinNow(target.url);
  };
  statusLeave.onclick = async () => { await api.leaveNow(); };

  // Populate mini list (exclude the next if shown in card when not ongoing)
  miniList.innerHTML = '';
  const items = meetings
    .filter(m => !ongoing && next ? m.id !== next.id : true)
    .filter(m => new Date(m.start_time).getTime() >= now)
    .slice(0, 8);

  for (const m of items) {
    const li = document.createElement('li');
    const spanTitle = document.createElement('span'); spanTitle.textContent = m.title;
    const spanTime = document.createElement('span'); spanTime.className = 'muted'; spanTime.textContent = fmt(m.start_time);
    li.appendChild(spanTitle); li.appendChild(spanTime);
    li.addEventListener('click', async () => { await api.joinNow(m.url); });
    miniList.appendChild(li);
  }
}

api.onSchedulerEvent((evt) => {
  if (evt.type === 'status') {
    // Could update sidebar with more real-time status if desired
    load();
  }
});

load();

// Live clock
function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleString(undefined, { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();
