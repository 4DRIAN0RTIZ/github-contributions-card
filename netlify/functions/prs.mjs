import { getUserData, getPRs, UsernameError, RateLimitError, UpstreamError, AbortError } from '../lib/github.mjs';

const QUERY_HEADERS = {
	'Accept-Query': 'application/json',
};

const VALID_SORT = new Set(['-updated', 'updated', '-stars', 'stars']);

function prStatus(pr) {
	if (pr.pull_request?.merged_at) return 'merged';
	if (pr.state === 'open') return 'open';
	return 'closed';
}

/**
 * @param {string} dateStr YYYY-MM-DD
 * @returns {number|null} UTC timestamp or null if invalid
 */
function parseDate(dateStr) {
	if (!dateStr) return null;
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	const d = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], 23, 59, 59, 999));
	return isNaN(d.getTime()) ? null : d.getTime();
}

function applyFilters(prs, filters = {}) {
	let result = prs;

	if (filters.status) {
		result = result.filter((pr) => prStatus(pr) === filters.status);
	}
	if (filters.stars_min != null) {
		result = result.filter((pr) => (pr.stars ?? 0) >= filters.stars_min);
	}
	if (filters.date_from) {
		const from = new Date(filters.date_from).getTime();
		if (!isNaN(from)) {
			result = result.filter((pr) => new Date(pr.created_at).getTime() >= from);
		}
	}
	if (filters.date_to) {
		const to = parseDate(filters.date_to);
		if (to !== null) {
			result = result.filter((pr) => new Date(pr.created_at).getTime() <= to);
		}
	}

	return result;
}

function applySort(prs, sort = '-updated') {
	const desc = sort.startsWith('-');
	const field = desc ? sort.slice(1) : sort;

	return [...prs].sort((a, b) => {
		let av, bv;
		if (field === 'stars') {
			av = a.stars ?? 0;
			bv = b.stars ?? 0;
		} else {
			av = new Date(a.updated_at).getTime();
			bv = new Date(b.updated_at).getTime();
		}
		return desc ? bv - av : av - bv;
	});
}

function formatPR(pr) {
	return {
		number: pr.number,
		title: pr.title,
		html_url: pr.html_url,
		state: pr.state,
		status: prStatus(pr),
		repository: pr.repository_url.replace('https://api.github.com/repos/', ''),
		stars: pr.stars ?? 0,
		created_at: pr.created_at,
		updated_at: pr.updated_at,
		merged_at: pr.pull_request?.merged_at ?? null,
	};
}

export default async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				...QUERY_HEADERS,
				Allow: 'GET, OPTIONS',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	if (req.method !== 'GET') {
		return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				Allow: 'GET, OPTIONS',
			},
		});
	}

	const u = new URL(req.url);
	const username = u.searchParams.get('username');
	const status = u.searchParams.get('status') || '';
	const starsMin = u.searchParams.get('stars_min');
	const dateFrom = u.searchParams.get('date_from') || '';
	const dateTo = u.searchParams.get('date_to') || '';
	const sort = VALID_SORT.has(u.searchParams.get('sort')) ? u.searchParams.get('sort') : '-updated';
	const limit = Math.min(100, Math.max(1, Number(u.searchParams.get('limit')) || 20));
	const page = Math.max(1, Number(u.searchParams.get('page')) || 1);

	if (!username) {
		return new Response(
			JSON.stringify({ error: 'Bad Request', message: 'username query parameter is required' }),
			{ status: 400, headers: { 'Content-Type': 'application/json', ...QUERY_HEADERS } }
		);
	}

	const filters = {};
	if (status) filters.status = status;
	if (starsMin !== null && starsMin !== '') filters.stars_min = Number(starsMin);
	if (dateFrom) filters.date_from = dateFrom;
	if (dateTo) filters.date_to = dateTo;

	try {
		const [, prs] = await Promise.all([getUserData(username), getPRs(username)]);

		const filtered = applyFilters(prs, filters);
		const sorted = applySort(filtered, sort);

		const total = sorted.length;
		const pages = Math.ceil(total / limit) || 1;
		const currentPage = Math.min(page, pages);
		const start = (currentPage - 1) * limit;
		const data = sorted.slice(start, start + limit).map(formatPR);

		return new Response(
			JSON.stringify({
				data,
				meta: { total, page: currentPage, limit, pages },
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=1800',
					...QUERY_HEADERS,
				},
			}
		);
	} catch (err) {
		let status = 500;
		let error = 'Internal Server Error';
		let message = 'Could not load contributions';

		if (err instanceof UsernameError) {
			status = 400;
			error = 'Bad Request';
			message = 'Invalid username';
		} else if (err.name === 'UpstreamError' && err.message.includes('404')) {
			status = 404;
			error = 'Not Found';
			message = 'User not found';
		} else if (err instanceof RateLimitError) {
			status = 429;
			error = 'Too Many Requests';
			message = 'GitHub rate limit reached';
		} else if (err instanceof AbortError) {
			status = 504;
			error = 'Gateway Timeout';
			message = 'Request timed out';
		} else if (err instanceof UpstreamError) {
			status = 500;
			error = 'Internal Server Error';
			message = 'GitHub API error';
		}

		return new Response(JSON.stringify({ error, message }), {
			status,
			headers: { 'Content-Type': 'application/json', ...QUERY_HEADERS },
		});
	}
};
