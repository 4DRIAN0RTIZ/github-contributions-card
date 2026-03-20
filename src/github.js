function authHeaders() {
	const token = import.meta.env.VITE_GITHUB_TOKEN;
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
		throw new Error('GitHub API rate limit exceeded. Set VITE_GITHUB_TOKEN env var.');
	}
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GitHub API ${res.status}: ${text.slice(0, 120)}`);
	}
	return res.json();
}

export async function getUserData(username) {
	return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}

export async function getPRs(username) {
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
