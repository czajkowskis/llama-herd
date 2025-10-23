import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'web-streams-polyfill';
import '@testing-library/jest-dom';

Object.assign(global, { TextDecoder, TextEncoder, ReadableStream });

// JSDOM doesn't implement scrollIntoView; mock it to avoid crashes
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
	configurable: true,
	value: jest.fn(),
});
