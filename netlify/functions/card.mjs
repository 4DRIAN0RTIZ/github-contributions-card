import { renderCard } from '../../src/render.js';
import themes from '../../src/themes.js';

function authHeaders() {
	const token = process.env.GITHUB_TOKEN;
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON(url) {
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'github-contributions-card/1.0',
			...authHeaders(),
		},
	});
	if (res.status === 403 || res.status === 429) {
		throw new Error('GitHub API rate limit exceeded. Set GITHUB_TOKEN env var in Netlify.');
	}
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub API ${res.status}: ${text.slice(0, 120)}`);
	}
	return res.json();
}

async function getUserData(username) {
	return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}

async function getPRs(username) {
	const data = await fetchJSON(
		`https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:pr&per_page=100&sort=updated&order=desc`
	);
	const items = data.items || [];

	const prsWithStars = await Promise.all(
		items.map(async (pr) => {
			const repo = await fetchJSON(pr.repository_url);
			return { ...pr, stars: repo.stargazers_count };
		})
	);

	return prsWithStars.filter((pr) => {
		const owner = pr.repository_url.split('/repos/')[1]?.split('/')[0] || '';
		return owner.toLowerCase() !== username.toLowerCase();
	});
}

async function fetchAvatarBase64(url) {
	try {
		const res = await fetch(url);
		if (!res.ok) return url;
		const buffer = await res.arrayBuffer();
		const contentType = res.headers.get('content-type') || 'image/png';
		const base64 = Buffer.from(buffer).toString('base64');
		return `data:${contentType};base64,${base64}`;
	} catch {
		return url;
	}
}

export default async (req) => {
	const url = new URL(req.url);
	const username = url.searchParams.get('username');
	const themeName = url.searchParams.get('theme') || 'Gruvbox';
	const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '10', 10), 100);
	const page = parseInt(url.searchParams.get('page') || '1', 10);

	if (!username) {
		return new Response('Missing ?username= parameter', { status: 400 });
	}

	const theme = themes[themeName] ?? themes['Gruvbox'];
	const resolvedThemeName = themes[themeName] ? themeName : 'Gruvbox';

	try {
		const [user, prs] = await Promise.all([getUserData(username), getPRs(username)]);
		const avatarBase64 = await fetchAvatarBase64(user.avatar_url);

		let svg = renderCard({ user, prs, avatarBase64, theme, themeName: resolvedThemeName, page, perPage });

		// Rewrite pagination links to point to this endpoint instead of the SPA
		svg = svg.replaceAll('/?username=', '/card.svg?username=');

		return new Response(svg, {
			status: 200,
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=1800',
			},
		});
	} catch (err) {
		return new Response(`Error: ${err.message}`, { status: 500 });
	}
};
