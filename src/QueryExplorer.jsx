import { useState } from 'react';
import themes from './themes';

const C = {
	bg:      '#1e1e2e',
	bg1:     '#313244',
	bg2:     '#45475a',
	fg:      '#cdd6f4',
	fgDim:   '#7f849c',
	yellow:  '#f9e2af',
	green:   '#a6e3a1',
	blue:    '#89b4fa',
	red:     '#f38ba8',
	purple:  '#cba6f7',
	teal:    '#94e2d5',
	border:  '#45475a',
};

const mono = "'JetBrains Mono', monospace";

const STATUS_COLOR = { merged: C.green, open: C.blue, closed: C.red };

const SORT_OPTIONS = [
	{ value: '-updated', label: 'Más reciente primero' },
	{ value: 'updated',  label: 'Más antiguo primero' },
	{ value: '-stars',   label: 'Más estrellas primero' },
	{ value: 'stars',    label: 'Menos estrellas primero' },
];

function Label({ children }) {
	return (
		<span style={{ fontSize: 10, letterSpacing: 2, color: C.fgDim, textTransform: 'uppercase' }}>
			{children}
		</span>
	);
}

function Input({ value, onChange, placeholder, type = 'text', style }) {
	return (
		<input
			type={type}
			value={value}
			onChange={e => onChange(e.target.value)}
			placeholder={placeholder}
			style={{
				background: C.bg1,
				border: `1px solid ${C.border}`,
				borderRadius: 6,
				color: C.fg,
				fontFamily: mono,
				fontSize: 13,
				padding: '6px 10px',
				outline: 'none',
				width: '100%',
				boxSizing: 'border-box',
				...style,
			}}
		/>
	);
}

function Select({ value, onChange, options }) {
	return (
		<select
			value={value}
			onChange={e => onChange(e.target.value)}
			style={{
				background: C.bg1,
				border: `1px solid ${C.border}`,
				borderRadius: 6,
				color: C.fg,
				fontFamily: mono,
				fontSize: 13,
				padding: '6px 10px',
				outline: 'none',
				width: '100%',
				boxSizing: 'border-box',
				cursor: 'pointer',
			}}
		>
			{options.map(o => (
				<option key={o.value} value={o.value}>{o.label}</option>
			))}
		</select>
	);
}

function Badge({ status }) {
	const color = STATUS_COLOR[status] ?? C.fgDim;
	return (
		<span style={{
			fontSize: 9,
			fontWeight: 700,
			letterSpacing: 1,
			color,
			border: `1px solid ${color}`,
			borderRadius: 4,
			padding: '2px 6px',
			textTransform: 'uppercase',
			opacity: 0.9,
		}}>
			{status}
		</span>
	);
}

function PRRow({ pr }) {
	return (
		<div style={{
			display: 'grid',
			gridTemplateColumns: '40px 1fr auto auto',
			alignItems: 'center',
			gap: '0 12px',
			padding: '8px 12px',
			borderBottom: `1px solid ${C.bg2}`,
			fontSize: 12,
		}}>
			<span style={{ color: C.fgDim }}>#{pr.number}</span>
			<a
				href={pr.html_url}
				target="_blank"
				rel="noreferrer"
				style={{ color: C.fg, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
				title={pr.title}
			>
				{pr.title}
			</a>
			<span style={{ color: C.fgDim, fontSize: 11, whiteSpace: 'nowrap' }}>
				{pr.stars > 0 ? `★ ${pr.stars >= 1000 ? (pr.stars / 1000).toFixed(1) + 'k' : pr.stars}` : ''}
			</span>
			<Badge status={pr.status} />
		</div>
	);
}

export default function QueryExplorer() {
	const [username, setUsername]     = useState('');
	const [status, setStatus]         = useState('');
	const [starsMin, setStarsMin]     = useState('');
	const [dateFrom, setDateFrom]     = useState('');
	const [dateTo, setDateTo]         = useState('');
	const [sort, setSort]             = useState('-updated');
	const [limit, setLimit]           = useState('10');
	const [loading, setLoading]       = useState(false);
	const [result, setResult]         = useState(null);
	const [error, setError]           = useState('');
	const [reqBody, setReqBody]       = useState('');
	const [activeTab, setActiveTab]   = useState('results');

	async function sendQuery() {
		if (!username.trim()) { setError('Username requerido'); return; }
		setError('');
		setResult(null);

		const body = { username: username.trim() };
		const filters = {};
		if (status)   filters.status    = status;
		if (starsMin) filters.stars_min = Number(starsMin);
		if (dateFrom) filters.date_from = dateFrom;
		if (dateTo)   filters.date_to   = dateTo;
		if (Object.keys(filters).length) body.filters = filters;
		body.sort  = sort;
		body.limit = Number(limit) || 10;

		const bodyStr = JSON.stringify(body, null, 2);
		setReqBody(bodyStr);
		setLoading(true);

		try {
			const res = await fetch('/api/prs', {
				method: 'QUERY',
				headers: { 'Content-Type': 'application/json' },
				body: bodyStr,
			});
			const json = await res.json();
			setResult({ status: res.status, ok: res.ok, data: json });
			setActiveTab('results');
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	}

	const field = (label, children) => (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
			<Label>{label}</Label>
			{children}
		</div>
	);

	const tab = (id, label) => (
		<button
			onClick={() => setActiveTab(id)}
			style={{
				background: activeTab === id ? C.bg1 : 'transparent',
				border: 'none',
				borderBottom: activeTab === id ? `2px solid ${C.blue}` : '2px solid transparent',
				color: activeTab === id ? C.blue : C.fgDim,
				fontFamily: mono,
				fontSize: 12,
				letterSpacing: 1,
				padding: '8px 16px',
				cursor: 'pointer',
				textTransform: 'uppercase',
			}}
		>
			{label}
		</button>
	);

	return (
		<div style={{ background: C.bg, minHeight: '100vh', fontFamily: mono, color: C.fg }}>

			{/* Top bar */}
			<div style={{
				background: '#181825',
				padding: '10px 24px',
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				borderBottom: `1px solid ${C.border}`,
			}}>
				<span style={{ color: C.yellow, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
					github-contributions.nvim
				</span>
				<span style={{ color: C.fgDim, fontSize: 11 }}>·</span>
				<span style={{ color: C.purple, fontSize: 11 }}>HTTP QUERY Explorer</span>
				<div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
					<span style={{
						background: '#313244',
						border: `1px solid ${C.teal}`,
						color: C.teal,
						borderRadius: 4,
						fontSize: 10,
						fontWeight: 700,
						letterSpacing: 1,
						padding: '2px 8px',
					}}>
						RFC 10008
					</span>
					<a
						href={`/?username=`}
						style={{ color: C.fgDim, fontSize: 11, textDecoration: 'none' }}
					>
						card.svg →
					</a>
				</div>
			</div>

			<div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

				{/* Method pill + URL */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<span style={{
						background: '#2a2a3e',
						border: `1px solid ${C.purple}`,
						color: C.purple,
						borderRadius: 6,
						fontSize: 12,
						fontWeight: 700,
						letterSpacing: 2,
						padding: '4px 12px',
					}}>
						QUERY
					</span>
					<code style={{ color: C.fgDim, fontSize: 13 }}>
						/api/prs
					</code>
					<span style={{ color: C.fgDim, fontSize: 11, marginLeft: 'auto' }}>
						safe · idempotent · cacheable · RFC 10008
					</span>
				</div>

				{/* Form */}
				<div style={{
					background: '#181825',
					border: `1px solid ${C.border}`,
					borderRadius: 10,
					padding: 20,
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 16,
				}}>
					<div style={{ gridColumn: '1 / -1' }}>
						{field('username *',
							<Input value={username} onChange={setUsername} placeholder="4drian0rtiz" />
						)}
					</div>

					{field('status',
						<Select
							value={status}
							onChange={setStatus}
							options={[
								{ value: '', label: 'Todos' },
								{ value: 'merged', label: 'Merged' },
								{ value: 'open', label: 'Open' },
								{ value: 'closed', label: 'Closed' },
							]}
						/>
					)}

					{field('stars mínimas',
						<Input value={starsMin} onChange={setStarsMin} placeholder="0" type="number" />
					)}

					{field('fecha desde',
						<Input value={dateFrom} onChange={setDateFrom} placeholder="2025-01-01" type="date" />
					)}

					{field('fecha hasta',
						<Input value={dateTo} onChange={setDateTo} placeholder="2026-06-24" type="date" />
					)}

					{field('ordenar por',
						<Select value={sort} onChange={setSort} options={SORT_OPTIONS} />
					)}

					{field('límite',
						<Select
							value={limit}
							onChange={setLimit}
							options={[5, 10, 20, 50, 100].map(n => ({ value: String(n), label: String(n) }))}
						/>
					)}

					<div style={{ gridColumn: '1 / -1' }}>
						<button
							onClick={sendQuery}
							disabled={loading}
							style={{
								background: loading ? C.bg2 : C.purple,
								border: 'none',
								borderRadius: 6,
								color: '#1e1e2e',
								fontFamily: mono,
								fontSize: 13,
								fontWeight: 700,
								letterSpacing: 1,
								padding: '10px 24px',
								cursor: loading ? 'not-allowed' : 'pointer',
								width: '100%',
							}}
						>
							{loading ? 'Enviando QUERY...' : '▶  Enviar QUERY'}
						</button>
					</div>
				</div>

				{error && (
					<div style={{
						background: '#2d1b20',
						border: `1px solid ${C.red}`,
						borderRadius: 8,
						color: C.red,
						fontSize: 13,
						padding: '12px 16px',
					}}>
						✗ {error}
					</div>
				)}

				{(result || reqBody) && (
					<div style={{
						background: '#181825',
						border: `1px solid ${C.border}`,
						borderRadius: 10,
						overflow: 'hidden',
					}}>
						{/* Tabs */}
						<div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
							{tab('results', 'Resultados')}
							{tab('request', 'Request body')}
							{tab('raw', 'Raw JSON')}
						</div>

						<div style={{ padding: 16 }}>

							{activeTab === 'results' && result && (
								<div>
									{/* Status + meta */}
									<div style={{
										display: 'flex',
										alignItems: 'center',
										gap: 12,
										marginBottom: 16,
										fontSize: 12,
									}}>
										<span style={{
											color: result.ok ? C.green : C.red,
											fontWeight: 700,
											fontSize: 13,
										}}>
											{result.ok ? '✓' : '✗'} {result.status}
										</span>
										{result.data?.meta && (
											<>
												<span style={{ color: C.fgDim }}>·</span>
												<span style={{ color: C.fgDim }}>
													{result.data.meta.total} PRs
												</span>
												<span style={{ color: C.fgDim }}>·</span>
												<span style={{ color: C.fgDim }}>
													pág. {result.data.meta.page}/{result.data.meta.pages}
												</span>
												<span style={{
													marginLeft: 'auto',
													color: C.teal,
													fontSize: 10,
													letterSpacing: 1,
													border: `1px solid ${C.teal}`,
													borderRadius: 4,
													padding: '2px 6px',
												}}>
													Cache-Control: public, max-age=1800
												</span>
											</>
										)}
									</div>

									{/* PR list */}
									{result.data?.data?.length > 0 ? (
										<div style={{
											border: `1px solid ${C.border}`,
											borderRadius: 8,
											overflow: 'hidden',
										}}>
											{/* Header row */}
											<div style={{
												display: 'grid',
												gridTemplateColumns: '40px 1fr auto auto',
												gap: '0 12px',
												padding: '6px 12px',
												background: C.bg1,
												fontSize: 10,
												letterSpacing: 2,
												color: C.fgDim,
												textTransform: 'uppercase',
											}}>
												<span>#</span>
												<span>Título</span>
												<span>Stars</span>
												<span>Estado</span>
											</div>
											{result.data.data.map(pr => <PRRow key={pr.number} pr={pr} />)}
										</div>
									) : (
										<div style={{ color: C.fgDim, fontSize: 13 }}>
											Sin resultados con los filtros actuales.
										</div>
									)}
								</div>
							)}

							{activeTab === 'request' && reqBody && (
								<pre style={{
									margin: 0,
									color: C.fg,
									fontSize: 12,
									lineHeight: 1.6,
									whiteSpace: 'pre-wrap',
								}}>
									<span style={{ color: C.fgDim }}>QUERY /api/prs HTTP/1.1{'\n'}</span>
									<span style={{ color: C.fgDim }}>Content-Type: application/json{'\n\n'}</span>
									{reqBody}
								</pre>
							)}

							{activeTab === 'raw' && result && (
								<pre style={{
									margin: 0,
									color: C.fg,
									fontSize: 12,
									lineHeight: 1.6,
									whiteSpace: 'pre-wrap',
									overflowX: 'auto',
								}}>
									{JSON.stringify(result.data, null, 2)}
								</pre>
							)}
						</div>
					</div>
				)}

				{/* Footer */}
				<div style={{ color: C.fgDim, fontSize: 11, textAlign: 'center' }}>
					Para ver la card SVG →{' '}
					<code style={{ color: C.blue }}>/?username=&lt;github_user&gt;</code>
				</div>
			</div>
		</div>
	);
}
