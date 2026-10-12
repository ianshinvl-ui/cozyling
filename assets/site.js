/* Tiny vanilla JS: theme toggle, species picker, shop tabs, in-view video. No dependencies, no network. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* theme: system by default, manual override remembered (optional) */
  var tbtn = document.getElementById('theme-toggle');
  function effective() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncToggle() { if (tbtn) tbtn.setAttribute('aria-pressed', effective() === 'dark' ? 'true' : 'false'); }
  if (tbtn) {
    syncToggle();
    tbtn.addEventListener('click', function () {
      var next = effective() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncToggle();
    });
  }

  /* species picker + stages (shared species state) */
  var data = window.__species || null;
  var picker = document.getElementById('picker');
  if (picker && data) {
    var state = { sp: 'mochi', mode: 'adult', color: 'mochi' };
    var img = document.getElementById('picker-img');
    var stage = document.getElementById('picker-stage');
    var elName = document.getElementById('picker-name');
    var elTag = document.getElementById('picker-tag');
    var elFoods = document.getElementById('picker-foods');
    var elColor = document.getElementById('picker-color');
    var stageList = document.getElementById('stage-list');
    var formList = document.getElementById('form-list');
    var cache = {};
    function src(sp, mode, color) { return 'assets/img/pick_' + sp + '_' + mode + '_' + color + '.webp'; }
    function preload(url) { if (!cache[url]) { var i = new Image(); i.src = url; cache[url] = i; } }
    function render() {
      var s = data.species[state.sp], c = data.colors[state.color];
      img.src = src(state.sp, state.mode, state.color);
      img.alt = s.name + (state.mode === 'egg' ? ' egg' : '') + ' in ' + c.name.toLowerCase();
      stage.style.backgroundColor = 'var(--' + c.band + ')';
      elName.textContent = s.name;
      elTag.textContent = s.tagline;
      elColor.textContent = c.name;
      elFoods.innerHTML = '';
      s.foods.forEach(function (f) {
        var li = document.createElement('li'); li.className = 'chip';
        var im = document.createElement('img'); im.src = 'assets/img/item_' + f.id + '.webp'; im.alt = ''; im.width = 30; im.height = 30; im.loading = 'lazy';
        li.appendChild(im); li.appendChild(document.createTextNode(f.name)); elFoods.appendChild(li);
      });
      document.querySelectorAll('[data-sp]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sp === state.sp ? 'true' : 'false'); });
      document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === state.mode ? 'true' : 'false'); });
      document.querySelectorAll('[data-color]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.color === state.color ? 'true' : 'false'); });
      if (stageList) {
        stageList.querySelectorAll('img[data-stage]').forEach(function (im) { im.src = 'assets/img/stage_' + state.sp + '_' + im.dataset.stage + '.webp'; im.alt = s.name + ' ' + im.dataset.stage; });
        formList.querySelectorAll('img[data-form]').forEach(function (im) { im.src = 'assets/img/form_' + state.sp + '_' + im.dataset.form + '.webp'; im.alt = s.name + ' adult, ' + im.dataset.form + ' form'; });
      }
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sp],[data-mode],[data-color]');
      if (!b) return;
      if (b.dataset.sp) state.sp = b.dataset.sp;
      if (b.dataset.mode) state.mode = b.dataset.mode;
      if (b.dataset.color) state.color = b.dataset.color;
      render();
    });
    /* warm the cache for the other states on first interaction */
    function warm() {
      Object.keys(data.species).forEach(function (sp) { preload(src(sp, 'adult', state.color)); preload(src(sp, 'egg', state.color)); });
      Object.keys(data.colors).forEach(function (c) { preload(src(state.sp, state.mode, c)); });
    }
    picker.addEventListener('pointerenter', warm, { once: true });
    picker.addEventListener('focusin', warm, { once: true });
    render();
  }

  /* trailer: click to play, never autoplays */
  var tp = document.querySelector('.trailer-play');
  if (tp) tp.addEventListener('click', function () {
    var v = document.createElement('video');
    v.src = tp.dataset.src; v.poster = tp.dataset.poster; v.controls = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('aria-label', 'Trailer');
    tp.replaceWith(v); v.play().catch(function () {}); v.focus();
  });

  /* shop tabs */
  var tabs = document.querySelectorAll('[data-shop]');
  if (tabs.length) {
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
        document.querySelectorAll('.shop-panel').forEach(function (p) { p.hidden = p.id !== 'shop-' + t.dataset.shop; });
        document.querySelectorAll('.shop-panel:not([hidden]) img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
      });
    });
  }

  /* videos: autoplay muted loop only while in view; never when reduced motion */
  var vids = document.querySelectorAll('video[data-autoplay]');
  vids.forEach(function (v) {
    v.muted = true; v.loop = true; v.playsInline = true;
    var scene = v.closest('.scene');
    function ready() { v.classList.add('ready'); if (scene) scene.classList.add('video-on'); }
    function load() {
      if (v.dataset.loaded) return; v.dataset.loaded = '1';
      v.querySelectorAll('source[data-src]').forEach(function (s) { s.src = s.dataset.src; });
      v.load();
    }
    if (reduce || !('IntersectionObserver' in window)) { v.controls = false; return; }
    v.addEventListener('playing', ready);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { load(); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: 0.25 }).observe(v);
  });
})();
