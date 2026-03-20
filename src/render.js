function esc(str) {
	return String(str ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function trunc(str, n) {
	str = String(str ?? '');
	return str.length <= n ? str : str.slice(0, n - 1) + '\u2026';
}

function prStatus(pr) {
	if (pr.pull_request?.merged_at) return 'merged';
	if (pr.state === 'open') return 'open';
	return 'closed';
}

function formatStars(n) {
	if (!n || n < 1) return '';
	if (n >= 1000) return `★ ${(n / 1000).toFixed(1)}k`;
	return `★ ${n}`;
}

function renderCard({ user, prs, avatarBase64, theme: t, themeName, page = 1, perPage = 10 }) {
	const merged = prs.filter((pr) => pr.pull_request?.merged_at).length;
	const open = prs.filter((pr) => pr.state === 'open').length;
	const closed = prs.filter((pr) => pr.state === 'closed' && !pr.pull_request?.merged_at).length;

	const totalPages = Math.ceil(prs.length / perPage) || 1;
	const currentPage = Math.min(Math.max(page, 1), totalPages);
	const start = (currentPage - 1) * perPage;
	const display = prs.slice(start, start + perPage);

	// ── Layout ─────────────────────────────────────────────────────────────────
	const W = 840;
	const PAD = 24;

	const TOP_H = 26;       // vim-style statusline
	const HEADER_H = 102;   // avatar + user info block
	const SEP = 8;          // visual gap between sections
	const STATS_H = 72;     // stats boxes + margins
	const BOX_H = 54;       // inner stats box height
	const LIST_HDR_H = 42;  // "CONTRIBUTIONS" label
	const ROW_H = 34;       // each PR row
	const BOT_H = 30;       // bottom statusline

	// Derived Y positions
	const SEP1_Y = TOP_H + HEADER_H + 4;
	const STATS_Y = SEP1_Y + SEP;
	const SEP2_Y = STATS_Y + BOX_H + SEP;
	const LIST_LABEL_Y = SEP2_Y + SEP;
	const ROWS_Y = LIST_LABEL_Y + LIST_HDR_H;
	const PAGINATION_H = totalPages > 1 ? 38 : 0;
	const H = ROWS_Y + display.length * ROW_H + PAGINATION_H + BOT_H;

	// ── Avatar ─────────────────────────────────────────────────────────────────
	const AV_R = 34;
	const AV_X = PAD;
	const AV_Y = TOP_H + 14;
	const AV_CX = AV_X + AV_R;
	const AV_CY = AV_Y + AV_R;

	// ── Stats boxes (3 equal columns) ─────────────────────────────────────────
	const STAT_GAP = 12;
	const BOX_W = Math.floor((W - PAD * 2 - STAT_GAP * 2) / 3);
	const statsData = [
		{ label: 'MERGED', count: merged, color: t.green },
		{ label: 'OPEN', count: open, color: t.blue },
		{ label: 'CLOSED', count: closed, color: t.red },
	];

	// ── PR row layout ─────────────────────────────────────────────────────────
	//  dot  num   title                    repo          badge
	//  32   46    96 ─────────────── 565   575 ── 736   746 ─── 816
	const COL_NUM = PAD + 22;
	const COL_TITLE = PAD + 72;
	const COL_REPO = 575;
	const COL_STARS = 690;
	const COL_BADGE = W - PAD - 70;  // badge rect x
	const BADGE_W = 70;

	// ── Build SVG pieces ──────────────────────────────────────────────────────

	const defs = `
  <defs>
    <clipPath id="av">
      <circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R}"/>
    </clipPath>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

	// Top statusline (rounded top corners via overlapping rects trick)
	const topBar = `
  <rect x="0" y="0" width="${W}" height="${TOP_H}" rx="10" fill="${t.statusBg}"/>
  <rect x="0" y="10" width="${W}" height="${TOP_H - 10}" fill="${t.statusBg}"/>
  <text x="${PAD}" y="17" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="${t.yellow}" font-weight="600"> github-contributions.nvim </text>
  <text x="${W - PAD}" y="17" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="${t.fgDim}" text-anchor="end"> ${prs.length} PRs </text>`;

	// Header: avatar + user info
	const INFO_X = AV_X + AV_R * 2 + 16;
	const header = `
  <image href="${avatarBase64}" x="${AV_X}" y="${AV_Y}" width="${AV_R * 2}" height="${AV_R * 2}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="${AV_CX}" cy="${AV_CY}" r="${AV_R}" fill="none" stroke="${t.yellow}" stroke-width="1.5" opacity="0.8"/>
  <text x="${INFO_X}" y="${AV_Y + 22}" font-family="'JetBrains Mono',monospace" font-size="20" font-weight="700" fill="${t.yellow}">${esc(user.login)}</text>
  <text x="${INFO_X}" y="${AV_Y + 41}" font-family="'JetBrains Mono',monospace" font-size="12.5" fill="${t.fg}">${esc(trunc(user.name || '', 40))}</text>
  <text x="${INFO_X}" y="${AV_Y + 58}" font-family="'JetBrains Mono',monospace" font-size="11" fill="${t.fgDim}">${user.public_repos} repos \u00b7 ${user.followers} followers${user.location ? ' \u00b7 ' + esc(trunc(user.location, 24)) : ''}</text>
  ${user.bio ? `<text x="${INFO_X}" y="${AV_Y + 75}" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="${t.fgDim}">${esc(trunc(user.bio, 64))}</text>` : ''}`;

	// Separators
	const sep1 = `<line x1="${PAD}" y1="${SEP1_Y}" x2="${W - PAD}" y2="${SEP1_Y}" stroke="${t.bg3}" stroke-width="0.8"/>`;
	const sep2 = `<line x1="${PAD}" y1="${SEP2_Y}" x2="${W - PAD}" y2="${SEP2_Y}" stroke="${t.bg3}" stroke-width="0.8"/>`;

	// Stats boxes
	const statsGroup = statsData.map((s, i) => {
		const bx = PAD + i * (BOX_W + STAT_GAP);
		return `
    <rect x="${bx}" y="${STATS_Y}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${t.bg1}" stroke="${s.color}" stroke-width="0.8"/>
    <text x="${bx + 16}" y="${STATS_Y + 32}" font-family="'JetBrains Mono',monospace" font-size="24" font-weight="700" fill="${s.color}">${s.count}</text>
    <text x="${bx + 16}" y="${STATS_Y + 48}" font-family="'JetBrains Mono',monospace" font-size="9.5" fill="${t.fgDim}" letter-spacing="2">${s.label}</text>`;
	}).join('');

	// List header
	const paginationInfo = totalPages > 1
		? `page ${currentPage}/${totalPages} · ${start + 1}–${start + display.length} of ${prs.length}`
		: `${display.length} of ${prs.length}`;
	const listHeader = `
  <text x="${PAD}" y="${LIST_LABEL_Y + 28}" font-family="'JetBrains Mono',monospace" font-size="9.5" fill="${t.fgDim}" letter-spacing="2">\u2500\u2500 CONTRIBUTIONS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 ${paginationInfo}</text>`;

	// PR rows
	const prRows = display.map((pr, i) => {
		const y = ROWS_Y + i * ROW_H;
		const mid = y + ROW_H / 2;
		const status = prStatus(pr);
		const color = status === 'merged' ? t.green : status === 'open' ? t.blue : t.red;
		const label = status.toUpperCase();
		const repo = trunc(pr.repository_url.replace('https://api.github.com/repos/', ''), 16);
		const stars = formatStars(pr.stars);
		const title = trunc(pr.title, 48);
		const rowBg = i % 2 !== 0;

		return `
    ${rowBg ? `<rect x="${PAD - 4}" y="${y}" width="${W - PAD * 2 + 8}" height="${ROW_H}" fill="${t.bg1}" opacity="0.35" rx="2"/>` : ''}
    <circle cx="${PAD + 8}" cy="${mid}" r="4.5" fill="${color}"/>
    <text x="${COL_NUM}" y="${mid + 5}" font-family="'JetBrains Mono',monospace" font-size="11" fill="${t.fgDim}">#${pr.number}</text>
    <a href="${esc(pr.html_url)}" target="_blank">
      <text x="${COL_TITLE}" y="${mid + 5}" font-family="'JetBrains Mono',monospace" font-size="12.5" fill="${t.fg}" text-decoration="underline">${esc(title)}</text>
    </a>
    <text x="${COL_REPO}" y="${mid + 5}" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="${t.fgDim}">${esc(repo)}</text>
    <text x="${COL_STARS}" y="${mid + 5}" font-family="'JetBrains Mono',monospace" font-size="9.5" fill="${t.fgDim}">${stars}</text>
    <rect x="${COL_BADGE}" y="${y + 9}" width="${BADGE_W}" height="17" rx="3" fill="${color}" opacity="0.15" stroke="${color}" stroke-width="0.6"/>
    <text x="${COL_BADGE + BADGE_W / 2}" y="${y + 21}" font-family="'JetBrains Mono',monospace" font-size="9.5" font-weight="600" fill="${color}" text-anchor="middle">${label}</text>`;
	}).join('');

	// Pagination buttons
	const PAG_Y = ROWS_Y + display.length * ROW_H + 8;
	const BTN_W = 82;
	const BTN_H = 22;
	const prevUrl = `/?username=${encodeURIComponent(user.login)}&amp;theme=${encodeURIComponent(themeName)}&amp;per_page=${perPage}&amp;page=${currentPage - 1}`;
	const nextUrl = `/?username=${encodeURIComponent(user.login)}&amp;theme=${encodeURIComponent(themeName)}&amp;per_page=${perPage}&amp;page=${currentPage + 1}`;

	const paginationBar = totalPages > 1 ? `
  ${currentPage > 1
			? `<a href="${prevUrl}"><rect x="${PAD}" y="${PAG_Y}" width="${BTN_W}" height="${BTN_H}" rx="4" fill="${t.bg1}" stroke="${t.blue}" stroke-width="0.8"/><text x="${PAD + BTN_W / 2}" y="${PAG_Y + 15}" font-family="'JetBrains Mono',monospace" font-size="10" fill="${t.blue}" text-anchor="middle" font-weight="600">◄ PREV</text></a>`
			: `<rect x="${PAD}" y="${PAG_Y}" width="${BTN_W}" height="${BTN_H}" rx="4" fill="${t.bg1}" stroke="${t.bg3}" stroke-width="0.5" opacity="0.4"/><text x="${PAD + BTN_W / 2}" y="${PAG_Y + 15}" font-family="'JetBrains Mono',monospace" font-size="10" fill="${t.bg3}" text-anchor="middle">◄ PREV</text>`}
  <text x="${W / 2}" y="${PAG_Y + 15}" font-family="'JetBrains Mono',monospace" font-size="10" fill="${t.fgDim}" text-anchor="middle">${currentPage} / ${totalPages}</text>
  ${currentPage < totalPages
			? `<a href="${nextUrl}"><rect x="${W - PAD - BTN_W}" y="${PAG_Y}" width="${BTN_W}" height="${BTN_H}" rx="4" fill="${t.bg1}" stroke="${t.green}" stroke-width="0.8"/><text x="${W - PAD - BTN_W / 2}" y="${PAG_Y + 15}" font-family="'JetBrains Mono',monospace" font-size="10" fill="${t.green}" text-anchor="middle" font-weight="600">NEXT ►</text></a>`
			: `<rect x="${W - PAD - BTN_W}" y="${PAG_Y}" width="${BTN_W}" height="${BTN_H}" rx="4" fill="${t.bg1}" stroke="${t.bg3}" stroke-width="0.5" opacity="0.4"/><text x="${W - PAD - BTN_W / 2}" y="${PAG_Y + 15}" font-family="'JetBrains Mono',monospace" font-size="10" fill="${t.bg3}" text-anchor="middle">NEXT ►</text>`}` : '';

	// Bottom statusline (rounded bottom corners)
	const BOT_Y = H - BOT_H;
	const botBar = `
  <rect x="0" y="${BOT_Y}" width="${W}" height="${BOT_H}" rx="0" fill="${t.statusBg}"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" rx="10" fill="${t.statusBg}"/>
  <rect x="0" y="${BOT_Y}" width="${W}" height="${BOT_H - 10}" fill="${t.statusBg}"/>
  <text x="${PAD}" y="${BOT_Y + 19}" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="${t.purple}" font-weight="600"> @${esc(user.login)} </text>
  <text x="${W - PAD}" y="${BOT_Y + 19}" font-family="'JetBrains Mono',monospace" font-size="10.5" fill="${t.fgDim}" text-anchor="end"> ${themeName} </text>`;

	return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 ${W} ${H}">
  ${defs}
  <!-- Background -->
  <rect width="${W}" height="${H}" rx="10" fill="${t.bg}" stroke="${t.bg3}" stroke-width="1"/>
  <!-- Top statusline -->
  ${topBar}
  <!-- Header -->
  ${header}
  ${sep1}
  <!-- Stats -->
  ${statsGroup}
  ${sep2}
  <!-- PR list -->
  ${listHeader}
  ${prRows}
  <!-- Pagination -->
  ${paginationBar}
  <!-- Bottom statusline -->
  ${botBar}
</svg>`;
}

export { renderCard };
