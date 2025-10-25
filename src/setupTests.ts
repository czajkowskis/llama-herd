import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'web-streams-polyfill';
import '@testing-library/jest-dom';

Object.assign(global, { TextDecoder, TextEncoder, ReadableStream });

// JSDOM doesn't implement scrollIntoView; mock it to avoid crashes
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
	configurable: true,
	value: jest.fn(),
});

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn() },
});