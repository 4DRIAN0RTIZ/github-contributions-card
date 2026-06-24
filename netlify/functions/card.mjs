import { renderCard } from '../../src/render.js';
import themes from '../../src/themes.js';
import { getUserData, getPRs } from '../lib/github.mjs';

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
