// Load mock/real data
async function loadData() {
  const res = await fetch('data/creators.json');
  return await res.json();
}
const fmt = n => (n ?? 0).toLocaleString();

// Derive safe stats if fields are missing
function normalizeCreators(raw) {
  return raw.map(c => ({
    creator_id: c.creator_id,
    display_name: c.display_name || '—',
    subs_total: Number(c.subs_total ?? 0),
    avg_views: Number(c.avg_views ?? 0),
    // If your JSON later includes avg_comments, we'll use it; otherwise 0
    avg_comments: Number(c.avg_comments ?? 0),
    destinations: c.destinations || [],
    channel_url: c.channel_url || '#',
    recent_videos: c.recent_videos || []
  }));
}

/* ---------- Home: Excel-style table ---------- */
function renderTableRows(creators) {
  const tbody = document.querySelector('#creators-table tbody');
  if (!tbody) return;
  tbody.innerHTML = creators.map(c => `
    <tr>
      <td class="left"><a href="creator/?id=${encodeURIComponent(c.creator_id)}">${c.display_name}</a></td>
      <td class="right">${fmt(c.subs_total)}</td>
      <td class="right">${fmt(c.avg_views)}</td>
      <td class="right">${fmt(c.avg_comments)}</td>
      <td class="left">${(c.destinations || []).join(', ')}</td>
      <td class="left"><a class="link" href="${c.channel_url}" target="_blank" rel="noopener">Open</a></td>
    </tr>
  `).join('');
}

function makeSortable(creators) {
  const thead = document.querySelector('#creators-table thead');
  let state = { key: 'subs_total', dir: 'desc' };

  function sortData() {
    const { key, dir } = state;
    const sorted = creators.slice().sort((a,b) => {
      const av = (key === 'destinations' || key === 'display_name')
        ? String(a[key]).toLowerCase() : Number(a[key] ?? 0);
      const bv = (key === 'destinations' || key === 'display_name')
        ? String(b[key]).toLowerCase() : Number(b[key] ?? 0);
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    renderTableRows(sorted);
    // update header arrow
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

  sortData(); // initial
  return () => sortData();
}

function wireFilter(creators, rerender) {
  const input = document.getElementById('creator-filter');
  if (!input) return;
  input.addEventListener('input', () => {
    const t = input.value.toLowerCase();
    const filtered = creators.filter(c =>
      c.display_name.toLowerCase().includes(t) ||
      (c.destinations || []).join(',').toLowerCase().includes(t)
    );
    renderTableRows(filtered);
  });
}

/* ---------- Creator directory (cards) ---------- */
function renderCards(creators) {
  const list = document.getElementById('creator-list');
  if (!list) return;
  list.innerHTML = creators.map(c => `
    <div class="card">
      <h4><a href="creator/?id=${encodeURIComponent(c.creator_id)}">${c.display_name}</a></h4>
      <div class="muted">${fmt(c.subs_total)} subs · avg ${fmt(c.avg_views)} views</div>
      <div class="chips">${(c.destinations||[]).slice(0,6).map(d=>`<span class="chip">${d}</span>`).join(' ')}</div>
      <p><a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open Channel</a></p>
    </div>
  `).join('');
}

/* ---------- Creator detail ---------- */
function renderCreatorDetail(c) {
  const box = document.getElementById('creator-detail');
  if (!box) return;
  box.innerHTML = `
    <div class="card">
      <h2>${c.display_name}</h2>
      <div class="muted">${fmt(c.subs_total)} subscribers · avg ${fmt(c.avg_views)} views · avg ${fmt(c.avg_comments)} comments</div>
      <p><a class="btn" href="${c.channel_url}" target="_blank" rel="noopener">Open YouTube Channel</a></p>
      <h3>Destinations</h3>
      <p>${(c.destinations||[]).map(d=>`<span class="chip">${d}</span>`).join(' ')}</p>
      <h3>Recent Videos</h3>
      <ul>${(c.recent_videos||[]).map(v => `
        <li><a href="${v.url}" target="_blank" rel="noopener">${v.title}</a> — ${fmt(v.views)} views (${v.published_at})</li>
      `).join('')}</ul>
    </div>
  `;
}

/* ---------- Router ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadData();
  if (document.getElementById('last-updated')) {
    document.getElementById('last-updated').textContent = data.last_updated || '—';
  }
  const creators = normalizeCreators(data.creators || []);

  const path = location.pathname;
  if (path.includes('/creators/')) {
    renderCards(creators);
    return;
  }
  if (path.includes('/creator/')) {
    const id = new URLSearchParams(location.search).get('id');
    const c = creators.find(x => x.creator_id === id) || creators[0];
    if (c) renderCreatorDetail(c);
    return;
  }
  // Home (table)
  const rerender = makeSortable(creators);
  wireFilter(creators, rerender);
});
