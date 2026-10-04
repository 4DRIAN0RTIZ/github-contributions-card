import { describe, it, expect } from 'vitest';
import { assertUsername, UsernameError } from '../netlify/lib/github.mjs';

describe('assertUsername', () => {
	const valid = [
		'octocat',
		'monalisa',
		'foo-bar',
		'a',
		'A1',
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ', // 36 chars: 1 + 35 = max allowed
	];

	const invalid = [
		['', 'empty string'],
		['foo bar', 'space in login'],
		['foo"bar', 'double-quote'],
		['foo\nbar', 'newline'],
		['-foo', 'leading hyphen'],
		['foo-', 'trailing hyphen'],
		['foo--bar', 'double hyphen'],
		['foo_bar', 'underscore not allowed'],
		['foo org:github', 'search qualifier injected'],
		['-', 'single hyphen'],
		['0123456789012345678901234567890123456789', '40 chars — too long'],
	];

	it('returns the trimmed login for valid usernames', () => {
		for (const login of valid) {
			expect(assertUsername(login)).toBe(login);
		}
	});

	it('throws UsernameError for invalid usernames', () => {
		for (const [login, label] of invalid) {
			expect(() => assertUsername(login), `${label} (${JSON.stringify(login)})`).toThrow(UsernameError);
		}
	});

	it('UsernameError is a proper Error subclass', () => {
		const err = new UsernameError();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(UsernameError);
		expect(err.message).toBe('Invalid GitHub username');
		expect(err.name).toBe('UsernameError');
	});
});
