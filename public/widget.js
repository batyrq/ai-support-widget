/* ============================================================================
 * ai-support-widget — встраиваемый чат поддержки.
 *
 * Подключение на любом сайте:
 *   <script src="https://ВАШ-ДОМЕН/widget.js" data-bot-id="BOT_ID"></script>
 *
 * Ключевые моменты:
 *  • Весь UI живёт в Shadow DOM — стили виджета НЕ конфликтуют со стилями
 *    сайта-хоста и наоборот (полная изоляция).
 *  • bot-id берётся из data-атрибута тега <script>.
 *  • Адрес API вычисляется из origin'а самого скрипта, поэтому виджет
 *    работает, даже когда встроен на другой домен (CORS на сервере открыт).
 *  • Ответ приходит потоком (SSE) — печатается по мере генерации, с цитатами.
 * ========================================================================== */
(function () {
  'use strict';

  // --- найти свой <script> и прочитать конфиг ---
  var me =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName('script');
      return s[s.length - 1];
    })();
  var botId = me.getAttribute('data-bot-id');
  if (!botId) {
    console.error('[ai-support-widget] требуется атрибут data-bot-id');
    return;
  }
  // База API = origin скрипта (работает при кросс-доменном встраивании).
  var API = new URL(me.src).origin;

  // Анонимный идентификатор посетителя (для группировки диалога в логах).
  var visitorId = localStorage.getItem('asw_visitor');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).slice(2);
    localStorage.setItem('asw_visitor', visitorId);
  }
  var conversationId; // присваивается после первого ответа

  // --- хост + Shadow DOM ---
  var host = document.createElement('div');
  host.setAttribute('id', 'ai-support-widget');
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var accent = '#4f46e5';
  var botName = 'Поддержка';
  var welcome = 'Здравствуйте! Чем могу помочь?';

  // Все стили инкапсулированы в Shadow DOM — без утечки на хост-сайт.
  var style = document.createElement('style');
  style.textContent =
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}' +
    '.bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;' +
    'background:var(--accent);color:#fff;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);' +
    'font-size:26px;display:flex;align-items:center;justify-content:center;z-index:2147483647}' +
    '.panel{position:fixed;bottom:90px;right:20px;width:360px;max-width:calc(100vw - 40px);height:520px;' +
    'max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.28);' +
    'display:none;flex-direction:column;overflow:hidden;z-index:2147483647}' +
    '.panel.open{display:flex}' +
    '.head{background:var(--accent);color:#fff;padding:14px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center}' +
    '.head button{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1}' +
    '.msgs{flex:1;overflow-y:auto;padding:14px;background:#f6f7fb}' +
    '.row{margin:8px 0;display:flex}' +
    '.row.user{justify-content:flex-end}' +
    '.msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}' +
    '.msg.bot{background:#fff;color:#1e2433;border:1px solid #e6e8ef}' +
    '.msg.user{background:var(--accent);color:#fff}' +
    '.cites{margin-top:6px;padding-top:6px;border-top:1px solid #e6e8ef;font-size:11px;color:#6b7280}' +
    '.foot{display:flex;gap:8px;padding:10px;border-top:1px solid #eceef3;background:#fff}' +
    '.foot input{flex:1;border:1px solid #d6dae3;border-radius:10px;padding:9px 12px;font-size:14px;outline:none}' +
    '.foot input:focus{border-color:var(--accent)}' +
    '.foot button{background:var(--accent);color:#fff;border:none;border-radius:10px;padding:0 14px;font-size:14px;cursor:pointer}' +
    '.foot button:disabled{opacity:.5;cursor:default}' +
    '.dot{display:inline-block;animation:b 1s infinite}@keyframes b{50%{opacity:.3}}';
  root.appendChild(style);

  // Разметка виджета.
  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<button class="bubble" part="bubble" aria-label="Открыть чат">💬</button>' +
    '<div class="panel">' +
    '<div class="head"><span class="title">Поддержка</span><button class="close" aria-label="Закрыть">×</button></div>' +
    '<div class="msgs"></div>' +
    '<form class="foot"><input class="in" placeholder="Напишите сообщение…" autocomplete="off"/><button type="submit">→</button></form>' +
    '</div>';
  root.appendChild(wrap);

  var bubble = root.querySelector('.bubble');
  var panel = root.querySelector('.panel');
  var msgsEl = root.querySelector('.msgs');
  var form = root.querySelector('.foot');
  var input = root.querySelector('.in');
  var sendBtn = form.querySelector('button');
  var titleEl = root.querySelector('.title');

  function applyTheme() {
    host.style.setProperty('--accent', accent);
    root.host.style.setProperty('--accent', accent);
    wrap.style.setProperty('--accent', accent);
    titleEl.textContent = botName;
  }
  applyTheme();

  // Подтянуть тему/имя/приветствие бота (необязательно для работы чата).
  fetch(API + '/api/bots/' + botId + '/config')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg) return;
      accent = cfg.accentColor || accent;
      botName = cfg.name || botName;
      welcome = cfg.welcomeMessage || welcome;
      applyTheme();
    })
    .catch(function () {});

  var opened = false;
  var greeted = false;
  function toggle() {
    opened = !opened;
    panel.classList.toggle('open', opened);
    if (opened && !greeted) {
      greeted = true;
      addMsg('bot', welcome);
    }
    if (opened) input.focus();
  }
  bubble.addEventListener('click', toggle);
  root.querySelector('.close').addEventListener('click', toggle);

  function addMsg(role, text) {
    var row = document.createElement('div');
    row.className = 'row ' + role;
    var b = document.createElement('div');
    b.className = 'msg ' + role;
    b.textContent = text;
    row.appendChild(b);
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return b; // возвращаем узел сообщения (чтобы дописывать стрим)
  }

  // --- отправка + чтение SSE-потока ---
  var busy = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    busy = true;
    sendBtn.disabled = true;
    addMsg('user', text);
    var botMsg = addMsg('bot', '');
    botMsg.innerHTML = '<span class="dot">●</span>';

    var answer = '';
    var citations = [];

    fetch(API + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // x-groq-key НЕ шлём: виджет на чужом сайте, ключ — на сервере (env).
      body: JSON.stringify({ botId: botId, message: text, conversationId: conversationId, visitorId: visitorId }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) throw new Error('net ' + res.status);
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var buf = '';

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return finish();
            buf += dec.decode(r.value, { stream: true });
            var idx;
            while ((idx = buf.indexOf('\n\n')) !== -1) {
              var raw = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              handleEvent(raw);
            }
            return pump();
          });
        }
        return pump();
      })
      .catch(function () {
        botMsg.textContent = 'Не удалось связаться с сервером.';
        finish();
      });

    function handleEvent(raw) {
      var ev = 'message';
      var data = '';
      raw.split('\n').forEach(function (line) {
        if (line.indexOf('event:') === 0) ev = line.slice(6).trim();
        else if (line.indexOf('data:') === 0) data += line.slice(5).trim();
      });
      if (!data) return;
      var parsed;
      try { parsed = JSON.parse(data); } catch (e) { parsed = data; }

      if (ev === 'token') {
        answer += parsed.text || '';
        botMsg.textContent = answer;
        msgsEl.scrollTop = msgsEl.scrollHeight;
      } else if (ev === 'citations') {
        citations = parsed || [];
      } else if (ev === 'done') {
        conversationId = parsed.conversationId || conversationId;
        renderCitations();
        finish();
      } else if (ev === 'error') {
        botMsg.textContent = (answer || '') + (parsed.message || 'Ошибка');
        finish();
      }
    }

    function renderCitations() {
      if (!citations.length) return;
      var seen = {};
      var names = [];
      citations.forEach(function (c) {
        if (!seen[c.filename]) { seen[c.filename] = 1; names.push('[' + c.index + '] ' + c.filename); }
      });
      var cit = document.createElement('div');
      cit.className = 'cites';
      cit.textContent = 'Источники: ' + names.join('  ');
      botMsg.appendChild(cit);
    }

    function finish() {
      busy = false;
      sendBtn.disabled = false;
      if (botMsg.textContent === '' && !botMsg.querySelector('.cites')) {
        botMsg.textContent = '…';
      }
    }
  });
})();
