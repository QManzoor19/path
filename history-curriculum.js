/* MyPath — World History curriculum.
   Replaces the topics inside the existing "History" subject domain with the
   full 52-topic curriculum pulled from historylearn. Ordered chronologically.
   Preserves any existing comfort/notes/resources from old topics that match
   by label, and rolls back the era-split that this script previously created. */
(function () {
  'use strict';

  // 52 topics grouped into 7 chronological eras.
  const CURRICULUM_BY_ERA = [
    { era: 'I · The Ancient World', timespan: 'Prehistory – 500 BCE', topics: [
      'Human Origins & Prehistory',
      'Cradles of Civilisation',
      'Ancient Egypt',
      'Ancient Nubia & Kush',
      'The Bronze Age Collapse',
      'The Persian Empires',
      'Ancient Greece',
      'Ancient India & China',
      'Pre-Roman Europe (Celts & Germans)',
    ]},
    { era: 'II · The Classical Age', timespan: 'c. 500 BCE – 500 CE', topics: [
      'The Roman Republic & Empire',
      'Classical China (Qin & Han)',
      'Classical India (Maurya & Gupta)',
      'Rise of World Religions',
    ]},
    { era: 'III · The Medieval World', timespan: 'c. 500 – 1500 CE', topics: [
      'Medieval Europe',
      'The Rise of Islam',
      'The Byzantine Empire',
      'The Vikings & the Norse World',
      'Medieval Japan & Korea',
      'Southeast Asian Kingdoms (Angkor, Srivijaya, Majapahit)',
      'The Mongol Empire',
      'Central Asia — Timurids & Turkic Peoples',
      'African Kingdoms (Mali, Songhai, Zimbabwe)',
      'Polynesian Voyaging & Pacific Peoples',
    ]},
    { era: 'IV · Early Modern Era', timespan: 'c. 1500 – 1800', topics: [
      'The Renaissance',
      'Pre-Columbian Americas (Maya, Aztec, Inca)',
      'Age of Exploration & the Columbian Exchange',
      'The Ottoman Empire',
      'The Mughal Empire',
      'The Reformation',
      'The Enlightenment',
      'Age of Revolutions (American, French, Haitian)',
    ]},
    { era: 'V · The Long 19th Century', timespan: '1789 – 1914', topics: [
      'The Industrial Revolution',
      'Imperialism & Colonialism',
      'Ireland — Famine & Nationalism',
      'Abolition & Reform',
      'Meiji Japan & Qing China',
    ]},
    { era: 'VI · The World at War', timespan: '1914 – 1945', topics: [
      'World War I',
      'The Russian Revolution',
      'The Interwar Period',
      'The Spanish Civil War',
      'World War II',
      'Genocides of the 20th Century',
    ]},
    { era: 'VII · The Contemporary World', timespan: '1945 – present', topics: [
      'The Cold War',
      'The Space Race & Exploration',
      'Decolonisation',
      'The Middle East Since 1945',
      'South Asia Since Partition',
      'Modern Latin America',
      'Civil Rights Movements',
      'The Yugoslav Wars',
      'Globalisation',
      'The Digital Age',
    ]},
  ];

  // Flat list with era + timespan baked into each topic, in display order.
  const CURRICULUM = [];
  for (const era of CURRICULUM_BY_ERA) {
    for (const label of era.topics) {
      CURRICULUM.push({ label, era: era.era, timespan: era.timespan });
    }
  }

  // Era domain IDs created by an earlier version of this script — fold their
  // progress back into the consolidated History domain, then remove them.
  const LEGACY_ERA_IDS = [
    's_hist_ancient',
    's_hist_classical',
    's_hist_medieval',
    's_hist_early_modern',
    's_hist_19c',
    's_hist_wars',
    's_hist_contemp',
  ];

  function hasProgress(t) {
    if (!t) return false;
    if ((t.comfort || 0) > 0) return true;
    if (t.notes && String(t.notes).trim().length > 0) return true;
    if (Array.isArray(t.resources) && t.resources.length > 0) return true;
    return false;
  }

  function apply(state) {
    if (!state || !Array.isArray(state.subject)) return;

    // Collect any progress from the legacy era domains and from any existing
    // History topics whose label is replaced by the new curriculum.
    const progressByLabel = new Map();
    for (const d of state.subject) {
      if (!d || !Array.isArray(d.topics)) continue;
      const isLegacyEra = LEGACY_ERA_IDS.includes(d.id);
      const isHistory = d.id === 's_history';
      if (!isLegacyEra && !isHistory) continue;
      for (const t of d.topics) {
        if (hasProgress(t)) progressByLabel.set(t.label, t);
      }
    }

    // Remove legacy era domains entirely.
    state.subject = state.subject.filter(d => !LEGACY_ERA_IDS.includes(d.id));

    // Find (or create) the History domain.
    let hist = state.subject.find(d => d.id === 's_history');
    if (!hist) {
      hist = { id: 's_history', emoji: '🏛️', name: 'History', topics: [] };
      // Insert at the front of subjects so chronology feels intentional.
      state.subject.unshift(hist);
    }

    // Replace its topic list with the curriculum, preserving any matching
    // progress from before. Each topic carries `era` + `timespan` for grouped
    // rendering in the topic list.
    hist.topics = CURRICULUM.map((entry, i) => {
      const prior = progressByLabel.get(entry.label);
      return {
        id: 's_history_t' + i,
        label: entry.label,
        era: entry.era,
        timespan: entry.timespan,
        done: prior ? !!prior.done : false,
        comfort: prior ? (prior.comfort || 0) : 0,
        notes: prior ? (prior.notes || '') : '',
        resources: prior && Array.isArray(prior.resources) ? prior.resources : [],
      };
    });
  }

  // Compute per-era stats from a topic list. Returns Map<eraName, {...}>.
  function eraStats(topics) {
    const stats = new Map();
    let order = 0;
    if (!Array.isArray(topics)) return stats;
    for (const t of topics) {
      if (!t.era) continue;
      if (!stats.has(t.era)) {
        stats.set(t.era, {
          era: t.era,
          timespan: t.timespan || '',
          total: 0,
          mastered: 0,
          sum: 0,
          index: ++order,
        });
      }
      const s = stats.get(t.era);
      s.total++;
      s.sum += (t.comfort || 0);
      if ((t.comfort || 0) >= 10) s.mastered++;
    }
    for (const s of stats.values()) {
      s.avg = s.total ? s.sum / s.total : 0;
      s.pct = Math.round(s.avg * 10);
    }
    return stats;
  }

  // Strip the "I · " / "II · " prefix from an era name so renderers can show
  // the numeral separately. Returns { num, name } — num may be empty.
  function splitEra(eraName) {
    if (!eraName) return { num: '', name: '' };
    const m = eraName.match(/^([IVX]+)\s*·\s*(.+)$/);
    if (m) return { num: m[1], name: m[2] };
    return { num: '', name: eraName };
  }

  window.MyPathHistory = { apply, CURRICULUM, CURRICULUM_BY_ERA, eraStats, splitEra };
})();
