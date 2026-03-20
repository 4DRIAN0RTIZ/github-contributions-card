import { useState, useEffect } from 'react';
import { getUserData, getPRs } from './github';
import { renderCard } from './render';
import themes from './themes';

const USAGE = `Usage:  /?username=<github_user>

Optional params:
  theme     ${Object.keys(themes).join(' | ')}
  per_page  items per page (default 10, max 100)
  page      page number (default 1)

Example:
  /?username=4drian0rtiz&theme=TokyoNight&per_page=5`;

const msgStyle = {
	margin: 0,
	padding: '2rem',
	fontFamily: "'JetBrains Mono', monospace",
	background: '#1e1e2e',
	color: '#cdd6f4',
	minHeight: '100vh',
	whiteSpace: 'pre',
};

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

	if (noParams) return <pre style={msgStyle}>{USAGE}</pre>;
	if (loading) return <pre style={msgStyle}>Loading...</pre>;
	if (error) return <pre style={{ ...msgStyle, color: '#f38ba8' }}>{error}</pre>;
	if (svg) return <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />;
	return null;
}
