import { generateCompletion, GenerateResponse } from './ollamaService';

// Helper to create a mock ReadableStream from a string array
function createMockStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const queue: (Uint8Array | null)[] = lines.map(line => encoder.encode(line));
  queue.push(null); // Signal end of stream

  return new ReadableStream({
    pull(controller) {
      const chunk = queue.shift();
      if (chunk) {
        controller.enqueue(chunk);
      } else {
        controller.close();
      }
    },
  });
}

describe('ollamaService', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCompletion streaming', () => {
    it('should handle a stream with multiple JSON objects in one chunk', async () => {
      const mockResponse: GenerateResponse[] = [
        { model: 'test', created_at: 'time', response: 'Hello', done: false },
        { model: 'test', created_at: 'time', response: ' World', done: true },
      ];
      const streamLines = mockResponse.map(obj => JSON.stringify(obj) + '\n');
      const mockStream = createMockStream(streamLines);
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      const onStream = jest.fn();
      await generateCompletion({ model: 'test', prompt: 'hi' }, onStream);

      expect(onStream).toHaveBeenCalledTimes(2);
      expect(onStream).toHaveBeenCalledWith(mockResponse[0]);
      expect(onStream).toHaveBeenCalledWith(mockResponse[1]);
    });

    it('should handle JSON objects split across multiple chunks', async () => {
        const mockResponse: GenerateResponse = { model: 'test', created_at: 'time', response: 'split', done: true };
        const jsonString = JSON.stringify(mockResponse);
        const parts = [jsonString.slice(0, 10), jsonString.slice(10) + '\n'];
        const mockStream = createMockStream(parts);
  
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          body: mockStream,
        });
  
        const onStream = jest.fn();
        await generateCompletion({ model: 'test', prompt: 'hi' }, onStream);
  
        expect(onStream).toHaveBeenCalledTimes(1);
        expect(onStream).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle empty lines in the stream', async () => {
        const mockResponse: GenerateResponse = { model: 'test', created_at: 'time', response: 'data', done: true };
        const streamLines = ['', JSON.stringify(mockResponse) + '\n', ''];
        const mockStream = createMockStream(streamLines);
  
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          body: mockStream,
        });
  
        const onStream = jest.fn();
        await generateCompletion({ model: 'test', prompt: 'hi' }, onStream);
  
        expect(onStream).toHaveBeenCalledTimes(1);
        expect(onStream).toHaveBeenCalledWith(mockResponse);
    });

    it('should gracefully handle malformed JSON', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const validResponse: GenerateResponse = { model: 'test', created_at: 'time', response: 'good', done: true };
        const streamLines = ['this is not json\n', JSON.stringify(validResponse) + '\n'];
        const mockStream = createMockStream(streamLines);
  
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          body: mockStream,
        });
  
        const onStream = jest.fn();
        await generateCompletion({ model: 'test', prompt: 'hi' }, onStream);
  
        expect(onStream).toHaveBeenCalledTimes(1);
        expect(onStream).toHaveBeenCalledWith(validResponse);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse JSON line:', 'this is not json', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('should support cancellation via AbortSignal', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const controller = new AbortController();
        const { signal } = controller;

        const mockFetch = (global.fetch as jest.Mock).mockImplementation(() => {
            return new Promise((resolve, reject) => {
                const mockStream = new ReadableStream({
                    start(c) {
                        c.enqueue(new TextEncoder().encode('{"response": "start"}'));
                    },
                });

                if (signal.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'));
                    return;
                }
                
                signal.addEventListener('abort', () => {
                    reject(new DOMException('Aborted', 'AbortError'));
                });

                resolve({
                    ok: true,
                    body: mockStream,
                });
            });
        });

        const onStream = jest.fn();
        
        // Abort before calling
        controller.abort();

        const completionPromise = generateCompletion({ model: 'test', prompt: 'hi' }, onStream, signal);
        await completionPromise;

        expect(onStream).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('Fetch aborted as requested.');

        consoleLogSpy.mockRestore();
        mockFetch.mockRestore();
    });
  });
});
