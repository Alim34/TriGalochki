(function () {
  'use strict';

  // ================== ХРАНИЛИЩЕ ==================
  var STORAGE_KEY = 'triGalochkiData';

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }

  var appData = loadData();

  function emptyEntry() {
    return { mood: null, habits: { write: false, move: false, grow: false }, completed: false };
  }
  function getEntry(key) {
    return appData[key] || emptyEntry();
  }
  function setEntry(key, entry) {
    appData[key] = entry;
    saveData();
  }

  // ================== ДАТЫ ==================
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toKey(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function keyOf(date) { return toKey(date.getFullYear(), date.getMonth(), date.getDate()); }

  var WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var WEEKDAY_LONG = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
  // Понедельник = 0 ... воскресенье = 6, для сетки календаря
  function mondayIndex(jsDay) { return (jsDay + 6) % 7; }

  // ================== СОСТОЯНИЕ ==================
  var today = new Date();
  var todayKey = keyOf(today);
  var viewYear = today.getFullYear();
  var viewMonth = today.getMonth();
  var selectedDayKey = null;

  // ================== ВКЛАДКА "СЕГОДНЯ" ==================
  var moodRow = document.getElementById('mood-row');
  var habitsList = document.getElementById('habits-list');
  var finishBtn = document.getElementById('finish-day-btn');
  var badDayTip = document.getElementById('bad-day-tip');
  var streakNote = document.getElementById('streak-note');
  var todayDateEl = document.getElementById('today-date');

  function renderTodayHeading() {
    var weekday = WEEKDAY_LONG[today.getDay()];
    weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    todayDateEl.textContent = weekday + ', ' + today.getDate() + ' ' + MONTHS_GEN[today.getMonth()];
  }

  function renderToday() {
    var entry = getEntry(todayKey);

    // настроение
    var moodBtns = moodRow.querySelectorAll('.mood-btn');
    for (var i = 0; i < moodBtns.length; i++) {
      moodBtns[i].classList.toggle('is-selected', moodBtns[i].dataset.mood === entry.mood);
    }
    badDayTip.classList.toggle('is-hidden', entry.mood !== 'red');

    // привычки
    var rows = habitsList.querySelectorAll('.habit-row');
    for (var j = 0; j < rows.length; j++) {
      var key = rows[j].dataset.habit;
      rows[j].classList.toggle('is-checked', !!entry.habits[key]);
    }

    // кнопка завершения дня
    if (entry.completed) {
      finishBtn.textContent = '✓ День завершён';
      finishBtn.classList.add('is-done');
    } else {
      finishBtn.textContent = 'День завершён';
      finishBtn.classList.remove('is-done');
    }

    renderStreakNote();
  }

  function renderStreakNote() {
    var streak = computeCurrentStreak();
    if (streak > 0) {
      streakNote.innerHTML = 'Текущая серия: <strong>' + streak + '</strong> ' + dayWord(streak);
    } else {
      streakNote.textContent = 'Отметь сегодняшний день, чтобы начать серию.';
    }
  }

  function dayWord(n) {
    var mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'день';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
    return 'дней';
  }

  moodRow.addEventListener('click', function (e) {
    var btn = e.target.closest('.mood-btn');
    if (!btn) return;
    var entry = getEntry(todayKey);
    entry.mood = (entry.mood === btn.dataset.mood) ? null : btn.dataset.mood;
    setEntry(todayKey, entry);
    renderToday();
  });

  habitsList.addEventListener('click', function (e) {
    var row = e.target.closest('.habit-row');
    if (!row) return;
    var entry = getEntry(todayKey);
    var key = row.dataset.habit;
    entry.habits[key] = !entry.habits[key];
    setEntry(todayKey, entry);
    renderToday();
  });

  finishBtn.addEventListener('click', function () {
    var entry = getEntry(todayKey);
    entry.completed = !entry.completed;
    setEntry(todayKey, entry);
    renderToday();
    if (isCurrentMonthViewed()) renderStats();
  });

  // ================== СЕРИЯ (STREAK) ==================
  // Текущая серия = подряд идущие завершённые дни, заканчивая сегодняшним
  // или вчерашним, если сегодняшний день ещё не отмечен.
  function computeCurrentStreak() {
    var cursor = new Date(today);
    if (!getEntry(keyOf(cursor)).completed) {
      cursor.setDate(cursor.getDate() - 1);
    }
    var streak = 0;
    while (getEntry(keyOf(cursor)).completed) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  // Самая длинная серия завершённых дней внутри конкретного месяца
  function bestStreakInMonth(year, month) {
    var total = daysInMonth(year, month);
    var best = 0, current = 0;
    for (var d = 1; d <= total; d++) {
      if (getEntry(toKey(year, month, d)).completed) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
    }
    return best;
  }

  // ================== ВКЛАДКА "СТАТИСТИКА" ==================
  var monthTitleEl = document.getElementById('month-title');
  var statsGrid = document.getElementById('stats-grid');
  var weekdayRow = document.getElementById('weekday-row');
  var calendarGrid = document.getElementById('calendar-grid');
  var dayDetail = document.getElementById('day-detail');
  var summaryBtn = document.getElementById('summary-btn');
  var summaryCard = document.getElementById('summary-card');

  function isCurrentMonthViewed() {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth();
  }

  function computeMonthStats(year, month) {
    var total = daysInMonth(year, month);
    var counts = { write: 0, move: 0, grow: 0 };
    var mood = { red: 0, yellow: 0, green: 0 };
    var recorded = 0, fullDays = 0;

    for (var d = 1; d <= total; d++) {
      var entry = appData[toKey(year, month, d)];
      if (!entry) continue;
      if (entry.mood) mood[entry.mood]++;
      if (entry.completed) recorded++;
      var n = 0;
      if (entry.habits.write) { counts.write++; n++; }
      if (entry.habits.move) { counts.move++; n++; }
      if (entry.habits.grow) { counts.grow++; n++; }
      if (n === 3) fullDays++;
    }

    var totalDone = counts.write + counts.move + counts.grow;
    var totalPossible = total * 3;
    var completionPct = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;

    return {
      total: total, counts: counts, mood: mood, recorded: recorded,
      fullDays: fullDays, totalDone: totalDone, totalPossible: totalPossible,
      completionPct: completionPct, bestStreak: bestStreakInMonth(year, month)
    };
  }

  function renderMonthNav() {
    monthTitleEl.textContent = MONTHS_NOM[viewMonth] + ' ' + viewYear;
  }

  function renderStatsGrid() {
    var s = computeMonthStats(viewYear, viewMonth);
    var rows = [
      { icon: '✍️', name: 'Писал', value: s.counts.write },
      { icon: '🏋️', name: 'Двигался', value: s.counts.move },
      { icon: '📖', name: 'Развивался', value: s.counts.grow }
    ];

    var html = '';
    rows.forEach(function (r) {
      var pct = s.total ? Math.round((r.value / s.total) * 100) : 0;
      html += '<div class="stat-row-wrap">' +
        '<div class="stat-row">' +
        '<span class="stat-icon">' + r.icon + '</span>' +
        '<span class="stat-name">' + r.name + '</span>' +
        '<span class="stat-value">' + r.value + '/' + s.total + '</span>' +
        '</div>' +
        '<div class="stat-bar-track"><div class="stat-bar-fill" style="width:' + pct + '%"></div></div>' +
        '</div>';
    });

    html += '<div class="stats-divider"></div>';
    html += '<div class="stat-highlight-row"><span class="stat-name">Выполнение</span><span class="stat-value">' + s.completionPct + '%</span></div>';
    html += '<div class="stat-highlight-row"><span class="stat-name">Дней все 3 привычки</span><span class="stat-value">' + s.fullDays + '</span></div>';
    html += '<div class="stat-highlight-row"><span class="stat-name">Лучшая серия</span><span class="stat-value">' + s.bestStreak + '</span></div>';

    statsGrid.innerHTML = html;
  }

  function renderWeekdayRow() {
    if (weekdayRow.childElementCount) return;
    weekdayRow.innerHTML = WEEKDAYS.map(function (w) { return '<span>' + w + '</span>'; }).join('');
  }

  function renderCalendar() {
    var total = daysInMonth(viewYear, viewMonth);
    var firstDow = mondayIndex(new Date(viewYear, viewMonth, 1).getDay());
    var html = '';

    for (var i = 0; i < firstDow; i++) html += '<div class="day-cell is-empty"></div>';

    for (var d = 1; d <= total; d++) {
      var key = toKey(viewYear, viewMonth, d);
      var entry = appData[key];
      var classes = ['day-cell'];
      if (key === todayKey) classes.push('is-today');
      if (key === selectedDayKey) classes.push('is-selected');
      if (entry && entry.mood) classes.push('has-mood-' + entry.mood);
      if (entry && entry.habits.write && entry.habits.move && entry.habits.grow) classes.push('is-full');
      html += '<div class="' + classes.join(' ') + '" data-day-key="' + key + '">' + d + '</div>';
    }

    calendarGrid.innerHTML = html;
  }

  var MOOD_LABEL = { red: 'плохой 🔴', yellow: 'обычный 🟡', green: 'хороший 🟢' };

  function renderDayDetail() {
    if (!selectedDayKey) {
      dayDetail.classList.add('is-hidden');
      return;
    }
    var entry = appData[selectedDayKey];
    var parts = selectedDayKey.split('-');
    var label = parseInt(parts[2], 10) + ' ' + MONTHS_GEN[parseInt(parts[1], 10) - 1];

    if (!entry || (!entry.mood && !entry.completed && !entry.habits.write && !entry.habits.move && !entry.habits.grow)) {
      dayDetail.innerHTML = '<strong>' + label + '</strong> — нет записи.';
    } else {
      var habitsStr = [];
      if (entry.habits.write) habitsStr.push('✍️');
      if (entry.habits.move) habitsStr.push('🏋️');
      if (entry.habits.grow) habitsStr.push('📖');
      dayDetail.innerHTML = '<strong>' + label + '</strong> — ' +
        (entry.mood ? MOOD_LABEL[entry.mood] : 'настроение не отмечено') +
        (habitsStr.length ? ', ' + habitsStr.join(' ') : ', без привычек');
    }
    dayDetail.classList.remove('is-hidden');
  }

  calendarGrid.addEventListener('click', function (e) {
    var cell = e.target.closest('.day-cell');
    if (!cell || !cell.dataset.dayKey) return;
    selectedDayKey = (selectedDayKey === cell.dataset.dayKey) ? null : cell.dataset.dayKey;
    renderCalendar();
    renderDayDetail();
  });

  document.getElementById('prev-month').addEventListener('click', function () {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    selectedDayKey = null;
    summaryCard.classList.add('is-hidden');
    renderStats();
  });
  document.getElementById('next-month').addEventListener('click', function () {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    selectedDayKey = null;
    summaryCard.classList.add('is-hidden');
    renderStats();
  });

  function renderStats() {
    renderMonthNav();
    renderStatsGrid();
    renderWeekdayRow();
    renderCalendar();
    renderDayDetail();
  }

  // ================== ИТОГИ МЕСЯЦА ==================
  function renderSummary() {
    var s = computeMonthStats(viewYear, viewMonth);
    var isCurrent = isCurrentMonthViewed();
    var elapsed = isCurrent ? today.getDate() : s.total;

    var bestDayLabel = findBestDay(viewYear, viewMonth);
    var badDays = s.mood.red;

    var html = '<h3>' + MONTHS_NOM[viewMonth] + ' ' + viewYear + '</h3>';
    html += '<p class="summary-line">' + (isCurrent ? 'Прожито ' + elapsed + ' из ' + s.total + ' ' + dayWord(s.total) + '.' : 'Прожит ' + s.total + ' ' + dayWord(s.total) + '.') + '</p>';
    html += '<p class="summary-line">✍️ Писал — <strong>' + s.counts.write + '</strong> ' + dayWord(s.counts.write) + '</p>';
    html += '<p class="summary-line">🏋️ Двигался — <strong>' + s.counts.move + '</strong> ' + dayWord(s.counts.move) + '</p>';
    html += '<p class="summary-line">📖 Развивался — <strong>' + s.counts.grow + '</strong> ' + dayWord(s.counts.grow) + '</p>';
    html += '<p class="summary-line">Всего выполнено <strong>' + s.totalDone + '</strong> из ' + s.totalPossible + ' привычек.</p>';
    if (bestDayLabel) html += '<p class="summary-line">Лучший день: <strong>' + bestDayLabel + '</strong></p>';
    html += '<p class="summary-line">Самая длинная серия: <strong>' + s.bestStreak + '</strong> ' + dayWord(s.bestStreak) + '</p>';
    html += '<p class="summary-line">Плохих дней: <strong>' + badDays + '</strong></p>';

    var closing;
    if (badDays === 0 && s.recorded === 0) {
      closing = 'Пока нет ни одной записи за этот месяц.';
    } else if (badDays > 0) {
      closing = 'И ты всё равно продолжил.';
    } else {
      closing = 'Ни одного по-настоящему плохого дня.';
    }
    html += '<p class="summary-closing">' + closing + '</p>';

    summaryCard.innerHTML = html;
    summaryCard.classList.remove('is-hidden');
  }

  function findBestDay(year, month) {
    var total = daysInMonth(year, month);
    var bestKey = null, bestScore = -1, bestGreen = false;
    for (var d = 1; d <= total; d++) {
      var key = toKey(year, month, d);
      var entry = appData[key];
      if (!entry) continue;
      var n = (entry.habits.write ? 1 : 0) + (entry.habits.move ? 1 : 0) + (entry.habits.grow ? 1 : 0);
      var isGreen = entry.mood === 'green';
      if (n > bestScore || (n === bestScore && isGreen && !bestGreen)) {
        bestScore = n; bestKey = key; bestGreen = isGreen;
      }
    }
    if (!bestKey || bestScore <= 0) return null;
    var parts = bestKey.split('-');
    return parseInt(parts[2], 10) + ' ' + MONTHS_GEN[parseInt(parts[1], 10) - 1];
  }

  summaryBtn.addEventListener('click', function () {
    if (summaryCard.classList.contains('is-hidden')) {
      renderSummary();
      summaryCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      summaryCard.classList.add('is-hidden');
    }
  });

  // ================== НАПОМИНАНИЕ ==================
  var LN = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
  var REMINDER_ID = 1001;
  var REMINDER_KEY = 'triGalochkiReminder';

  function loadReminder() {
    try {
      var raw = localStorage.getItem(REMINDER_KEY);
      return raw ? JSON.parse(raw) : { enabled: false, time: '21:00' };
    } catch (e) {
      return { enabled: false, time: '21:00' };
    }
  }
  function saveReminder(r) { localStorage.setItem(REMINDER_KEY, JSON.stringify(r)); }

  function parseTime(t) {
    var parts = t.split(':');
    return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1], 10) };
  }

  function scheduleReminder(time) {
    if (!LN) return;
    var hm = parseTime(time);
    LN.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: 'Три галочки',
        body: 'Как прошёл день? Отметь за 20 секунд.',
        schedule: { on: { hour: hm.hour, minute: hm.minute }, allowWhileIdle: true }
      }]
    }).catch(function () {});
  }

  function cancelReminder() {
    if (!LN) return;
    LN.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(function () {});
  }

  var settingsBtn = document.getElementById('settings-btn');
  var settingsPanel = document.getElementById('settings-panel');
  var reminderToggle = document.getElementById('reminder-toggle');
  var reminderTime = document.getElementById('reminder-time');
  var reminderNote = document.getElementById('reminder-note');
  var reminder = loadReminder();

  reminderToggle.checked = reminder.enabled;
  reminderTime.value = reminder.time;

  if (!LN) {
    reminderToggle.disabled = true;
    reminderNote.textContent = 'Работает только в установленном приложении, не в браузере.';
  } else if (reminder.enabled) {
    scheduleReminder(reminder.time);
  }

  settingsBtn.addEventListener('click', function () {
    settingsPanel.classList.toggle('is-hidden');
  });

  reminderToggle.addEventListener('change', function () {
    if (!LN) { reminderToggle.checked = false; return; }
    if (reminderToggle.checked) {
      LN.requestPermissions().then(function (res) {
        if (res.display === 'granted') {
          reminder.enabled = true;
          saveReminder(reminder);
          scheduleReminder(reminder.time);
          reminderNote.textContent = '';
        } else {
          reminderToggle.checked = false;
          reminderNote.textContent = 'Уведомления запрещены в настройках телефона.';
        }
      });
    } else {
      reminder.enabled = false;
      saveReminder(reminder);
      cancelReminder();
      reminderNote.textContent = '';
    }
  });

  reminderTime.addEventListener('change', function () {
    reminder.time = reminderTime.value;
    saveReminder(reminder);
    if (reminder.enabled) scheduleReminder(reminder.time);
  });

  // ================== ВКЛАДКИ ==================
  // ================== ВКЛАДКИ ==================
  var tabBtns = document.querySelectorAll('.tab-btn');
  var views = { today: document.getElementById('view-today'), stats: document.getElementById('view-stats') };

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      Object.keys(views).forEach(function (k) { views[k].classList.remove('is-active'); });
      views[btn.dataset.tab].classList.add('is-active');
      if (btn.dataset.tab === 'stats') renderStats();
    });
  });

  // ================== СТАРТ ==================
  renderTodayHeading();
  renderToday();
  renderStats();
})();
