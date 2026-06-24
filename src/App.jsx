import { useState, useEffect } from 'react';
import { getUserData, getPRs } from './github';
import { renderCard } from './render';
import themes from './themes';
import QueryExplorer from './QueryExplorer';

export default function App() {
	const [svg, setSvg] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [noParams, setNoParams] = useState(false);

	useEffect(() => {
		const p = new URLSearchParams(window.location.search);
		const username = p.get('username');
		if (!username) { setNoParams(true); return; }

		const themeName = p.get('theme') || 'Gruvbox';
		const perPage = Math.min(100, Math.max(1, Number(p.get('per_page')) || 10));
		const page = Math.max(1, Number(p.get('page')) || 1);
		const theme = themes[themeName] || themes.Gruvbox;

		setLoading(true);
		Promise.all([getUserData(username), getPRs(username)])
			.then(([user, prs]) => {
				setSvg(renderCard({ user, prs, avatarBase64: user.avatar_url, theme, themeName, page, perPage }));
			})
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	const base = {
		margin: 0,
		padding: '2rem',
		fontFamily: "'JetBrains Mono', monospace",
		background: '#1e1e2e',
		color: '#cdd6f4',
		minHeight: '100vh',
		whiteSpace: 'pre',
	};

	if (noParams) return <QueryExplorer />;
	if (loading) return <pre style={base}>Loading...</pre>;
	if (error) return <pre style={{ ...base, color: '#f38ba8' }}>{error}</pre>;
	if (svg) return <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />;
	return null;
}
