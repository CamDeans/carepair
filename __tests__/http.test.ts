import { ApiError, httpJson } from '@/src/lib/http';

describe('httpJson', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('parses JSON body on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ hello: 'world' }),
    });

    const data = await httpJson<{ hello: string }>('https://example.com/x', { timeoutMs: 5000 });
    expect(data.hello).toBe('world');
  });

  it('throws ApiError on non-OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'Unauthorized' }),
    });

    await expect(httpJson('https://example.com/x', { timeoutMs: 5000 })).rejects.toThrow('Unauthorized');
  });

  it('throws on invalid JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'not json',
    });

    await expect(httpJson('https://example.com/x', { timeoutMs: 5000 })).rejects.toBeInstanceOf(ApiError);
  });

  it('maps common fetch failures to a no-connection message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    await expect(httpJson('https://example.com/x', { timeoutMs: 5000 })).rejects.toThrow(/internet connection/i);
  });

  it('maps AbortError to timeout message', async () => {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(err);

    await expect(httpJson('https://example.com/x', { timeoutMs: 5000 })).rejects.toThrow(/timed out/i);
  });
});
