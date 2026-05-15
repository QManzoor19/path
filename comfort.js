/* MyPath comfort rating — shared 0-10 widget for all variants.
   Renders a 10-segment bar, migrates old `done` topics, exposes a small API. */
(function () {
  'use strict';

  function migrate(s) {
    for (const kind of ['subject', 'skill']) {
      if (!s[kind]) continue;
      for (const d of s[kind]) {
        if (!d.topics) continue;
        for (const t of d.topics) {
          if (t.comfort === undefined) t.comfort = t.done ? 10 : 0;
          t.done = t.comfort >= 10;
        }
      }
    }
  }

  function bar(comfort, size) {
    const cells = [];
    for (let i = 1; i <= 10; i++) {
      cells.push(
        `<button class="cf-cell${comfort >= i ? ' on' : ''}" data-v="${i}" aria-label="set ${i} of 10" type="button"></button>`
      );
    }
    if (size === 'lg') {
      return `<div class="cf-bar cf-lg">
        <button class="cf-zero" data-v="0" type="button" aria-label="reset to 0">0</button>
        <div class="cf-cells">${cells.join('')}</div>
        <span class="cf-val">${comfort} <span class="cf-of">/ 10</span></span>
      </div>`;
    }
    return `<div class="cf-bar cf-sm">
      <button class="cf-x" data-v="0" type="button" title="reset to 0" aria-label="reset to 0">×</button>
      <div class="cf-cells">${cells.join('')}</div>
      <span class="cf-val">${comfort}</span>
    </div>`;
  }

  function avg(topics) {
    if (!topics || !topics.length) return 0;
    let sum = 0;
    for (const t of topics) sum += t.comfort || 0;
    return sum / topics.length;
  }

  function attachBars(root, onChange) {
    root.addEventListener('click', function (e) {
      const cell = e.target.closest('[data-v]');
      if (!cell) return;
      const barEl = cell.closest('.cf-bar');
      if (!barEl || !root.contains(barEl)) return;
      e.preventDefault();
      e.stopPropagation();
      const v = parseInt(cell.dataset.v, 10);
      onChange(v, barEl);
    });
  }

  function injectStyles() {
    if (document.getElementById('cf-styles')) return;
    const s = document.createElement('style');
    s.id = 'cf-styles';
    s.textContent = `
      .cf-bar { display: inline-flex; align-items: center; gap: 0; flex-shrink: 0; }
      .cf-cells { display: inline-flex; gap: 2px; }
      .cf-cell { padding: 0; border: none; cursor: pointer; transition: background 0.12s, transform 0.12s; }
      .cf-val { font-size: 11px; opacity: 0.65; margin-left: 8px; min-width: 14px; font-variant-numeric: tabular-nums; }
      .cf-of { opacity: 0.6; }

      /* small */
      .cf-sm .cf-cell { width: 9px; height: 14px; background: var(--cf-empty, rgba(0,0,0,0.08)); border-radius: 2px; }
      .cf-sm .cf-cell.on { background: var(--cf-on, currentColor); }
      .cf-sm .cf-cell:hover { background: var(--cf-hover, var(--cf-on, currentColor)); transform: scaleY(1.15); }
      .cf-sm .cf-x {
        width: 16px; height: 14px; padding: 0; margin-right: 5px;
        border: none; background: transparent; color: inherit; opacity: 0;
        cursor: pointer; font-size: 12px; line-height: 1; border-radius: 3px;
        font-family: inherit;
      }
      .cf-bar.cf-sm:hover .cf-x { opacity: 0.45; }
      .cf-sm .cf-x:hover { opacity: 1; }

      /* large (topic page) */
      .cf-lg { gap: 0; flex-wrap: wrap; }
      .cf-lg .cf-cells { gap: 4px; }
      .cf-lg .cf-cell { width: 28px; height: 34px; background: var(--cf-empty, rgba(0,0,0,0.08)); border-radius: 6px; }
      .cf-lg .cf-cell.on { background: var(--cf-on, currentColor); }
      .cf-lg .cf-cell:hover { background: var(--cf-hover, var(--cf-on, currentColor)); transform: translateY(-1px); }
      .cf-lg .cf-zero {
        padding: 6px 12px; margin-right: 10px;
        border: 1px solid var(--cf-empty, rgba(0,0,0,0.12));
        background: transparent; color: inherit; opacity: 0.65;
        cursor: pointer; font-size: 13px; border-radius: 8px;
        font-family: inherit; font-weight: 500;
      }
      .cf-lg .cf-zero:hover { opacity: 1; }
      .cf-lg .cf-val { font-size: 20px; font-weight: 600; margin-left: 14px; min-width: auto; opacity: 0.9; }

      @media (max-width: 480px) {
        .cf-lg .cf-cell { width: 22px; height: 30px; }
        .cf-lg .cf-zero { padding: 5px 9px; font-size: 12px; }
      }
    `;
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  window.MyPathComfort = { migrate, bar, avg, attachBars };
})();
