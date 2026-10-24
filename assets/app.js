(function () {
  'use strict';

  var root = document.documentElement;
  var GENDER_ORDER = ['mujer', 'hombre', 'neutro'];
  var GENDER_LABEL = { mujer: 'Mujer', hombre: 'Hombre', neutro: 'Neutro' };
  var GENDER_COLOR = { mujer: 'var(--gum)', hombre: 'var(--sky)', neutro: 'var(--mint)' };
  var CAT_COLOR = {
    casual: 'var(--mint)',
    elegante: 'var(--lilac)',
    oficina: 'var(--sky)',
    deporte: 'var(--butter)',
    casa: 'var(--peach)',
    interior: 'var(--gum)',
    bano: 'var(--sky)',
    multimarca: 'var(--butter)'
  };
  var LEVEL_TEXT = {
    3: 'Fibra y confección europeas, cadena publicada',
    2: 'Confección europea, fibra de fuera o sin detallar',
    1: 'Solo confección europea'
  };

  var state = { gender: 'todos', cat: 'todas', q: '' };
  var data = null;

  /* ---------- Theme ---------- */
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var toggle = document.getElementById('themeToggle');

  function effectiveDark() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return mq.matches;
  }
  function syncTheme() {
    var dark = effectiveDark();
    root.classList.toggle('is-dark', dark);
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.querySelector('.theme-label').textContent = dark ? 'Modo claro' : 'Modo oscuro';
    toggle.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  toggle.addEventListener('click', function () {
    var next = effectiveDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('chuchu-theme', next); } catch (e) {}
    syncTheme();
  });
  if (mq.addEventListener) mq.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- URL state ---------- */
  function readUrl() {
    var p = new URLSearchParams(location.search);
    if (['todos', 'mujer', 'hombre', 'neutro'].indexOf(p.get('genero')) > -1) state.gender = p.get('genero');
    if (p.get('tipo')) state.cat = p.get('tipo');
    if (p.get('q')) state.q = p.get('q');
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.gender !== 'todos') p.set('genero', state.gender);
    if (state.cat !== 'todas') p.set('tipo', state.cat);
    if (state.q) p.set('q', state.q);
    var s = p.toString();
    history.replaceState(null, '', s ? '?' + s : location.pathname);
  }

  /* ---------- Helpers ---------- */
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function matchesQuery(site) {
    if (!state.q) return true;
    var hay = norm([site.name, site.made_in, site.fiber, site.description].join(' '));
    return norm(state.q).split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
  }
  function matchesGender(site) {
    return state.gender === 'todos' || site.gender === state.gender;
  }
  function matchesCat(site) {
    return state.cat === 'todas' || site.categories.indexOf(state.cat) > -1;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Categories ---------- */
  function renderCats() {
    var list = document.getElementById('catList');
    list.innerHTML = '';
    var pool = data.sites.filter(function (s) { return matchesGender(s) && matchesQuery(s); });
    var entries = [['todas', 'Todo']].concat(Object.keys(data.categories).map(function (k) { return [k, data.categories[k]]; }));
    entries.forEach(function (e) {
      var key = e[0];
      var count = key === 'todas' ? pool.length : pool.filter(function (s) { return s.categories.indexOf(key) > -1; }).length;
      var li = el('li');
      var b = el('button', 'cat-btn');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.cat === key));
      b.appendChild(el('span', null, e[1]));
      b.appendChild(el('span', 'cat-count', String(count)));
      b.addEventListener('click', function () {
        state.cat = key;
        update();
      });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  /* ---------- Cards ---------- */
  var tpl = document.getElementById('cardTpl');

  function buildCard(site) {
    var node = tpl.content.firstElementChild.cloneNode(true);
    var main = site.categories[0];
    var blob = node.querySelector('.blob');
    blob.textContent = site.name.charAt(0);
    blob.style.background = CAT_COLOR[main] || 'var(--lilac)';

    node.querySelector('.card-name').textContent = site.name;
    node.querySelector('.card-origin').textContent =
      site.categories.indexOf('multimarca') > -1 ? site.made_in : 'Hecho en ' + site.made_in;
    node.querySelector('.card-desc').textContent = site.description;
    node.querySelector('.card-fiber').textContent = 'Fibra: ' + site.fiber;

    var lvl = node.querySelector('.card-level');
    for (var i = 1; i <= 3; i++) lvl.appendChild(el('i', i <= site.level ? 'on' : ''));
    lvl.setAttribute('role', 'img');
    lvl.setAttribute('aria-label', 'Trazabilidad ' + site.level + ' de 3: ' + LEVEL_TEXT[site.level]);
    lvl.title = LEVEL_TEXT[site.level];

    var tags = node.querySelector('.card-tags');
    site.categories.forEach(function (c) {
      var t = el('li', null, data.categories[c] || c);
      t.style.background = CAT_COLOR[c] || 'var(--lilac)';
      tags.appendChild(t);
    });

    var st = node.querySelector('.card-status');
    if (site.status === 'ok') {
      st.textContent = 'Enlace comprobado el ' + fmtDate(site.last_checked);
      st.classList.add('ok');
    } else if (site.status === 'roto') {
      st.textContent = 'No respondía en la revisión del ' + fmtDate(site.last_checked);
      st.classList.add('bad');
      node.classList.add('broken');
    } else {
      st.textContent = 'Pendiente de la primera revisión';
    }

    var a = node.querySelector('.visit');
    a.href = site.url;
    a.setAttribute('aria-label', 'Visitar la web de ' + site.name + ' (se abre en otra pestaña)');
    return node;
  }

  function sortSites(arr) {
    return arr.slice().sort(function (a, b) {
      return (b.level - a.level) || a.name.localeCompare(b.name, 'es');
    });
  }

  function renderResults() {
    var wrap = document.getElementById('groups');
    wrap.innerHTML = '';
    var visible = data.sites.filter(function (s) { return matchesGender(s) && matchesCat(s) && matchesQuery(s); });

    if (!visible.length) {
      var empty = el('div', 'empty');
      empty.appendChild(el('p', null, 'Ninguna tienda encaja con estos filtros.'));
      var reset = el('button', null, 'Quitar filtros');
      reset.type = 'button';
      reset.addEventListener('click', function () {
        state.gender = 'todos'; state.cat = 'todas'; state.q = '';
        document.getElementById('searchInput').value = '';
        update();
      });
      empty.appendChild(reset);
      wrap.appendChild(empty);
      return;
    }

    var genders = state.gender === 'todos' ? GENDER_ORDER : [state.gender];
    genders.forEach(function (g) {
      var items = sortSites(visible.filter(function (s) { return s.gender === g; }));
      if (!items.length) return;
      var sec = el('section', 'group');
      var h = el('h2', 'group-title');
      var dot = el('span', 'mini');
      dot.style.background = GENDER_COLOR[g];
      dot.setAttribute('aria-hidden', 'true');
      h.appendChild(dot);
      h.appendChild(document.createTextNode(GENDER_LABEL[g] + ' '));
      h.appendChild(el('span', 'n', items.length === 1 ? '1 tienda' : items.length + ' tiendas'));
      sec.appendChild(h);
      if (g === 'neutro') sec.appendChild(el('p', 'card-fiber', 'Tiendas con ropa de hombre y de mujer.'));
      var grid = el('div', 'grid');
      items.forEach(function (s) { grid.appendChild(buildCard(s)); });
      sec.appendChild(grid);
      wrap.appendChild(sec);
    });
  }

  /* ---------- Gender gumballs ---------- */
  var balls = Array.prototype.slice.call(document.querySelectorAll('.gumball'));
  function syncBalls() {
    balls.forEach(function (b) {
      var on = b.dataset.gender === state.gender;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
  }
  function pick(b) {
    state.gender = b.dataset.gender;
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    update();
  }
  balls.forEach(function (b, i) {
    b.addEventListener('click', function () { pick(b); });
    b.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var next = balls[(i + d + balls.length) % balls.length];
      next.focus();
      pick(next);
    });
  });

  /* ---------- Search ---------- */
  var search = document.getElementById('searchInput');
  search.addEventListener('input', function () {
    state.q = search.value.trim();
    update();
  });

  function update() {
    syncBalls();
    renderCats();
    renderResults();
    writeUrl();
  }

  /* ---------- Boot ---------- */
  readUrl();
  search.value = state.q;
  fetch('data/sites.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (json) {
      data = json;
      if (state.cat !== 'todas' && !data.categories[state.cat]) state.cat = 'todas';
      var n = data.sites.length;
      document.getElementById('heroMeta').textContent =
        n + ' tiendas en la lista. Última actualización: ' + fmtDate(data.updated) + '.';
      update();
    })
    .catch(function () {
      document.getElementById('heroMeta').textContent =
        'No se pudo cargar la lista de tiendas. Recarga la página para intentarlo de nuevo.';
    });
})();
