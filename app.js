// PWA Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// Show install button when app is installable (Chromium)
let deferredPrompt = null;
const $installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if ($installBtn) $installBtn.style.display = 'inline-block';
});
if ($installBtn) {
  $installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      deferredPrompt = null;
      $installBtn.style.display = 'none';
    }
  });
}
window.addEventListener('appinstalled', () => {
  if ($installBtn) $installBtn.style.display = 'none';
});

const endDate = new Date(2025, 11, 31); // 31 Dec 2025 (2568 BE)

const $remaining = document.getElementById('remaining');
const $perDay = document.getElementById('perDay');
const $planBtn = document.getElementById('planBtn');
const $resetBtn = document.getElementById('resetBtn');
const $summary = document.getElementById('summary');
const $errors = document.getElementById('errors');
const $calendar = document.getElementById('calendar');

const fmtMonth = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' });
const fmtDay = new Intl.DateTimeFormat('th-TH', { day: 'numeric' });
const fmtFull = new Intl.DateTimeFormat('th-TH', { dateStyle: 'full' });

// Typewriter effect for summary text
let typingSeq = 0;
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function typeText(el, text, speed = 18) {
  const seq = ++typingSeq;
  el.classList.add('typing');
  el.textContent = '';
  for (const ch of text) {
    if (typingSeq !== seq) { el.classList.remove('typing'); return; }
    el.textContent += ch;
    await sleep(speed);
  }
  el.classList.remove('typing');
}

// Allow typing leading zeros and digits-only in inputs
function digitsOnly(e) {
  const v = e.target.value;
  // Keep only digits
  let nv = v.replace(/[^0-9]/g, '');
  // Disallow leading zeros (except single '0')
  if (nv.length > 1) {
    nv = nv.replace(/^0+/, '');
  }
  // Enforce per-field maximums while typing
  if (nv !== '') {
    const num = Number(nv);
    if (e.target.id === 'remaining' && num > 2400) {
      nv = '2400';
    } else if (e.target.id === 'perDay' && num > 200) {
      nv = '200';
    }
  }
  if (nv !== v) e.target.value = nv;
}

function reset() {
  $remaining.value = '';
  $perDay.value = '';
  $summary.textContent = '';
  $errors.textContent = '';
  $calendar.innerHTML = '';
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function nextDate(d) { const nx = new Date(d); nx.setDate(nx.getDate() + 1); return nx; }

function computeSchedule(remaining, perDay, start) {
  const schedule = [];
  if (remaining <= 0 || perDay <= 0) return schedule;

  let money = remaining;
  let ptr = new Date(start);
  while (ptr <= endDate && money > 0) {
    const spend = Math.min(perDay, money);
    schedule.push({ date: new Date(ptr), amount: spend });
    money -= spend;
    ptr = nextDate(ptr);
  }
  return schedule;
}

function renderCalendar(schedule, start) {
  // Build month-by-month from current month to Dec 2025
  $calendar.innerHTML = '';

  const today = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  // Helper to make local date key (avoid UTC shift)
  const keyDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  // Quick map of schedule by local YYYY-MM-DD for lookup (no UTC skew)
  const useMap = new Map(schedule.map(x => [keyDate(x.date), x.amount]));
  const lastUseDay = schedule.length ? schedule[schedule.length - 1].date : null;

  for (let m = new Date(startMonth); m <= lastMonth; m.setMonth(m.getMonth() + 1)) {
    const monthStart = new Date(m.getFullYear(), m.getMonth(), 1);
    const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    const monthEl = document.createElement('div');
    monthEl.className = 'month fade-in';
    const h3 = document.createElement('h3');
    h3.textContent = fmtMonth.format(monthStart);
    monthEl.appendChild(h3);

    const weekdays = ['จ','อ','พ','พฤ','ศ','ส','อา']; // Mon-first
    const weekdaysRow = document.createElement('div');
    weekdaysRow.className = 'weekdays';
    weekdays.forEach(w => { const sp = document.createElement('span'); sp.textContent = w; weekdaysRow.appendChild(sp); });
    monthEl.appendChild(weekdaysRow);

    const grid = document.createElement('div');
    grid.className = 'grid';

    // Calculate leading blanks for Monday-first
    const jsWeekday = monthStart.getDay(); // 0=Sun..6=Sat
    const mondayFirstIndex = (jsWeekday + 6) % 7; // convert to 0=Mon..6=Sun
    for (let i = 0; i < mondayFirstIndex; i++) {
      const blank = document.createElement('div');
      blank.className = 'day inactive';
      grid.appendChild(blank);
    }

    for (let d = 1; d <= monthEnd.getDate(); d++) {
      const dateObj = new Date(m.getFullYear(), m.getMonth(), d);
      const cell = document.createElement('div');
      cell.className = 'day';

      const dateStr = keyDate(dateObj);
      const isToday = isSameDate(dateObj, today);
      if (isToday) cell.classList.add('today');
      if (dateObj < today) cell.classList.add('past');

      const top = document.createElement('div');
      top.className = 'date';
      top.textContent = fmtDay.format(dateObj);
      cell.appendChild(top);

      const meta = document.createElement('div');
      meta.className = 'meta';
      //meta.textContent = fmtFull.format(dateObj);
      meta.textContent = "";
      cell.appendChild(meta);

      // Show planned spend (no checkbox) if in schedule and date >= start (compare by date only)
      const amount = useMap.get(dateStr);
      if (amount && dateObj >= startDateOnly) {
        const spendRow = document.createElement('div');
        spendRow.className = 'spend';
        const chip = document.createElement('span');
        chip.className = 'amount';
        chip.textContent = `${amount.toLocaleString('th-TH')} บาท`;
        spendRow.appendChild(chip);
        cell.appendChild(spendRow);

        if (lastUseDay && isSameDate(dateObj, lastUseDay) && amount > 0) {
          const last = document.createElement('div');
          last.className = 'last-day';
          last.textContent = 'วันสุดท้ายของการใช้สิทธิ';
          cell.appendChild(last);
        }
      }

      grid.appendChild(cell);
    }

    monthEl.appendChild(grid);
    $calendar.appendChild(monthEl);
  }
}

function plan() {
  $errors.textContent = '';
  $summary.textContent = '';

  const today = new Date();
  const remainingStr = ($remaining.value || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
  const perDayStr = ($perDay.value || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
  const remaining = clamp(Number(remainingStr || 0), 0, 2400);
  const perDay = clamp(Number(perDayStr || 0), 0, 200);

  // Validation
  if (today > endDate) {
    $errors.textContent = 'สิทธิหมดเขตแล้ว (หลัง 31 ธันวาคม 2568)';
    $calendar.innerHTML = '';
    return;
  }
  if (perDay <= 0) {
    $errors.textContent = 'กรุณากรอกจำนวนเงินต่อวัน (> 0 และ ≤ 200)';
    $calendar.innerHTML = '';
    return;
  }
  if (remaining <= 0) {
    $errors.textContent = 'ยอดสิทธิที่คงเหลือต้องมากกว่า 0';
    $calendar.innerHTML = '';
    return;
  }

  // Compute schedule
  const schedule = computeSchedule(remaining, perDay, today);
  const daysCanUse = schedule.length;
  const lastDay = schedule.length ? schedule[schedule.length - 1].date : null;
  const lastAmount = schedule.length ? schedule[schedule.length - 1].amount : 0;

  const daysLeftToEnd = Math.max(0, Math.floor((endDate - today) / (24*3600*1000)) + 1);

  let summaryText = '';
  summaryText += `เริ่มใช้ตั้งแต่ ${fmtFull.format(today)}`;
  summaryText += ` \n ใช้ได้อีก ${daysCanUse.toLocaleString('th-TH')} วัน`;
  if (lastDay) summaryText += ` (วันสุดท้าย ${fmtFull.format(lastDay)} ใช้ ${lastAmount.toLocaleString('th-TH')} บาท)`;
  summaryText += `\n เหลือวันทั้งหมดจนถึงสิ้นปี: ${daysLeftToEnd.toLocaleString('th-TH')} วัน`;
  // Stream the summary like chat apps
  typeText($summary, summaryText, 16);

  renderCalendar(schedule, today);
}

$planBtn.addEventListener('click', plan);
$resetBtn.addEventListener('click', reset);

// Helpful: auto-plan when inputs change and are valid
[$remaining, $perDay].forEach(el => el.addEventListener('change', plan));
[$remaining, $perDay].forEach(el => el.addEventListener('input', digitsOnly));
