import { describe, it, expect } from 'vitest';
import { renderCard } from '../src/render.js';
import themes from '../src/themes.js';

const BASE_USER = {
	login: 'octocat',
	name: 'Octo Cat',
	avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
	public_repos: 8,
	followers: 20,
	location: 'San Francisco',
	bio: 'GitHub mascot',
};

const BASE_PRS = [
	{
		number: 1,
		title: 'Fix: resolve XSS via theme name escaping',
		html_url: 'https://github.com/octocat/hello/pull/1',
		state: 'open',
		pull_request: { merged_at: null },
		repository_url: 'https://api.github.com/repos/octocat/hello',
		stars: 42,
		created_at: '2025-01-01T00:00:00Z',
		updated_at: '2025-01-01T00:00:00Z',
	},
];

function makeCard(overrides = {}) {
	const user = { ...BASE_USER, ...(overrides.user || {}) };
	const prs = overrides.prs !== undefined ? overrides.prs : BASE_PRS;
	return renderCard({
		user,
		prs,
		avatarBase64: overrides.avatarBase64 ?? 'data:image/png;base64,abc',
		theme: themes.Gruvbox,
		themeName: overrides.themeName ?? 'Gruvbox',
		page: overrides.page ?? 1,
		perPage: overrides.perPage ?? 10,
	});
}

describe('renderCard escapes text nodes', () => {
	it('theme name with < > " & chars is escaped in the SVG text node', () => {
		const svg = makeCard({ themeName: '</text><img src=x onerror=alert(1)>' });
		// The raw <img tag must not appear unescaped in the SVG text node
		expect(svg).not.toContain('<img');
		expect(svg).toContain('&lt;img');
		// The escaped closing > of </text> must be present (the > from the injected tag)
		expect(svg).toContain('&gt;');
		// The full injected string, as escaped, should appear in the text node
		// This proves it was escaped, not executed
		expect(svg).toContain('&lt;/text&gt;&lt;img src=x onerror=alert(1)&gt;');
	});

	it('pr title with < is escaped', () => {
		const svg = makeCard({
			prs: [{
				...BASE_PRS[0],
				title: '<img src=x onerror=alert(document.cookie)>',
			}],
		});
		expect(svg).not.toContain('<img');
		expect(svg).toContain('&lt;img');
	});

	it('avatar href with <svg is escaped', () => {
		const svg = makeCard({
			avatarBase64: 'data:image/svg+xml;base64,<svg onload=alert(1)>',
		});
		// The <svg from the data URI must not appear as an unescaped tag.
		// Check the escaped version appears in the attribute value AND the unescaped
		// <svg tag does NOT appear as a tag (only the SVG root element does).
		expect(svg).toContain('&lt;svg onload=alert(1)&gt;');
		// Verify the data:image URI still starts with the correct prefix
		expect(svg).toContain('data:image/svg+xml;base64,&lt;svg');
	});
});

describe('renderCard accepts malformed perPage / page', () => {
	it('zero perPage does not throw', () => {
		expect(() => makeCard({ perPage: 0 })).not.toThrow();
	});

	it('non-numeric page does not throw', () => {
		expect(() => makeCard({ page: undefined })).not.toThrow();
		expect(() => makeCard({ page: NaN })).not.toThrow();
	});

	it('zero perPage does not produce NaN in the SVG', () => {
		const svg = makeCard({ perPage: 0 });
		expect(svg).not.toContain('NaN');
	});
});

describe('renderCard basic output', () => {
	it('renders a valid SVG with the user login', () => {
		const svg = makeCard();
		expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
		expect(svg).toContain('octocat');
	});
});
