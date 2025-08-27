/* =======================
   Data loading & helpers
   ======================= */
async function loadData() {
  // Relative path works under project pages with <base href="{{ SITEURL }}/">
  const res = await fetch('data/creators.json');
  return await res.json();
}
const fmt = n => (n ?? 0).toLocaleString();
const isoToYmd = s => (s ? String(s).slice(0, 10) : '—');

/* name display preference (optional toggle ready) */
const NAME_PREF_KEY = 'namePref'; // 'native-first' | 'roman-first'
function getNamePref(){ return localStorage.getItem(NAME_PREF_KEY) || 'native-first'; }
function setNamePref(v){ localStorage.setItem(NAME_PREF_KEY, v); }

/* choose romanized/english label */
function getRomanLabel(c) {
  return c.name_english || c.name_romanized || null;
}

/* Normalize incoming JSON so UI code is robust */
function normalizeCreators(raw) {
  return (raw || []).map(c => ({
    creator_id: c.creator_id,
    display_name: c.display_name || '—',
    name_romanized: c.name_romanized || null,
    name_english: c.name_english || null,
    channel_url: c.channel_url || '#',

    /* home metrics */
    subs_total: Number(c.subs_total ?? 0),
    growth_30d: (c.growth_30d == null ? null : Number(c.growth_30d)), // percent
    avg_views: Number(c.avg_views ?? 0),
    engagement_rate: (c.engagement_rate == null ? null : Number(c.engagement_rate)), // 0..1
    uploads_30d: Number(c.uploads_30d ?? 0),
    last_upload: c.last_upload || null,

    /* creator page metrics (new) */
    channel_created: c.channel_created || null, // ISO date
    total_uploads: (c.total_uploads == null ? null : Number(c.total_uploads)),
    total_views: (c.total_views == null ? null : Number(c.total_views)),
    views_30d: (c.views_30d == null ? null : Number(c.views_30d)),
    views_90d: (c.views_90d == null ? null : Number(c.views_90d)),
    views_165d: (c.views_165d == null ? null : Number(c.views_165d)), // per request
    avg_views_30d: (c.avg_views_30d == null ? null : Number(c.avg_views_30d)), // avg views after 30d
    shorts_ratio_overall: (c.shorts_ratio_overall == null ? null : Number(c.shorts_ratio_overall)), // 0..1

    /* top-5 and recent videos */
    top5_alltime: (c.top5_alltime || []).map(v => ({
      title: v.title || '—',
      url: v.url || '#',
      published_at: v.published_at || null,
      views: Number(v.views ?? 0),
      likes: Number(v.likes ?? 0),
      comments: Number(v.comments ?? 0),
      is_short: !!v.is_short
    })),
    recent_videos: (c.recent_videos || []).map(v => ({
      title: v.title || '—',
      url: v.url || '#',
      published_at: v.published_at || null,
      views: Number(v.views ?? 0),
      likes: Number(v.likes ?? 0),
      comments: Number(v.comments ?? 0),
      is_short: !!v.is_short
    }))
  }));
}

/* =======================
   Tooltips (for ℹ️ icons) — kept for home page headers
   ======================= */
function setupTooltips(scope = document) {
  scope.querySelectorAll('.info').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.tooltip').forEach(t => t.remove());
      const tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.textContent = el.dataset.info || '';
      el.appendChild(tip);
    });
  });
  document.body.addEventListener('click', () => {
    document.querySelectorAll('.tooltip').forEach(t => t.remove());
  });
}

/* =======================
   Home: Excel-style table
   ======================= */
function growthCell(c) {
  if (c.growth_30d == null) return '—';
  const v = Number(c.growth_30d);
  const cls = v >= 0 ? 'growth-up' : 'growth-down';
  const arrow = v >= 0 ? '▲' : '▼';
  return `<span class="${cls}">${arrow} ${Math.abs(v).toFixed(1)}%</span>`;
}
function rateCell(c) {
  if (c.engagement_rate == null) return '—';
  return `${(c.engagement_rate * 100).toFixed(1)}%`;
}

function renderHomeRows(creators) {
  const tbody = document.querySelector('#creators-table tbody');
  if (!tbody) return;
  tbody.innerHTML = creators.map(c => `
    <tr>
      <td class="left namecell">
        <a href="creator/?id=${encodeURIComponent(c.creator_id)}" class="name-native">${c.display_name}</a>
        ${getRomanLabel(c) ? `<div class="name-roman">${getRomanLabel(c)}</div>` : ``}
      </td>
      <td class="right">${fmt(c.subs_total)}</td>
      <td class="right">${growthCell(c)}</td>
      <td class="right">${fmt(c.avg_views)}</td>
      <td class="right">${rateCell(c)}</td>
      <td class="right">${fmt(c.uploads_30d)}</td>
      <td class="left">${isoToYmd(c.last_upload)}</td>
      <td class="left"><a class="link" href="${c.channel_url}" target="_blank" rel="noopener">Open</a></td>
    </tr>
  `).join('');
}

function makeSortable(dataArray, tableSelector, defaultKey = 'subs_total', defaultDir = 'desc', renderer) {
  const table = document.querySelector(tableSelector);
  const thead = table?.querySelector('thead');
  if (!thead) return;
  let state = { key: defaultKey, dir: defaultDir };

  function toComparable(v, key) {
    if (['display_name','last_upload','title','published_at'].includes(key)) return String(v ?? '').toLowerCase();
    return Number(v ?? 0);
  }

  function sortData() {
    const { key, dir } = state;
    const sorted = dataArray.slice().sort((a,b) => {
      const av = toComparable(a[key], key);
      const bv = toComparable(b[key], key);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    renderer(sorted);
    thead.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
    const active = thead.querySelector(`th[data-key="${key}"]`);
    if (active) active.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
  }

  thead.addEventListener('click', e => {
    const th = e.target.closest('th[data-key]');
    if (!th) return;
    const k = th.getAttribute('data-key');
    state.dir = (state.key === k && state.dir === 'asc') ? 'desc' : 'asc';
    state.key = k;
    sortData();
  });

  sortData();
}

function wireHomeFilter(creators) {
  const input = document.getElementById('creator-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const t = input.value.toLowerCase();
    const filtered = creators.filter(c => {
      const roman = (getRomanLabel(c) || '').toLowerCase();
      return c.display_name.toLowerCase().includes(t) || roman.includes(t);
    });
    renderHomeRows(filtered);
  });
}

/* =======================
   Creator page
   ======================= */
function renderCreatorHeader(c) {
  const hero = document.getElementById('creator-hero');
  if (!hero) return;
  hero.innerHTML = `
    <div class="hero-head">
      <div>
        <h2 class="name-native">${c.display_name}</h2>
        ${getRomanLabel(c) ? `<div class="name-roman">${getRomanLabel(c)}</div>` : ``}
      </div>
      <a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open Channel</a>
    </div>
  `;
}

function metric(label, value, extraClass='') {
  return `
    <div class="metric ${extraClass}">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value ?? '—'}</div>
    </div>
  `;
}

/* two rows of four tiles (with one double-wide) */
function renderCreatorMetrics(c) {
  const grid = document.getElementById('metrics-grid');
  if (!grid) return;

  const growth = c.growth_30d == null ? '—'
    : `<span class="${c.growth_30d>=0?'growth-up':'growth-down'}">${c.growth_30d>=0?'▲':'▼'} ${Math.abs(c.growth_30d).toFixed(1)}%</span>`;
  const er = c.engagement_rate == null ? '—' : `${(c.engagement_rate*100).toFixed(1)}%`;
  const viewsCombo = [c.views_30d, c.views_90d, c.views_165d].map(v => v==null ? '—' : fmt(v)).join(' / ');
  const shortsPct = c.shorts_ratio_overall == null ? '—' : `${Math.round(c.shorts_ratio_overall*100)}%`;

  grid.innerHTML = [
    /* Row 1 */
    metric('Subscribers', fmt(c.subs_total)),
    metric('Subscribers Growth (30d)', growth),
    metric('Total views', c.total_views==null ? '—' : fmt(c.total_views)),
    metric('Total views (30/90/165d)', viewsCombo, 'metric--wide'),
    /* Row 2 */
    metric('Average views after 30d', c.avg_views_30d==null ? '—' : fmt(c.avg_views_30d)),
    metric('Engagement rate', er),
    metric('Share shorts among content', shortsPct),
    metric('Total uploads', c.total_uploads==null ? '—' : fmt(c.total_uploads))
  ].join('');
}

function renderVideoRows(videos, tbodySel) {
  const tbody = document.querySelector(tbodySel);
  if (!tbody) return;
  if (!videos || videos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="left muted">No videos found.</td></tr>`;
    return;
  }
  tbody.innerHTML = videos.map(v => `
    <tr>
      <td class="left col-title">${v.title}</td>
      <td class="left">${isoToYmd(v.published_at)}</td>
      <td class="right col-narrow">${fmt(v.views)}</td>
      <td class="right col-narrow">${v.likes ? fmt(v.likes) : '—'}</td>
      <td class="right col-narrow">${v.comments ? fmt(v.comments) : '—'}</td>
      <td class="left">${v.is_short ? 'Yes' : 'No'}</td>
      <td class="left"><a class="link" href="${v.url}" target="_blank" rel="noopener">Watch</a></td>
    </tr>
  `).join('');
}

/* =======================
   Router
   ======================= */
document.addEventListener('DOMContentLoaded', async () => {
  document.body.classList.toggle('name-roman-first', getNamePref() === 'roman-first');
  setupTooltips();

  const data = await loadData();
  if (document.getElementById('last-updated')) {
    document.getElementById('last-updated').textContent = data.last_updated || '—';
  }
  const creators = normalizeCreators(data.creators || []);
  const path = location.pathname;

  // Creator detail page
  if (path.includes('/creator/')) {
    const id = new URLSearchParams(location.search).get('id');
    const c = creators.find(x => x.creator_id === id) || creators[0];
    if (!c) return;

    renderCreatorHeader(c);
    renderCreatorMetrics(c);

    /* Recent videos (newest first), non-sortable table */
    const vids = (c.recent_videos || [])
      .slice()
      .sort((a,b) => String(b.published_at).localeCompare(String(a.published_at)))
      .slice(0, 20);
    renderVideoRows(vids, '#videos-table tbody');

    /* Top-5 videos all-time (non-sortable, same columns) */
    const top5 = (c.top5_alltime || []).slice(0, 5);
    renderVideoRows(top5, '#top5-alltime');

    return;
  }

  // Home (table) — sortable
  if (!path.includes('/creators/')) {
    renderHomeRows(creators);
    makeSortable(creators, '#creators-table', 'subs_total', 'desc', rows => renderHomeRows(rows));
    wireHomeFilter(creators);
    return;
  }

  // Creators directory (fallback = same table)
  renderHomeRows(creators);
  makeSortable(creators, '#creators-table', 'subs_total', 'desc', rows => renderHomeRows(rows));
  wireHomeFilter(creators);
});
