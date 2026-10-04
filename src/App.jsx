import { useState, useEffect } from 'react';
import QueryExplorer from './QueryExplorer';

export default function App() {
	const [params, setParams] = useState(null);

	useEffect(() => {
		const p = new URLSearchParams(window.location.search);
		const username = p.get('username');
		if (!username) { setParams(null); return; }
		setParams(p);
	}, []);

	const baseStyle = {
		margin: 0,
		padding: '2rem',
		fontFamily: "'JetBrains Mono', monospace",
		background: '#1e1e2e',
		color: '#cdd6f4',
		minHeight: '100vh',
	};

	if (!params) return <QueryExplorer />;

	const imgSrc = `/card.svg?${params.toString()}`;
	return (
		<div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<img
				src={imgSrc}
				alt={`${params.get('username')}'s GitHub contributions`}
				style={{ maxWidth: '100%', height: 'auto' }}
				onError={(e) => {
					e.currentTarget.style.display = 'none';
				}}
			/>
		</div>
	);
}
