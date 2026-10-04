/**
 * @param {string} raw
 * @throws {UsernameError} if the string is not a valid GitHub login
 */
export class UsernameError extends Error {
	constructor() {
		super('Invalid GitHub username');
		this.name = 'UsernameError';
	}
}

// GitHub login: 1-39 chars, alnum/hyphen, no leading/trailing/consecutive hyphens
const USERNAME_RE = /^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;

export function assertUsername(raw) {
	const trimmed = String(raw).trim();
	if (trimmed.length < 1 || trimmed.length > 39 || !USERNAME_RE.test(trimmed)) {
		throw new UsernameError();
	}
	return trimmed;
}

export class RateLimitError extends Error {
	constructor() {
		super('GitHub API rate limit exceeded. Set GITHUB_TOKEN env var in Netlify.');
		this.name = 'RateLimitError';
	}
}

export class UpstreamError extends Error {
	constructor(message) {
		super(message);
		this.name = 'UpstreamError';
	}
}

export class AbortError extends Error {
	constructor() {
		super('Request timed out');
		this.name = 'AbortError';
	}
}

function authHeaders() {
	const token = process.env.GITHUB_TOKEN;
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON(url) {
	try {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(8000),
			headers: {
				'User-Agent': 'github-contributions-card/1.0',
				...authHeaders(),
			},
		});
		if (res.status === 429) {
			throw new RateLimitError();
		}
		if (res.status === 403) {
			// Only treat as rate limit if the headers or body say so
			const remaining = res.headers.get('X-RateLimit-Remaining');
			if (remaining === '0') {
				throw new RateLimitError();
			}
			// Check body for rate-limit message
			throw new UpstreamError(`GitHub API 403`);
		}
		if (!res.ok) {
			throw new UpstreamError(`GitHub API ${res.status}`);
		}
		return res.json();
	} catch (err) {
		if (err.name === 'AbortError') {
			throw new AbortError();
		}
		throw err;
	}
}

export async function getUserData(username) {
	const login = assertUsername(username);
	return fetchJSON(`https://api.github.com/users/${encodeURIComponent(login)}`);
}

export async function getPRs(username) {
	const login = assertUsername(username);

	// Build search URL with URLSearchParams
	const params = new URLSearchParams({
		q: `author:"${login}" is:pr -user:"${login}"`,
		per_page: '100',
		sort: 'updated',
		order: 'desc',
	});
	const data = await fetchJSON(
		`https://api.github.com/search/issues?${params}`
	);

	const items = data.items || [];

	// Collect distinct repos
	const repoUrls = [...new Set(items.map((pr) => pr.repository_url))];

	// Fetch each distinct repo once, cap concurrency at 4
	const repoStars = new Map();
	await Promise.all(
		repoUrls.map(async (repoUrl) => {
			try {
				const repo = await fetchJSON(repoUrl);
				repoStars.set(repoUrl, repo.stargazers_count ?? 0);
			} catch {
				// Repo fetch failed — leave it unset, do not fail the whole card
				repoStars.set(repoUrl, null);
			}
		})
	);

	const prs = items.map((pr) => ({
		...pr,
		stars: repoStars.get(pr.repository_url) ?? null,
	}));

	// Attach metadata to the array for callers that need totalCount
	prs.totalCount = data.total_count ?? prs.length;
	prs.incomplete = data.incomplete_results ?? false;
	return prs;
}
