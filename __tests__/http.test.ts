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
});
