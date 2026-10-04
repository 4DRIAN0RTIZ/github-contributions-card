import { renderCard, renderErrorCard } from '../../src/render.js';
import themes from '../../src/themes.js';
import { getUserData, getPRs, UsernameError } from '../lib/github.mjs';

const AVATAR_HOST = 'avatars.githubusercontent.com';
const MAX_AVATAR_BYTES = 512 * 1024; // 512 KiB

// Minimal gray-circle placeholder as a data URI
const PLACEHOLDER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2OCA2OCIgZmlsbD0iIzMzMyI+PGNpcmNsZSBjeD0iMzQiIGN5PSIzNCIgcj0iMzQiLz48L3N2Zz4=';

async function fetchAvatarBase64(url) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		return PLACEHOLDER_AVATAR;
	}

	// Only allow the GitHub avatars CDN host
	if (parsed.hostname !== AVATAR_HOST || parsed.protocol !== 'https:') {
		return PLACEHOLDER_AVATAR;
	}

	try {
		const res = await fetch(url, {
			redirect: 'error',
			signal: AbortSignal.timeout(5000),
		});

		if (!res.ok) return PLACEHOLDER_AVATAR;

		// Read at most MAX_AVATAR_BYTES
		const reader = res.body.getReader();
		let buffer = new Uint8Array(MAX_AVATAR_BYTES);
		let offset = 0;
		let overLimit = false;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (offset + value.length > MAX_AVATAR_BYTES) {
				buffer.set(value.slice(0, MAX_AVATAR_BYTES - offset), offset);
				offset = MAX_AVATAR_BYTES;
				reader.cancel();
				overLimit = true;
				break;
			}
			buffer.set(value, offset);
			offset += value.length;
		}

		if (offset === 0) return PLACEHOLDER_AVATAR;

		// Detect PNG or JPEG by magic bytes
		const isPng = offset >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
		const isJpeg = offset >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
		const mimeType = isPng ? 'image/png' : isJpeg ? 'image/jpeg' : 'image/png';

		const base64 = Buffer.from(buffer.slice(0, offset)).toString('base64');
		return `data:${mimeType};base64,${base64}`;
	} catch {
		return PLACEHOLDER_AVATAR;
	}
}

function svgResponse(svg, status = 200, cache = 'public, max-age=1800') {
	return new Response(svg, {
		status,
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': cache,
		},
	});
}

export default async (req) => {
	const url = new URL(req.url);
	const rawUsername = url.searchParams.get('username');
	const themeName = url.searchParams.get('theme') || 'Gruvbox';
	const rawPerPage = url.searchParams.get('per_page');
	const rawPage = url.searchParams.get('page');
	const intPerPage = parseInt(rawPerPage ?? '10', 10);
	const intPage = parseInt(rawPage ?? '1', 10);
	const perPage = isNaN(intPerPage) ? 10 : Math.min(100, Math.max(1, intPerPage));
	const page = isNaN(intPage) ? 1 : Math.max(1, intPage);

	const theme = themes[themeName] ?? themes['Gruvbox'];
	const resolvedThemeName = themes[themeName] ? themeName : 'Gruvbox';

	// Missing username → 400, always SVG
	if (!rawUsername) {
		return svgResponse(
			renderErrorCard({ message: 'Missing username', theme, themeName: resolvedThemeName }),
			400,
			'no-store'
		);
	}

	try {
		const [user, prs] = await Promise.all([
			getUserData(rawUsername),
			getPRs(rawUsername),
		]);
		const avatarBase64 = await fetchAvatarBase64(user.avatar_url);

		let svg = renderCard({
			user,
			prs,
			avatarBase64,
			theme,
			themeName: resolvedThemeName,
			page,
			perPage,
			totalCount: prs.totalCount,
		});

		// Rewrite pagination links to point to this endpoint instead of the SPA
		svg = svg.replaceAll('/?username=', '/card.svg?username=');

		return svgResponse(svg);
	} catch (err) {
		// Classify error and render the appropriate error card
		if (err instanceof UsernameError) {
			// Should not reach here — already checked above — but guard anyway
			return svgResponse(
				renderErrorCard({ message: 'Missing username', theme, themeName: resolvedThemeName }),
				400,
				'no-store'
			);
		}

		// Upstream HTTP errors from getUserData (e.g. 404 for unknown user)
		if (err.name === 'UpstreamError' && err.message.startsWith('GitHub API 404')) {
			return svgResponse(
				renderErrorCard({ message: 'User not found', theme, themeName: resolvedThemeName }),
				404,
				'no-store'
			);
		}

		// Rate limit or timeout — still return 200 so embeds keep rendering
		if (err.name === 'RateLimitError' || err.name === 'AbortError') {
			const msg = err.name === 'RateLimitError' ? 'GitHub rate limit reached' : 'Request timed out';
			return svgResponse(
				renderErrorCard({ message: msg, theme, themeName: resolvedThemeName }),
				200,
				'no-store'
			);
		}

		// Generic upstream error (403 non-rate-limit, 5xx from GitHub, etc.)
		return svgResponse(
			renderErrorCard({ message: 'Could not load contributions', theme, themeName: resolvedThemeName }),
			200,
			'no-store'
		);
	}
};
