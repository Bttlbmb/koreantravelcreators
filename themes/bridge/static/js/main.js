/* =======================
   Data loading & helpers
   ======================= */
async function loadData() {
  const res = await fetch('data/creators.json');
  return await res.json();
}
const fmt = n => (n ?? 0).toLocaleString();
const isoToYmd = s => (s ? String(s).slice(0, 10) : '—');

function normalizeCreators(raw) {
  return (raw || []).map(c => ({
    creator_id: c.creator_id,
    display_name: c.display_name || '—',
    channel_url: c.channel_url || '#',
    subs_total: Number(c.subs_total ?? 0),
    growth_30d: (c.growth_30d == null ? null : Number(c.growth_30d)), // percent
    avg_views: Number(c.avg_views ?? 0),
    engagement_rate: (c.engagement_rate == null ? null : Number(c.engagement_rate)), // fraction 0..1
    uploads_30d: Number(c.uploads_30d ?? 0),
    last_upload: c.last_upload || null,
    recent_videos: (c.recent_videos || []).map(v => ({
      title: v.title || '—',
      url: v.url || '#',
      video_id: v.video_id || null,
      published_at: v.published_at || null,
      views: Number(v.views ?? 0),
      likes: Number(v.likes ?? 0),
      comments: Number(v.comments ?? 0),
      is_short: !!v.is_short
    }))
  }));
}

/* =======================
   Tooltips (for headers)
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
function renderTableRows(creators) {
  const tbody = document.querySelector('#creators-table tbody');
  if (!tbody) return;
  tbody.innerHTML = creators.map(c => `
    <tr>
      <td class="left"><a href="creator/?id=${encodeURIComponent(c.creator_id)}">${c.display_name}</a></td>
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
function makeSortable(creators, tableSelector = '#creators-table') {
  const table = document.querySelector(tableSelector);
  const thead = table?.querySelector('thead');
  if (!thead) return;
  let state = { key: 'subs_total', dir: 'desc' };
  function toComparable(v, key) {
    if (key === 'display_name' || key === 'last_upload' || key === 'title' || key === 'published_at')
      return String(v ?? '').toLowerCase();
    return Number(v ?? 0);
  }
  function sortData() {
    const { key, dir } = state;
    const dataset = tableSelector === '#creators-table'
      ? creators.slice()
      : creators.slice(); // same function works for videos table (we pass different data)
    const sorted = dataset.sort((a,b) => {
      const av = toComparable(a[key], key);
      const bv = toComparable(b[key], key);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    if (tableSelector === '#creators-table') renderTableRows(sorted);
    else renderVideoRows(sorted);
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
  return { sortData, set: (k, dir) => { state = { key:k, dir:dir||'desc' }; sortData(); } };
}
function wireFilter(creators) {
  const input = document.getElementById('creator-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const t = input.value.toLowerCase();
    const filtered = creators.filter(c => c.display_name.toLowerCase().includes(t));
    renderTableRows(filtered);
  });
}

/* =======================
   Creator detail: layout
   ======================= */
function heroMetric(label, value, sub='') {
  return `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      ${sub ? `<div class="metric-sub">${sub}</div>` : ``}
    </div>
  `;
}

function renderCreatorHero(c) {
  const hero = document.getElementById('creator-hero');
  if (!hero) return;
  const growth = c.growth_30d == null ? '—' :
    `<span class="${c.growth_30d >= 0 ? 'growth-up':'growth-down'}">${c.growth_30d >= 0 ? '▲':'▼'} ${Math.abs(c.growth_30d).toFixed(1)}%</span>`;
  const er = c.engagement_rate == null ? '—' : `${(c.engagement_rate*100).toFixed(1)}%`;
  hero.innerHTML = `
    <div class="hero-head">
      <h2>${c.display_name}</h2>
      <a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open Channel</a>
    </div>
    <div class="hero-grid">
      ${heroMetric('Subscribers', fmt(c.subs_total))}
      ${heroMetric('Growth (30d)', growth)}
      ${heroMetric('Avg views (last 10)', fmt(c.avg_views))}
      ${heroMetric('Engagement rate', er)}
      ${heroMetric('Uploads (30d)', fmt(c.uploads_30d))}
      ${heroMetric('Last upload', isoToYmd(c.last_upload))}
    </div>
  `;
}

/* =======================
   Creator detail: videos
   ======================= */
function renderVideoRows(videos) {
  const tbody = document.querySelector('#videos-table tbody');
  if (!tbody) return;
  tbody.innerHTML = videos.map(v => `
    <tr>
      <td class="left">${v.title}</td>
      <td class="left">${isoToYmd(v.published_at)}</td>
      <td class="right">${fmt(v.views)}</td>
      <td class="right">${v.likes ? fmt(v.likes) : '—'}</td>
      <td class="right">${v.comments ? fmt(v.comments) : '—'}</td>
      <td class="left">${v.is_short ? 'Yes' : 'No'}</td>
      <td class="left"><a class="link" href="${v.url}" target="_blank" rel="noopener">Watch</a></td>
    </tr>
  `).join('');
}

/* =======================
   Router
   ======================= */
document.addEventListener('DOMContentLoaded', async () => {
  setupTooltips();

  const data = await loadData();
  if (document.getElementById('last-updated')) {
    document.getElementById('last-updated').textContent = data.last_updated || '—';
  }
  const creators = normalizeCreators(data.creators || []);

  const path = location.pathname;

  // Home
  if (!path.includes('/creators/') && !path.includes('/creator/')) {
    renderTableRows(creators);
    makeSortable(creators, '#creators-table');
    wireFilter(creators);
    return;
  }

  // Creator detail
  if (path.includes('/creator/')) {
    const id = new URLSearchParams(location.search).get('id');
    const c = creators.find(x => x.creator_id === id) || creators[0];
    if (!c) return;
    renderCreatorHero(c);

    // Sort videos by published desc initially; limit to most recent 20
    const vids = c.recent_videos.slice().sort((a,b) =>
      String(b.published_at).localeCompare(String(a.published_at))
    ).slice(0, 20);
    renderVideoRows(vids);
    makeSortable(vids, '#videos-table'); // enable sortable columns
    return;
  }

  // Creators directory (optional; we show same table as home by default)
  renderTableRows(creators);
  makeSortable(creators, '#creators-table');
  wireFilter(creators);
});
