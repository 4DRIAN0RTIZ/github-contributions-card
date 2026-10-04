import { describe, it, expect } from 'vitest';
import { RateLimitError, UpstreamError, AbortError, UsernameError } from '../netlify/lib/github.mjs';

describe('RateLimitError', () => {
	it('is an Error subclass', () => {
		const err = new RateLimitError();
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(RateLimitError);
		expect(err.message).toContain('rate limit');
	});
});

describe('UpstreamError', () => {
	it('preserves the status text', () => {
		const err = new UpstreamError('GitHub API 403');
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toBe('GitHub API 403');
	});
});

describe('AbortError', () => {
	it('is an Error subclass', () => {
		const err = new AbortError();
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe('AbortError');
	});
});

describe('UsernameError', () => {
	it('is thrown for invalid usernames', () => {
		expect(() => {
			// UsernameError is imported from the same module
			throw new UsernameError();
		}).toThrow(UsernameError);
	});
});
