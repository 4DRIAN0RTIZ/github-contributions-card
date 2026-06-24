import { getUserData, getPRs } from '../lib/github.mjs';

const QUERY_HEADERS = {
	'Accept-Query': 'application/json',
};

function prStatus(pr) {
	if (pr.pull_request?.merged_at) return 'merged';
	if (pr.state === 'open') return 'open';
	return 'closed';
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
		result = result.filter((pr) => new Date(pr.created_at).getTime() >= from);
	}
	if (filters.date_to) {
		const to = new Date(filters.date_to).getTime();
		result = result.filter((pr) => new Date(pr.created_at).getTime() <= to);
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
				'Allow': 'OPTIONS, QUERY',
				'Access-Control-Allow-Methods': 'OPTIONS, QUERY',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	}

	if (req.method !== 'QUERY') {
		return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				'Allow': 'OPTIONS, QUERY',
			},
		});
	}

	const contentType = req.headers.get('content-type') ?? '';
	if (!contentType.startsWith('application/json')) {
		return new Response(
			JSON.stringify({
				error: 'Unsupported Media Type',
				message: 'Este endpoint solo acepta Content-Type: application/json',
			}),
			{
				status: 415,
				headers: { 'Content-Type': 'application/json', ...QUERY_HEADERS },
			}
		);
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Bad Request', message: 'Body JSON inválido' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json', ...QUERY_HEADERS },
		});
	}

	const { username, filters, sort = '-updated', limit = 20, page = 1 } = body;

	if (!username || typeof username !== 'string') {
		return new Response(
			JSON.stringify({ error: 'Bad Request', message: 'El campo "username" es requerido' }),
			{ status: 400, headers: { 'Content-Type': 'application/json', ...QUERY_HEADERS } }
		);
	}

	const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
	const safePage = Math.max(1, Number(page) || 1);

	try {
		const [, prs] = await Promise.all([getUserData(username), getPRs(username)]);

		const filtered = applyFilters(prs, filters);
		const sorted = applySort(filtered, sort);

		const total = sorted.length;
		const pages = Math.ceil(total / safeLimit) || 1;
		const currentPage = Math.min(safePage, pages);
		const start = (currentPage - 1) * safeLimit;
		const data = sorted.slice(start, start + safeLimit).map(formatPR);

		return new Response(
			JSON.stringify({
				data,
				meta: { total, page: currentPage, limit: safeLimit, pages },
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
		return new Response(JSON.stringify({ error: 'Internal Server Error', message: err.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json', ...QUERY_HEADERS },
		});
	}
};
