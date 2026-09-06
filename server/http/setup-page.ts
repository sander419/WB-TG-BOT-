/**
 * Страница первичной настройки: /setup
 *
 * Отдельно от демо-интерфейса в src/ и намеренно без сборки. Причины:
 *
 *  — Демо-SPA работает на захардкоженных данных. Показывать в нём подключение
 *    настоящего магазина значит смешать выдуманные цифры с реальными.
 *  — Эта страница нужна в том числе тогда, когда всё остальное сломано:
 *    она не должна зависеть от сборки фронтенда.
 *  — Разметка встроена в код, а не читается с диска: в продакшен-образ
 *    копируется только dist, лишний файл пришлось бы тащить отдельно.
 *
 * Работает с теми же публичными эндпоинтами, что и любой другой клиент.
 */

export const SETUP_PAGE = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>CommerceOS — настройка</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f6f4; --fg: #17171a; --muted: #6b6b74; --line: #d9d9d4;
    --card: #fff; --accent: #2f5fe0; --ok: #1a7f4b; --warn: #a35b00; --err: #b3261e;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#131316; --fg:#ececf0; --muted:#9a9aa4; --line:#2c2c33;
            --card:#1a1a1f; --accent:#7aa2ff; --ok:#4ec98a; --warn:#e0a44a; --err:#ff8a80; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px 16px 64px; background:var(--bg); color:var(--fg);
         font:15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 680px; margin: 0 auto; }
  h1 { font-size:22px; margin:0 0 4px; letter-spacing:-0.01em; }
  h2 { font-size:16px; margin:0 0 12px; }
  p.lead { color:var(--muted); margin:0 0 24px; }
  section { background:var(--card); border:1px solid var(--line); border-radius:10px;
            padding:18px; margin-bottom:16px; }
  label { display:block; font-size:13px; color:var(--muted); margin:12px 0 4px; }
  input, select { width:100%; padding:9px 10px; font:inherit; color:inherit;
                  background:transparent; border:1px solid var(--line); border-radius:7px; }
  input:focus-visible, select:focus-visible, button:focus-visible {
    outline:2px solid var(--accent); outline-offset:1px; }
  button { font:inherit; padding:9px 14px; border-radius:7px; border:1px solid transparent;
           background:var(--accent); color:#fff; cursor:pointer; }
  button.secondary { background:transparent; border-color:var(--line); color:inherit; }
  button:disabled { opacity:.5; cursor:default; }
  .row { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
  .msg { margin-top:12px; padding:10px 12px; border-radius:7px; font-size:14px; white-space:pre-wrap; }
  .msg.ok { background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok); }
  .msg.err { background:color-mix(in srgb, var(--err) 14%, transparent); color:var(--err); }
  .msg.warn { background:color-mix(in srgb, var(--warn) 16%, transparent); color:var(--warn); }
  .hint { font-size:13px; color:var(--muted); margin-top:6px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:8px 6px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-weight:600; color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  code { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:13px;
         background:color-mix(in srgb, var(--fg) 8%, transparent); padding:1px 5px; border-radius:4px; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }
  .dot.ok { background:var(--ok); } .dot.warn { background:var(--warn); } .dot.err { background:var(--err); }
  .hidden { display:none; }
  .between { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
</style>
</head>
<body>
<main>
  <h1>CommerceOS — настройка</h1>
  <p class="lead">Подключение магазина и проверка состояния. Демо-интерфейс живёт на <a href="/">главной</a> и работает на выдуманных данных.</p>

  <section id="health-card">
    <h2>Состояние установки</h2>
    <div id="health">Проверяю…</div>
  </section>

  <section id="auth-card">
    <h2 id="auth-title">Вход</h2>
    <div id="auth-body">
      <label for="email">Почта</label>
      <input id="email" type="email" autocomplete="username" placeholder="you@example.com">

      <label for="password">Пароль</label>
      <input id="password" type="password" autocomplete="current-password" placeholder="не короче 10 символов">

      <div id="org-field" class="hidden">
        <label for="org">Название организации</label>
        <input id="org" type="text" placeholder="Моя компания">
      </div>

      <div class="row">
        <button id="login-btn">Войти</button>
        <button id="register-btn" class="secondary">Зарегистрироваться</button>
      </div>
      <div id="auth-msg"></div>
    </div>
  </section>

  <section id="store-card" class="hidden">
    <div class="between"><h2>Магазины</h2><button id="refresh-btn" class="secondary">Обновить</button></div>
    <div id="stores">Загружаю…</div>
  </section>

  <section id="connect-card" class="hidden">
    <h2>Подключить магазин</h2>
    <label for="marketplace">Площадка</label>
    <select id="marketplace">
      <option value="wildberries">Wildberries</option>
      <option value="ozon">Ozon (коннектор не реализован)</option>
      <option value="shopify">Shopify (коннектор не реализован)</option>
    </select>

    <label for="store-name">Название магазина</label>
    <input id="store-name" type="text" placeholder="Основной магазин">

    <label for="api-key">API-токен площадки</label>
    <input id="api-key" type="password" autocomplete="off" placeholder="вставьте токен из личного кабинета">
    <p class="hint">Токен шифруется перед записью в базу и не попадает в логи. Он даёт полный доступ к магазину — не вставляйте сюда чужой.</p>

    <div class="row"><button id="connect-btn">Подключить и проверить</button></div>
    <div id="connect-msg"></div>
  </section>
</main>

<script>
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = { user: null };

  const show = (el, on) => el.classList.toggle('hidden', !on);
  const msg = (el, text, kind) => {
    el.innerHTML = '';
    if (!text) return;
    const div = document.createElement('div');
    div.className = 'msg ' + (kind || 'ok');
    div.textContent = text;
    el.appendChild(div);
  };

  async function api(path, options = {}) {
    const init = { credentials: 'same-origin', headers: {}, ...options };
    if (init.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(init.body);
    }
    const res = await fetch(path, init);
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }
    if (!res.ok) {
      const message = data && data.error ? data.error.message : 'HTTP ' + res.status;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function statusDot(ok) {
    return '<span class="dot ' + (ok ? 'ok' : 'err') + '"></span>';
  }

  async function loadHealth() {
    try {
      const h = await api('/api/platform/health');
      const rows = [
        ['База данных', h.database.ok, h.database.message || 'подключена'],
        ['Шифрование секретов', h.encryption.configured, h.encryption.configured ? 'ключ задан' : 'нет SECRETS_ENCRYPTION_KEY'],
        ['Воркер синхронизации', h.syncWorker.running, h.syncWorker.running ? 'работает' : 'не запущен'],
        ['Telegram-бот', h.telegram.enabled, h.telegram.enabled ? 'режим ' + h.telegram.mode : 'выключен'],
      ];
      let html = '<table><tbody>';
      for (const [name, ok, note] of rows) {
        html += '<tr><td>' + statusDot(ok) + name + '</td><td style="color:var(--muted)">' + note + '</td></tr>';
      }
      html += '</tbody></table>';

      if (h.useMockData) {
        html += '<div class="msg warn">USE_MOCK_DATA=true — демо-интерфейс на главной показывает выдуманные данные, а не ваш магазин.</div>';
      }
      const unverified = (h.warnings && h.warnings.unverifiedWbEndpoints) || [];
      if (unverified.length) {
        html += '<div class="msg warn">Пути WB API не сверены с документацией: ' + unverified.length + '. Первая синхронизация может упасть — см. docs/INTEGRATION-WILDBERRIES.md</div>';
      }
      $('health').innerHTML = html;
    } catch (error) {
      $('health').innerHTML = '<div class="msg err">Не удалось получить состояние: ' + error.message + '</div>';
    }
  }

  async function loadAuthState() {
    try {
      const me = await api('/api/auth/me');
      state.user = me.user;
      renderAuthed();
      return;
    } catch (error) {
      if (error.status !== 401) {
        msg($('auth-msg'), error.message, 'err');
      }
    }
    try {
      const st = await api('/api/auth/state');
      if (st.firstRun) {
        $('auth-title').textContent = 'Первый запуск: создайте учётную запись';
        show($('org-field'), true);
      }
    } catch { /* база не настроена — health это уже показал */ }
  }

  function renderAuthed() {
    const u = state.user;
    $('auth-title').textContent = 'Учётная запись';
    $('auth-body').innerHTML =
      '<p>' + u.email + ' · ' + u.organization.name + ' · роль <code>' + u.role + '</code></p>' +
      '<div class="row"><button id="logout-btn" class="secondary">Выйти</button></div>';
    $('logout-btn').addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      location.reload();
    });
    show($('store-card'), true);
    show($('connect-card'), u.role === 'owner' || u.role === 'admin');
    loadStores();
  }

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function loadStores() {
    try {
      const { stores } = await api('/api/platform/stores');
      if (!stores.length) {
        $('stores').innerHTML = '<p style="color:var(--muted)">Магазинов пока нет. Подключите первый ниже.</p>';
        return;
      }
      let html = '<table><thead><tr><th>Магазин</th><th>Статус</th><th>Синхронизация</th><th></th></tr></thead><tbody>';
      for (const s of stores) {
        const last = s.recentJobs && s.recentJobs.length ? s.recentJobs[0] : null;
        const jobNote = last ? last.module + ': ' + last.status + (last.error ? ' — ' + last.error.slice(0, 80) : '') : 'ещё не запускалась';
        html += '<tr>' +
          '<td>' + s.name + '<div style="color:var(--muted);font-size:13px">' + s.marketplace + '</div></td>' +
          '<td>' + statusDot(s.status === 'active') + s.status + '</td>' +
          '<td style="color:var(--muted)">' + jobNote + '<div>обновлено ' + formatDate(s.lastSyncAt) + '</div></td>' +
          '<td><button class="secondary" data-sync="' + s.id + '">Обновить данные</button>' +
          '<div style="margin-top:6px"><button class="secondary" data-code="' + s.id + '">Код для Telegram</button></div></td>' +
          '</tr>';
      }
      html += '</tbody></table><div id="store-msg"></div>';
      $('stores').innerHTML = html;

      $('stores').querySelectorAll('[data-sync]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await api('/api/platform/stores/' + btn.dataset.sync + '/sync', { method: 'POST', body: {} });
            msg($('store-msg'), 'Поставлено задач: ' + res.queued + '. Воркер выполнит их фоном.', 'ok');
          } catch (error) {
            msg($('store-msg'), error.message, 'err');
          } finally {
            btn.disabled = false;
          }
        });
      });

      $('stores').querySelectorAll('[data-code]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await api('/api/platform/stores/' + btn.dataset.code + '/telegram-code', { method: 'POST' });
            msg($('store-msg'), 'Отправьте боту: ' + res.command + '\\nКод действует 15 минут.', 'ok');
          } catch (error) {
            msg($('store-msg'), error.message, 'err');
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (error) {
      $('stores').innerHTML = '<div class="msg err">' + error.message + '</div>';
    }
  }

  $('login-btn').addEventListener('click', async () => {
    msg($('auth-msg'), '');
    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email: $('email').value, password: $('password').value },
      });
      state.user = res.user;
      renderAuthed();
    } catch (error) {
      msg($('auth-msg'), error.message, 'err');
    }
  });

  $('register-btn').addEventListener('click', async () => {
    msg($('auth-msg'), '');
    if (!$('org-field').classList.contains('hidden') === false) show($('org-field'), true);
    try {
      const body = { email: $('email').value, password: $('password').value };
      const org = $('org').value.trim();
      if (org) body.organizationName = org;
      const res = await api('/api/auth/register', { method: 'POST', body });
      state.user = res.user;
      renderAuthed();
    } catch (error) {
      msg($('auth-msg'), error.message, 'err');
    }
  });

  $('refresh-btn').addEventListener('click', () => { loadStores(); loadHealth(); });

  $('connect-btn').addEventListener('click', async () => {
    msg($('connect-msg'), '');
    const btn = $('connect-btn');
    btn.disabled = true;
    try {
      const res = await api('/api/platform/stores', {
        method: 'POST',
        body: {
          marketplace: $('marketplace').value,
          name: $('store-name').value,
          apiKey: $('api-key').value,
        },
      });
      $('api-key').value = '';
      if (res.check && res.check.ok) {
        const who = res.check.accountName ? ' Аккаунт: ' + res.check.accountName + '.' : '';
        msg($('connect-msg'), 'Магазин создан, токен принят площадкой.' + who +
          ' Поставлено задач синхронизации: ' + res.queuedJobs, 'ok');
      } else {
        // Магазин создан, но токен не подошёл — это разные вещи. Причина
        // от площадки полезнее общего «не получилось»: по ней видно, чинить
        // токен или сеть.
        msg($('connect-msg'), 'Магазин создан, но токен не принят: ' +
          ((res.check && res.check.message) || 'причина неизвестна') +
          ' Исправьте токен и подключите магазин заново.', 'warn');
      }
      loadStores();
    } catch (error) {
      msg($('connect-msg'), error.message, 'err');
      loadStores();
    } finally {
      btn.disabled = false;
    }
  });

  loadHealth();
  loadAuthState();
})();
</script>
</body>
</html>`;
