/* MyPath AI tutor — shared across all variants.
   Renders a floating button + slide-in chat drawer. Calls the Anthropic API
   directly from the browser. The user's API key is stored in localStorage
   and never leaves their machine. */
(function () {
  'use strict';

  const STORAGE_KEY = 'mypath:apikey';
  const CHAT_PREFIX = 'mypath:ai:chat:';
  const STATE_KEY = 'learnpath:v1';
  const MODEL = 'claude-opus-4-7';
  const API_URL = 'https://api.anthropic.com/v1/messages';

  let theme = 'paper';
  let getNavContext = () => null;

  const STYLES = `
    .mp-fab { position: fixed; bottom: 20px; right: 20px; width: 54px; height: 54px; border: none; cursor: pointer; z-index: 1000; display: flex; align-items: center; justify-content: center; font-size: 22px; transition: transform 0.18s ease, box-shadow 0.18s ease; font-family: inherit; }
    .mp-fab:hover { transform: scale(1.05); }
    .mp-fab:active { transform: scale(0.96); }

    .mp-drawer-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.32); z-index: 1001; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
    .mp-drawer-bg.open { opacity: 1; pointer-events: auto; }

    .mp-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); display: flex; flex-direction: column; z-index: 1002; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-family: inherit; }
    .mp-drawer.open { transform: translateX(0); }

    .mp-head { padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--mp-line); flex-shrink: 0; }
    .mp-head .ctx { font-size: 13px; line-height: 1.35; min-width: 0; flex: 1; }
    .mp-head .ctx .scope { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mp-head .ctx .sub { opacity: 0.65; font-size: 12px; margin-top: 2px; }
    .mp-head .close { background: transparent; border: none; cursor: pointer; padding: 6px 10px; font-size: 18px; color: inherit; opacity: 0.6; font-family: inherit; line-height: 1; }
    .mp-head .close:hover { opacity: 1; }

    .mp-msgs { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
    .mp-msg { padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.55; max-width: 88%; word-wrap: break-word; white-space: pre-wrap; }
    .mp-msg.user { align-self: flex-end; background: var(--mp-user-bg); color: var(--mp-user-fg); }
    .mp-msg.assistant { align-self: flex-start; background: var(--mp-asst-bg); color: var(--mp-asst-fg); }
    .mp-msg.err { background: rgba(220, 60, 60, 0.12) !important; color: #c62828 !important; font-size: 13px; }

    .mp-empty { color: var(--mp-muted); font-size: 13px; text-align: center; padding: 40px 24px; line-height: 1.6; }
    .mp-empty .big { font-size: 28px; margin-bottom: 10px; }

    .mp-typing::after { content: '▊'; opacity: 0.5; animation: mp-blink 1s steps(1) infinite; margin-left: 2px; }
    @keyframes mp-blink { 50% { opacity: 0; } }

    .mp-input-area { padding: 12px 14px 14px; border-top: 1px solid var(--mp-line); flex-shrink: 0; }
    .mp-input-row { display: flex; gap: 8px; align-items: flex-end; }
    .mp-input { flex: 1; resize: none; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--mp-line); font: inherit; font-size: 14px; outline: none; background: var(--mp-input-bg); color: var(--mp-fg); min-height: 40px; max-height: 140px; line-height: 1.4; transition: border-color 0.15s; }
    .mp-input:focus { border-color: var(--mp-accent); }
    .mp-send { padding: 10px 16px; border: none; cursor: pointer; font: inherit; font-weight: 500; font-size: 14px; height: 40px; }
    .mp-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .mp-footer-link { display: block; width: 100%; font-size: 11px; opacity: 0.5; cursor: pointer; padding: 8px 0 0; text-align: center; border: none; background: transparent; color: inherit; font-family: inherit; }
    .mp-footer-link:hover { opacity: 1; color: var(--mp-accent); }

    .mp-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
    .mp-modal-bg.open { display: flex; }
    .mp-modal { padding: 24px; max-width: 440px; width: 100%; border-radius: 16px; background: var(--mp-bg); color: var(--mp-fg); border: 1px solid var(--mp-line); font-family: inherit; }
    .mp-modal h3 { margin: 0 0 6px; font-size: 18px; font-weight: 600; }
    .mp-modal p { font-size: 13px; opacity: 0.75; margin: 0 0 14px; line-height: 1.5; }
    .mp-modal input { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--mp-line); font: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; background: var(--mp-input-bg); color: var(--mp-fg); margin-bottom: 8px; outline: none; }
    .mp-modal input:focus { border-color: var(--mp-accent); }
    .mp-modal .hint { font-size: 11px; opacity: 0.6; margin: 0 0 16px; line-height: 1.5; }
    .mp-modal .hint a { color: var(--mp-accent); }
    .mp-modal .actions { display: flex; gap: 8px; justify-content: flex-end; }
    .mp-modal button { padding: 9px 16px; border: none; cursor: pointer; font: inherit; font-size: 13px; font-family: inherit; }

    /* paper */
    [data-mp-theme="paper"] { --mp-bg: #fbf6ec; --mp-fg: #2a2520; --mp-line: #d8cdb9; --mp-accent: #c2532a; --mp-muted: #6b5e52; --mp-user-bg: #c2532a; --mp-user-fg: #fbf6ec; --mp-asst-bg: #ebe2d3; --mp-asst-fg: #2a2520; --mp-input-bg: #fff; }
    [data-mp-theme="paper"] .mp-fab { background: #2a2520; color: #fbf6ec; border-radius: 16px; }
    [data-mp-theme="paper"] .mp-drawer { background: #fbf6ec; color: #2a2520; border-left: 1px solid #d8cdb9; box-shadow: -20px 0 50px rgba(60,40,20,0.12); }
    [data-mp-theme="paper"] .mp-send { background: #c2532a; color: #fff; border-radius: 10px; }
    [data-mp-theme="paper"] .mp-modal .btn-primary { background: #c2532a; color: #fff; border-radius: 8px; }
    [data-mp-theme="paper"] .mp-modal .btn-secondary { background: transparent; color: #6b5e52; }

    /* mono */
    [data-mp-theme="mono"] { --mp-bg: #ffffff; --mp-fg: #0a0a0a; --mp-line: #e5e7eb; --mp-accent: #0a0a0a; --mp-muted: #6b7280; --mp-user-bg: #0a0a0a; --mp-user-fg: #fff; --mp-asst-bg: #f4f4f5; --mp-asst-fg: #0a0a0a; --mp-input-bg: #fff; }
    [data-mp-theme="mono"] .mp-fab { background: #0a0a0a; color: #fff; border-radius: 8px; }
    [data-mp-theme="mono"] .mp-drawer { background: #ffffff; color: #0a0a0a; border-left: 1px solid #e5e7eb; box-shadow: -20px 0 50px rgba(0,0,0,0.08); }
    [data-mp-theme="mono"] .mp-msg { border-radius: 8px; }
    [data-mp-theme="mono"] .mp-send { background: #0a0a0a; color: #fff; border-radius: 6px; }
    [data-mp-theme="mono"] .mp-input { border-radius: 6px; }
    [data-mp-theme="mono"] .mp-modal { border-radius: 8px; }
    [data-mp-theme="mono"] .mp-modal .btn-primary { background: #0a0a0a; color: #fff; border-radius: 6px; }
    [data-mp-theme="mono"] .mp-modal .btn-secondary { background: transparent; color: #6b7280; }

    /* dark */
    [data-mp-theme="dark"] { --mp-bg: #14161f; --mp-fg: #e4e4e7; --mp-line: #2a2d3a; --mp-accent: #a78bfa; --mp-muted: #71717a; --mp-user-bg: #a78bfa; --mp-user-fg: #14161f; --mp-asst-bg: #1c1f2a; --mp-asst-fg: #e4e4e7; --mp-input-bg: #0d0e14; }
    [data-mp-theme="dark"] .mp-fab { background: #a78bfa; color: #14161f; border-radius: 50%; box-shadow: 0 0 24px rgba(167,139,250,0.45); }
    [data-mp-theme="dark"] .mp-fab:hover { box-shadow: 0 0 32px rgba(167,139,250,0.6); }
    [data-mp-theme="dark"] .mp-drawer { background: #14161f; color: #e4e4e7; border-left: 1px solid #2a2d3a; box-shadow: -20px 0 50px rgba(0,0,0,0.5); }
    [data-mp-theme="dark"] .mp-send { background: #a78bfa; color: #14161f; border-radius: 10px; font-weight: 600; box-shadow: 0 0 12px rgba(167,139,250,0.25); }
    [data-mp-theme="dark"] .mp-modal .btn-primary { background: #a78bfa; color: #14161f; border-radius: 8px; font-weight: 600; }
    [data-mp-theme="dark"] .mp-modal .btn-secondary { background: transparent; color: #71717a; }

    /* playful */
    [data-mp-theme="playful"] { --mp-bg: #fef9f3; --mp-fg: #2d2545; --mp-line: #f0e4d6; --mp-accent: #ff7f5c; --mp-muted: #8a7a6a; --mp-user-bg: #ff7f5c; --mp-user-fg: #fff; --mp-asst-bg: #ffe8d6; --mp-asst-fg: #2d2545; --mp-input-bg: #fff; }
    [data-mp-theme="playful"] .mp-fab { background: #ff7f5c; color: #fff; border-radius: 22px; box-shadow: 5px 5px 0 #c75a3c; font-weight: 900; font-size: 26px; }
    [data-mp-theme="playful"] .mp-fab:hover { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 #c75a3c; }
    [data-mp-theme="playful"] .mp-fab:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #c75a3c; }
    [data-mp-theme="playful"] .mp-drawer { background: #fef9f3; color: #2d2545; border-left: 3px solid #f0e4d6; box-shadow: -10px 0 0 #f0e4d6, -20px 0 40px rgba(0,0,0,0.08); }
    [data-mp-theme="playful"] .mp-msg { border-radius: 18px; font-weight: 500; }
    [data-mp-theme="playful"] .mp-send { background: #ff7f5c; color: #fff; border-radius: 14px; font-weight: 700; box-shadow: 3px 3px 0 #c75a3c; }
    [data-mp-theme="playful"] .mp-send:hover:not(:disabled) { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #c75a3c; }
    [data-mp-theme="playful"] .mp-input { border-radius: 14px; border-width: 2px; }
    [data-mp-theme="playful"] .mp-modal { border-radius: 22px; border-width: 2px; box-shadow: 8px 8px 0 #f0e4d6; }
    [data-mp-theme="playful"] .mp-modal .btn-primary { background: #ff7f5c; color: #fff; border-radius: 12px; font-weight: 700; }
    [data-mp-theme="playful"] .mp-modal .btn-secondary { background: transparent; color: #8a7a6a; }
  `;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getApiKey() { return localStorage.getItem(STORAGE_KEY); }
  function setApiKey(k) { localStorage.setItem(STORAGE_KEY, k); }

  function getTopicData() {
    const nav = getNavContext();
    if (!nav || !nav.topicId) return null;
    try {
      const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
      const list = state[nav.kind];
      if (!Array.isArray(list)) return null;
      const d = list.find(x => x.id === nav.domainId);
      if (!d) return null;
      const t = d.topics.find(x => x.id === nav.topicId);
      if (!t) return null;
      return {
        kind: nav.kind,
        domainId: nav.domainId,
        domainName: d.name,
        domainEmoji: d.emoji,
        topicId: nav.topicId,
        label: t.label,
        notes: t.notes || '',
        resourceCount: (t.resources || []).length,
        done: !!t.done,
      };
    } catch (e) { return null; }
  }

  function chatKey() {
    const t = getTopicData();
    return CHAT_PREFIX + (t ? 'topic:' + t.topicId : 'global');
  }
  function loadChat() {
    try { return JSON.parse(localStorage.getItem(chatKey())) || []; }
    catch (e) { return []; }
  }
  function saveChat(h) { localStorage.setItem(chatKey(), JSON.stringify(h)); }

  function buildSystem(topic) {
    if (!topic) {
      return `You are a warm, curious learning companion in an app called MyPath, where the user tracks everything they want to learn — across subjects (history, psychology, economics, etc.) and skills (guitar, cooking, gardening, etc.).

Your job is to help them learn. Be concise and direct. Ask what they're curious about. Suggest concrete next steps. Use Socratic questions when useful. Don't lecture — guide.

If they ask for a curriculum or topic breakdown, give them a tight checklist they could paste into their tracker.`;
    }
    return `You are a friendly, patient tutor in an app called MyPath. The user is currently on the page for the topic "${topic.label}" — part of "${topic.domainName}" in their ${topic.kind === 'subject' ? 'Subjects' : 'Skills'} section.

${topic.done ? 'They have marked this topic as learned ✓.' : 'They have not yet marked this topic as learned.'}

Their existing notes on this topic:
"""
${(topic.notes || '').trim() || '(no notes yet)'}
"""

They have gathered ${topic.resourceCount} resource(s) on this topic so far.

Style: concise (typically 2-4 short paragraphs), warm but not saccharine, Socratic when it helps. If they seem stuck, simplify with analogies. If they show mastery, deepen the question. Suggest concrete things they can do, read, watch, or try next — pointing at specific exercises or references when you can.`;
  }

  let isStreaming = false;
  let openDrawerAfterKey = false;

  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = STYLES;
    document.head.appendChild(s);
    document.body.setAttribute('data-mp-theme', theme);
  }

  function injectUI() {
    const w = document.createElement('div');
    w.innerHTML = `
      <button class="mp-fab" id="mp-fab" aria-label="Ask AI tutor" title="Ask AI">🤖</button>
      <div class="mp-drawer-bg" id="mp-bg"></div>
      <aside class="mp-drawer" id="mp-drawer" role="dialog" aria-label="AI tutor">
        <div class="mp-head">
          <div class="ctx" id="mp-ctx"></div>
          <button class="close" id="mp-close" aria-label="Close">×</button>
        </div>
        <div class="mp-msgs" id="mp-msgs"></div>
        <div class="mp-input-area">
          <div class="mp-input-row">
            <textarea class="mp-input" id="mp-input" placeholder="Ask anything..." rows="1"></textarea>
            <button class="mp-send" id="mp-send">Send</button>
          </div>
          <button class="mp-footer-link" id="mp-clear">clear chat · reset API key</button>
        </div>
      </aside>
      <div class="mp-modal-bg" id="mp-key-bg">
        <div class="mp-modal">
          <h3>Add your Claude API key</h3>
          <p>The tutor calls the Anthropic API straight from your browser. Your key stays in localStorage on this device — it never goes anywhere else.</p>
          <input type="password" id="mp-key-input" placeholder="sk-ant-..." autocomplete="off" spellcheck="false" />
          <p class="hint">Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. Usage is billed to your account.</p>
          <div class="actions">
            <button class="btn-secondary" id="mp-key-cancel">Cancel</button>
            <button class="btn-primary" id="mp-key-save">Save key</button>
          </div>
        </div>
      </div>
    `;
    while (w.firstChild) document.body.appendChild(w.firstChild);
  }

  function updateContext() {
    const ctx = document.getElementById('mp-ctx');
    const t = getTopicData();
    if (t) {
      ctx.innerHTML = `<div class="scope">${escapeHtml(t.domainEmoji)} ${escapeHtml(t.label)}</div><div class="sub">tutor mode · ${escapeHtml(t.domainName)}</div>`;
    } else {
      ctx.innerHTML = `<div class="scope">Ask anything</div><div class="sub">your learning companion</div>`;
    }
  }

  function renderMessages() {
    const msgs = document.getElementById('mp-msgs');
    const chat = loadChat();
    msgs.innerHTML = '';
    if (chat.length === 0) {
      const t = getTopicData();
      const empty = document.createElement('div');
      empty.className = 'mp-empty';
      empty.innerHTML = t
        ? `<div class="big">🎓</div>Ask anything about <b>${escapeHtml(t.label)}</b>.<br/>I know your notes so far.`
        : `<div class="big">💬</div>Ask anything about what you want to learn.<br/>Open a topic for a focused tutor.`;
      msgs.appendChild(empty);
      return;
    }
    for (const m of chat) {
      const el = document.createElement('div');
      el.className = 'mp-msg ' + m.role;
      el.textContent = m.content;
      msgs.appendChild(el);
    }
    requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
  }

  function openDrawer() {
    if (!getApiKey()) { openKeyModal(true); return; }
    updateContext();
    renderMessages();
    document.getElementById('mp-bg').classList.add('open');
    document.getElementById('mp-drawer').classList.add('open');
    setTimeout(() => document.getElementById('mp-input').focus(), 260);
  }
  function closeDrawer() {
    document.getElementById('mp-bg').classList.remove('open');
    document.getElementById('mp-drawer').classList.remove('open');
  }
  function openKeyModal(thenOpen) {
    openDrawerAfterKey = !!thenOpen;
    const inp = document.getElementById('mp-key-input');
    inp.value = getApiKey() || '';
    document.getElementById('mp-key-bg').classList.add('open');
    setTimeout(() => inp.focus(), 50);
  }
  function closeKeyModal() {
    document.getElementById('mp-key-bg').classList.remove('open');
  }
  function saveKey() {
    const k = document.getElementById('mp-key-input').value.trim();
    if (!k) return;
    setApiKey(k);
    closeKeyModal();
    if (openDrawerAfterKey) { openDrawerAfterKey = false; openDrawer(); }
  }

  async function send() {
    if (isStreaming) return;
    const input = document.getElementById('mp-input');
    const text = input.value.trim();
    if (!text) return;
    const key = getApiKey();
    if (!key) { openKeyModal(true); return; }

    input.value = '';
    input.style.height = 'auto';

    const chat = loadChat();
    chat.push({ role: 'user', content: text });
    saveChat(chat);
    renderMessages();

    isStreaming = true;
    const sendBtn = document.getElementById('mp-send');
    sendBtn.disabled = true;

    const msgs = document.getElementById('mp-msgs');
    const bubble = document.createElement('div');
    bubble.className = 'mp-msg assistant mp-typing';
    bubble.textContent = '';
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;

    let accumulated = '';
    try {
      const topic = getTopicData();
      const system = [{
        type: 'text',
        text: buildSystem(topic),
        cache_control: { type: 'ephemeral' },
      }];

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          stream: true,
          system,
          messages: chat,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        let msg = `${res.status} ${res.statusText}`;
        try {
          const j = JSON.parse(errText);
          if (j.error && j.error.message) msg = j.error.message;
        } catch (e) {}
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === 'content_block_delta' && evt.delta && evt.delta.type === 'text_delta') {
              accumulated += evt.delta.text;
              bubble.textContent = accumulated;
              msgs.scrollTop = msgs.scrollHeight;
            }
          } catch (e) {}
        }
      }

      bubble.classList.remove('mp-typing');
      if (!accumulated) accumulated = '(no response)';
      chat.push({ role: 'assistant', content: accumulated });
      saveChat(chat);
    } catch (e) {
      bubble.classList.remove('mp-typing');
      bubble.classList.add('err');
      bubble.textContent = '⚠ ' + (e && e.message ? e.message : 'Something went wrong.');
      // pop the failed user turn so retry-history doesn't drift
      const ch = loadChat();
      if (ch.length && ch[ch.length - 1].role === 'user') {
        ch.pop();
        saveChat(ch);
      }
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
    }
  }

  function attach() {
    document.getElementById('mp-fab').addEventListener('click', openDrawer);
    document.getElementById('mp-close').addEventListener('click', closeDrawer);
    document.getElementById('mp-bg').addEventListener('click', closeDrawer);
    document.getElementById('mp-send').addEventListener('click', send);
    const input = document.getElementById('mp-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    input.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px';
    });
    document.getElementById('mp-clear').addEventListener('click', () => {
      if (confirm('Clear this chat and reset your API key?')) {
        localStorage.removeItem(chatKey());
        localStorage.removeItem(STORAGE_KEY);
        closeDrawer();
      }
    });
    document.getElementById('mp-key-save').addEventListener('click', saveKey);
    document.getElementById('mp-key-cancel').addEventListener('click', closeKeyModal);
    document.getElementById('mp-key-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveKey();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('mp-key-bg').classList.contains('open')) closeKeyModal();
        else if (document.getElementById('mp-drawer').classList.contains('open')) closeDrawer();
      }
    });
  }

  window.MyPathAI = {
    init(opts) {
      theme = (opts && opts.theme) || 'paper';
      getNavContext = (opts && opts.getNavContext) || (() => null);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { injectStyles(); injectUI(); attach(); });
      } else {
        injectStyles(); injectUI(); attach();
      }
    },
  };
})();
