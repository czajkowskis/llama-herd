// src/config/config.test.ts

import { API_BASE_URL, OLLAMA_BASE_URL, buildWebSocketUrl } from './index';

describe('Configuration Module', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  describe('API_BASE_URL', () => {
    it('should use the default value when REACT_APP_API_BASE_URL is not set', () => {
      delete process.env.REACT_APP_API_BASE_URL;
      const config = require('./index');
      expect(config.API_BASE_URL).toBe('http://localhost:8000');
    });

    it('should use the environment variable value when REACT_APP_API_BASE_URL is set', () => {
      process.env.REACT_APP_API_BASE_URL = 'http://api.example.com';
      const config = require('./index');
      expect(config.API_BASE_URL).toBe('http://api.example.com');
    });
  });

  describe('OLLAMA_BASE_URL', () => {
    it('should use the default value when REACT_APP_OLLAMA_BASE_URL is not set', () => {
      delete process.env.REACT_APP_OLLAMA_BASE_URL;
      const config = require('./index');
      expect(config.OLLAMA_BASE_URL).toBe('http://localhost:11434');
    });

    it('should use the environment variable value when REACT_APP_OLLAMA_BASE_URL is set', () => {
      process.env.REACT_APP_OLLAMA_BASE_URL = 'http://ollama.example.com';
      const config = require('./index');
      expect(config.OLLAMA_BASE_URL).toBe('http://ollama.example.com');
    });
  });

  describe('buildWebSocketUrl', () => {
    it('should build a ws:// URL from a http:// base URL', () => {
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:8080';
      const config = require('./index');
      const wsUrl = config.buildWebSocketUrl('/ws/test');
      expect(wsUrl).toBe('ws://localhost:8080/ws/test');
    });

    it('should build a wss:// URL from a https:// base URL', () => {
      process.env.REACT_APP_API_BASE_URL = 'https://secure.api.com';
      const config = require('./index');
      const wsUrl = config.buildWebSocketUrl('/ws/secure');
      expect(wsUrl).toBe('wss://secure.api.com/ws/secure');
    });

    it('should handle base URLs with paths', () => {
      process.env.REACT_APP_API_BASE_URL = 'http://api.example.com/v1';
      const config = require('./index');
      const wsUrl = config.buildWebSocketUrl('/ws/path');
      expect(wsUrl).toBe('ws://api.example.com/ws/path');
    });
  });
});
