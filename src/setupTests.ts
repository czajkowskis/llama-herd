import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'web-streams-polyfill';

Object.assign(global, { TextDecoder, TextEncoder, ReadableStream });
