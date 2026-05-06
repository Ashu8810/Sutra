import { supabase } from './supabase.js'
import { showToast } from './utils.js'

// --- AUTH LOGIC ---
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  window.location.href = 'login.html';
} else {
  const userNameEl = document.querySelector('#current-user-name');
  if (userNameEl && session.user.user_metadata?.full_name) {
    userNameEl.textContent = `Welcome, ${session.user.user_metadata.full_name}`;
  } else if (userNameEl && session.user.email) {
    userNameEl.textContent = `Welcome, ${session.user.email.split('@')[0]}`;
  }
}

const signOutBtn = document.querySelector('#sign-out-btn');
const settingsModal = document.querySelector('#settings-modal');
const closeSettings = document.querySelector('#close-settings');
const modalSignOut = document.querySelector('#modal-sign-out');
const modalWelcomeName = document.querySelector('#modal-welcome-name');

if (signOutBtn) {
  signOutBtn.addEventListener('click', async () => {
    const settingsIcon = signOutBtn.querySelector('.settings-icon');
    const isIconVisible = settingsIcon && getComputedStyle(settingsIcon).display !== 'none';

    // If the gear icon is visible, we are in mobile/icon mode -> show modal
    if (isIconVisible) {
      if (settingsModal) {
        // Set user name in modal
        if (session.user.user_metadata?.full_name) {
          modalWelcomeName.textContent = `Welcome, ${session.user.user_metadata.full_name}`;
        } else if (session.user.email) {
          modalWelcomeName.textContent = `Welcome, ${session.user.email.split('@')[0]}`;
        }
        settingsModal.classList.add('active');
      }
    } else {
      // Desktop behavior: "Sign Out" text is visible -> direct sign out
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    }
  });
}

if (closeSettings) {
  closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });
}

if (modalSignOut) {
  modalSignOut.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('active');
    }
  });
}

const form = document.querySelector('#event-form')
const listContainer = document.querySelector('#event-list-container')
const emptyState = document.querySelector('#empty-state')
const formContainer = document.querySelector('#event-form-container')
const addBtn = document.querySelector('#add-event-btn')
const submitBtn = document.querySelector('#submit-btn')
const formFeedback = document.querySelector('#form-feedback')
const themeToggle = document.querySelector('#theme-toggle')

// --- THEME LOGIC ---
// Strict matte dark theme only
document.body.classList.remove('light-mode');
localStorage.setItem('theme', 'dark');


// stats
const statTotal = document.querySelector('#stat-total')
const statHackathons = document.querySelector('#stat-hackathons')
const statAbsent = document.querySelector('#stat-absent')
const statAttendance = document.querySelector('#stat-attendance')

// nav & containers
const navItems = document.querySelectorAll('.nav-item');
const dashboardContainer = document.querySelector('#dashboard-container');
const calendarContainer = document.querySelector('#calendar-container');

// filters
const filterOptions = document.querySelectorAll('.filter-option');
const dateFilterGroup = document.querySelector('#date-filter-group');
const dateFilterValue = document.querySelector('#date-filter-value');
const clearDateFilterBtn = document.querySelector('#clear-date-filter');

// STATE
const typeFilters = ['all', 'hackathon', 'ctf', 'event', 'college'];
let allEvents = [];
let currentFilters = {
  type: 'all',
  status: 'all',
  date: null
};

let currentMonthDate = new Date();

// --- NAV LOGIC ---
const pageContent = {
  'Dashboard': { showList: true, showDashboard: true, showCalendar: false },
  'Calendar': { showList: false, showDashboard: false, showCalendar: true },
  'Events': { showList: true, showDashboard: false, showCalendar: false }
};

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    const itemName = item.textContent.trim();
    if (pageContent[itemName]) {
      formContainer.style.display = 'none';
      const filtersContainer = document.querySelector('.list-filters');
      if (filtersContainer) filtersContainer.style.display = pageContent[itemName].showList ? 'flex' : 'none';
      listContainer.style.display = pageContent[itemName].showList ? 'block' : 'none';
      dashboardContainer.style.display = pageContent[itemName].showDashboard ? 'block' : 'none';
      calendarContainer.style.display = pageContent[itemName].showCalendar ? 'block' : 'none';
    }
  });
});

// --- NAV: show form ---
addBtn.addEventListener('click', () => {
  formContainer.style.display = 'block';
  const filtersContainer = document.querySelector('.list-filters');
  if (filtersContainer) filtersContainer.style.display = 'none';
  listContainer.style.display = 'none';
  dashboardContainer.style.display = 'none';
  calendarContainer.style.display = 'none';
  navItems.forEach(nav => nav.classList.remove('active'));
});

// --- LOAD EVENTS ---
async function loadEvents() {
  if (formFeedback) formFeedback.textContent = 'Fetching...';
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', session.user.id)
    .order('date', { ascending: true })

  if (error) {
    console.error(error)
    showToast('Error loading data: ' + error.message, 'error');
    return
  }

  allEvents = data || [];
  if (formFeedback) formFeedback.textContent = '';

  applyFiltersAndRender();
  updateStats();
  renderCalendar();
}

// --- FILTER LOGIC ---
filterOptions.forEach(option => {
  option.addEventListener('click', (e) => {
    if (e.target.id === 'clear-date-filter' || e.target.id === 'date-filter-value') return;

    const type = e.target.getAttribute('data-filter-type');
    const status = e.target.getAttribute('data-filter-status');

    if (type) {
      currentFilters.type = type;
      document.querySelectorAll('[data-filter-type]').forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
    }

    if (status) {
      currentFilters.status = status;
      document.querySelectorAll('[data-filter-status]').forEach(el => el.classList.remove('active'));
      e.target.classList.add('active');
    }

    applyFiltersAndRender();
  });
});

clearDateFilterBtn?.addEventListener('click', () => {
  currentFilters.date = null;
  if (dateFilterGroup) dateFilterGroup.style.display = 'none';
  applyFiltersAndRender();
  renderCalendar(); // To clear selected cell highlight
});

function applyFiltersAndRender() {
  let filtered = allEvents;

  if (currentFilters.type !== 'all') {
    filtered = filtered.filter(e => e.type === currentFilters.type);
  }

  if (currentFilters.status !== 'all') {
    filtered = filtered.filter(e => e.status === currentFilters.status);
  }

  if (currentFilters.date) {
    filtered = filtered.filter(e => e.date === currentFilters.date);
  }

  renderEvents(filtered);
}

// --- RENDER LIST ---
function renderEvents(events) {
  // Clear old rows, keep empty state
  const rows = listContainer.querySelectorAll('.event-row');
  rows.forEach(r => r.remove());

  if (!events.length) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  events.forEach(ev => {
    const row = document.createElement('div')
    row.className = 'event-row'

    const dateDisplay = ev.end_date 
      ? `${formatDate(ev.date)} — ${formatDate(ev.end_date)}`
      : formatDate(ev.date);

    const winnerBadge = ev.winner ? '<span class="winner-badge">✨</span>' : '';
    row.innerHTML = `
      <div class="event-date">${dateDisplay}</div>
      <div class="event-info">
        <span class="event-title">${winnerBadge}${ev.title}</span>
        <span class="event-type">${ev.type}</span>
      </div>
      <div class="event-status">${capitalize(ev.status)}</div>
      <div class="event-delete" data-id="${ev.id}">X</div>
    `

    row.querySelector('.event-delete').addEventListener('click', () => deleteEvent(ev.id));

    listContainer.appendChild(row)
  })
}

// --- SAVE EVENT ---
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const title = document.querySelector('#event-title').value
  const type = document.querySelector('#event-type').value
  const status = document.querySelector('#event-status').value
  const date = document.querySelector('#event-date').value
  const endDate = document.querySelector('#event-end-date').value
  const winner = document.querySelector('#event-winner').checked

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }
  if (formFeedback) formFeedback.textContent = '';

  const { data, error } = await supabase
    .from('events')
    .insert([{ 
      title, 
      type, 
      status, 
      date, 
      end_date: endDate || null,
      winner: winner,
      user_id: session.user.id 
    }])
    .select()

  if (error) {
    console.error(error)
    showToast('Error saving: ' + error.message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Event';
    }
    return
  }

  form.reset()
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Event';
  }
  showToast('Event saved successfully!', 'success');

  setTimeout(() => { if (formFeedback) formFeedback.textContent = '' }, 2000);

  // Sync state
  if (data && data[0]) {
    allEvents.push(data[0]);
    // Sort logic optional, since loadEvents sorts, but we can re-sort allEvents
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    applyFiltersAndRender();
    updateStats();
    renderCalendar();
  }
})

// --- DELETE EVENT ---
async function deleteEvent(id) {
  if (formFeedback) formFeedback.textContent = 'Deleting...';
  const { error } = await supabase
    .from('events')
    .delete()
    .match({ id });

  if (error) {
    console.error(error);
    showToast('Error deleting: ' + error.message, 'error');
    return;
  }

  showToast('Event deleted', 'info');

  if (formFeedback) formFeedback.textContent = '';
  allEvents = allEvents.filter(e => e.id !== id);
  applyFiltersAndRender();
  updateStats();
  renderCalendar();
}

// --- STATS ---
function updateStats() {
  const total = allEvents.length
  const hackathons = allEvents.filter(e => e.type === 'hackathon').length
  const ctf = allEvents.filter(e => e.type === 'ctf').length
  const eventsCount = allEvents.filter(e => e.type === 'event').length
  const college = allEvents.filter(e => e.type === 'college').length
  const absent = allEvents.filter(e => e.status === 'missed').length
  const attended = allEvents.filter(e => e.status === 'attended').length

  console.log({ hackathons, ctf, eventsCount, college })

  const attendance = total ? Math.round((attended / total) * 100) : 0

  if (statTotal) statTotal.textContent = total
  if (statHackathons) statHackathons.textContent = hackathons
  if (statAbsent) statAbsent.textContent = absent
  if (statAttendance) statAttendance.textContent = attendance + '%'
}

// --- RENDER CALENDAR ---
function renderCalendar() {
  const calendarCells = document.getElementById('calendar-cells');
  const calendarMonth = document.querySelector('.calendar-month');

  if (!calendarCells || !calendarMonth) return;

  calendarCells.innerHTML = '';

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  calendarMonth.textContent = currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Make Monday 0, Sunday 6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();

  // Previous month faded cells
  for (let i = 0; i < startOffset; i++) {
    const prevDate = daysInPrevMonth - startOffset + i + 1;
    calendarCells.innerHTML += `<div class="cal-cell empty"><div class="cal-date">${prevDate}</div></div>`;
  }

    // Current month cells
    for (let i = 1; i <= daysInMonth; i++) {
      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayEvents = allEvents.filter(e => {
        if (e.end_date) {
          return cellDateStr >= e.date && cellDateStr <= e.end_date;
        }
        return e.date === cellDateStr;
      });

      const dayOfWeek = new Date(year, month, i).getDay();
      const isHoliday = (dayOfWeek === 0 || dayOfWeek === 6); // 0 = Sunday, 6 = Saturday

      const isToday = (year === today.getFullYear() && month === today.getMonth() && i === today.getDate());
      const isSelected = currentFilters.date === cellDateStr;

      let eventHtml = '<div class="cal-events-container">';
      dayEvents.forEach(ev => {
        const winnerBadge = ev.winner ? '<span class="winner-badge">✨</span>' : '';
        eventHtml += `<div class="cal-event-text" title="${ev.title}">${winnerBadge}${ev.title}</div>`;
      });
      eventHtml += '</div>';

      const hasWinner = dayEvents.some(ev => ev.winner);
      const dayWinnerBadge = hasWinner ? '<span class="winner-icon">✨</span>' : '';

      cell.className = `cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isHoliday ? 'holiday' : ''}`;
      cell.innerHTML = `
        <div class="cal-date">${i}${dayWinnerBadge}</div>
        ${eventHtml}
      `;

      cell.addEventListener('mouseenter', (e) => {
        if (!dayEvents.length) return;
        
        let tooltipHtml = `<div class="tooltip-date">${formatDate(cellDateStr)}</div>`;
        dayEvents.forEach(ev => {
          tooltipHtml += `
            <div class="tooltip-event">
              <div class="tooltip-info">
                <div class="tooltip-title">${ev.title}</div>
                <div class="tooltip-status">${capitalize(ev.status)}</div>
              </div>
            </div>
          `;
        });
        
        tooltip.innerHTML = tooltipHtml;
        tooltip.style.display = 'block';
      });

      cell.addEventListener('mousemove', (e) => {
        const x = e.clientX + 15;
        const y = e.clientY + 15;
        
        // Prevent tooltip from going off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        const maxX = window.innerWidth - tooltipRect.width - 20;
        const maxY = window.innerHeight - tooltipRect.height - 20;
        
        tooltip.style.left = `${Math.min(x, maxX)}px`;
        tooltip.style.top = `${Math.min(y, maxY)}px`;
      });

      cell.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });

      cell.addEventListener('click', () => {
        tooltip.style.display = 'none';
        
        if (dayEvents.length > 0) {
          openEventDetails(dayEvents[0]);
          return;
        }

        currentFilters.date = cellDateStr;
        if (dateFilterValue) dateFilterValue.textContent = formatDate(cellDateStr);
        if (dateFilterGroup) dateFilterGroup.style.display = 'flex';

        // Auto switch to Events tab
        document.querySelectorAll('.nav-item').forEach(n => {
          if (n.textContent.trim() === 'Events') {
            n.click();
          }
        });

        applyFiltersAndRender();
        renderCalendar(); // To update selected highlight
      });

    calendarCells.appendChild(cell);
  }

  // Next month faded cells
  const totalCells = startOffset + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const nextMonthCells = (rows * 7) - totalCells;

  for (let i = 1; i <= nextMonthCells; i++) {
    calendarCells.innerHTML += `<div class="cal-cell empty"><div class="cal-date">${i}</div></div>`;
  }
}

document.querySelector('.prev-btn')?.addEventListener('click', () => {
  currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
  renderCalendar();
});

document.querySelector('.next-btn')?.addEventListener('click', () => {
  currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
  renderCalendar();
});

// --- HELPERS ---
function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short'
  })
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// --- INIT ---
loadEvents()
// --- EVENT DETAILS MODAL ---
function openEventDetails(event) {
  const modal = document.getElementById('event-details-modal');
  if (!modal) return;

  document.getElementById('detail-title').textContent = event.title;
  document.getElementById('detail-type').textContent = capitalize(event.type);
  document.getElementById('detail-status').textContent = capitalize(event.status);
  
  const dateStr = event.end_date 
    ? `${formatDate(event.date)} — ${formatDate(event.end_date)}`
    : formatDate(event.date);
  document.getElementById('detail-date').textContent = dateStr;

  const winnerBadge = document.getElementById('detail-winner-badge');
  if (winnerBadge) {
    winnerBadge.style.display = event.winner ? 'block' : 'none';
  }

  modal.style.display = 'flex';
}

document.getElementById('close-details')?.addEventListener('click', () => {
  document.getElementById('event-details-modal').style.display = 'none';
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('event-details-modal');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});
