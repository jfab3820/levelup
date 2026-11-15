/**
 * @jest-environment node
 */
// Tests for the serverless function in api/powerup.js. Claude and Supabase are replaced
// with stand-ins, so these check the function's own rules: who may call it, what it sends
// to Claude, and what it answers when something goes wrong.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const handler = require('../api/powerup');

jest.mock('./cloudConfig.json', () => ({
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'sb_publishable_test',
}));

jest.mock('@anthropic-ai/sdk', () => {
  const actual = jest.requireActual('@anthropic-ai/sdk');
  const parse = jest.fn();
  const betaParse = jest.fn();
  function FakeAnthropic(options) {
    FakeAnthropic.options = options;
    this.messages = { parse };
    this.beta = { messages: { parse: betaParse } };
  }
  ['APIError', 'AuthenticationError', 'PermissionDeniedError', 'RateLimitError', 'APIConnectionError'].forEach(name => {
    FakeAnthropic[name] = actual[name];
  });
  FakeAnthropic.parse = parse;
  FakeAnthropic.betaParse = betaParse;
  return FakeAnthropic;
});

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const lesson = {
  title: 'Widen the Gap',
  lesson: 'Between what happens and what you do there is a gap.',
  action: 'Take three slow breaths before you answer.',
  reflection: 'Where did I react before choosing?',
};

// What the stand-in Supabase answers. Tests change these.
let user;
let claim;

function call({ method = 'POST', token = 'user-token', body } = {}) {
  const req = {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: body === undefined ? { trait: { name: 'Patience', category: 'Character', score: 44 }, recentTitles: ['Assume There\'s a Reason'] } : body,
  };
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  return handler(req, res).then(() => res);
}

const sdkError = name => Object.create(Anthropic[name].prototype);

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.POWERUP_MODEL;
  user = { data: { user: { id: 'user-1' } }, error: null };
  claim = { data: 4, error: null };
  createClient.mockReset();
  createClient.mockImplementation(() => ({
    auth: { getUser: jest.fn(async () => user) },
    rpc: jest.fn(async () => claim),
  }));
  Anthropic.parse.mockReset();
  Anthropic.betaParse.mockReset();
  Anthropic.betaParse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: lesson });
  Anthropic.parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: lesson });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('who may call it', () => {
  test('only POST', async () => {
    const res = await call({ method: 'GET' });
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
  });

  test('answers "not configured" until an Anthropic key is set, without touching anything else', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await call();
    expect(res.statusCode).toBe(503);
    expect(res.payload).toEqual({ error: 'not_configured' });
    expect(createClient).not.toHaveBeenCalled();
  });

  test('refuses requests with no sign-in token', async () => {
    const res = await call({ token: null });
    expect(res.statusCode).toBe(401);
    expect(Anthropic.betaParse).not.toHaveBeenCalled();
  });

  test('refuses a token Supabase does not recognize', async () => {
    user = { data: { user: null }, error: { message: 'invalid JWT' } };
    const res = await call();
    expect(res.statusCode).toBe(401);
    expect(Anthropic.betaParse).not.toHaveBeenCalled();
  });

  test('refuses a malformed request before spending anything', async () => {
    for (const body of [null, {}, { trait: { name: '   ', score: 5 } }, { trait: { name: 'Patience', score: 'high' } }, 'not json']) {
      const res = await call({ body });
      expect(res.statusCode).toBe(400);
    }
    expect(createClient).not.toHaveBeenCalled();
    expect(Anthropic.betaParse).not.toHaveBeenCalled();
  });

  test('stops at the daily limit without calling Claude', async () => {
    claim = { data: -1, error: null };
    const res = await call();
    expect(res.statusCode).toBe(429);
    expect(res.payload).toEqual({ error: 'daily_limit' });
    expect(Anthropic.betaParse).not.toHaveBeenCalled();
  });

  test('does not call Claude if the allowance cannot be checked', async () => {
    claim = { data: null, error: { message: 'function not found' } };
    const res = await call();
    expect(res.statusCode).toBe(502);
    expect(Anthropic.betaParse).not.toHaveBeenCalled();
  });
});

describe('writing the lesson', () => {
  test('returns the lesson and how many are left today', async () => {
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ lesson, remaining: 4 });
  });

  test('acts as the signed-in user, so the database applies that user\'s limits', async () => {
    await call({ token: 'abc123' });
    const [url, key, options] = createClient.mock.calls[0];
    expect(url).toBe('https://example.supabase.co');
    expect(key).toBe('sb_publishable_test');
    expect(options.global.headers.Authorization).toBe('Bearer abc123');
    const client = createClient.mock.results[0].value;
    expect(client.auth.getUser).toHaveBeenCalledWith('abc123');
    expect(client.rpc).toHaveBeenCalledWith('claim_powerup_generation', { trait: 'Patience' });
  });

  test('sends Claude the trait, its score, and the lessons to avoid repeating', async () => {
    await call();
    expect(Anthropic.betaParse).toHaveBeenCalledTimes(1);
    const request = Anthropic.betaParse.mock.calls[0][0];

    expect(request.model).toBe('claude-opus-5-5');
    expect(request.max_tokens).toBe(4096);
    expect(request.output_config.effort).toBe('low');
    expect(request.output_config.format.type).toBe('json_schema');
    expect(Object.keys(request.output_config.format.schema.properties)).toEqual(['title', 'lesson', 'action', 'reflection']);
    expect(request.fallbacks).toBe('default');
    expect(request.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(request.system).toMatch(/daily "Powerup" for LevelUp/);
    expect(request.messages).toEqual([{
      role: 'user',
      content: [
        'Trait: Patience',
        'Category: Character',
        'Current score: 44 out of 100',
        '',
        'Lessons this user already had for this trait. Teach a different idea:',
        "- Assume There's a Reason",
      ].join('\n'),
    }]);
    // Nothing the model can't use: no sampling settings, no forced thinking config.
    expect(request).not.toHaveProperty('temperature');
    expect(request).not.toHaveProperty('thinking');
  });

  test('POWERUP_MODEL switches the model; Haiku is called without a fallback', async () => {
    process.env.POWERUP_MODEL = 'claude-haiku-5-5';
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(Anthropic.betaParse).not.toHaveBeenCalled();
    const request = Anthropic.parse.mock.calls[0][0];
    expect(request.model).toBe('claude-haiku-5-5');
    expect(request).not.toHaveProperty('fallbacks');
    expect(request).not.toHaveProperty('betas');
  });

  test('cleans up what the user typed before it reaches Claude', () => {
    const input = handler.parseInput({
      trait: { name: `  Deep   Work ${'x'.repeat(200)}`, category: 'Made Up', score: 250 },
      recentTitles: ['  One  ', 42, '', 'x'.repeat(500), ...Array(20).fill('More')],
    });
    expect(input.trait.name).toHaveLength(60);
    expect(input.trait.name.startsWith('Deep Work x')).toBe(true);
    expect(input.trait.category).toBe('Core');
    expect(input.trait.score).toBe(100);
    expect(input.recentTitles).toHaveLength(8);
    expect(input.recentTitles[0]).toBe('One');
    expect(input.recentTitles[1]).toHaveLength(120);
  });
});

describe('when Claude does not deliver', () => {
  test('a declined request is reported, not passed off as a lesson', async () => {
    Anthropic.betaParse.mockResolvedValue({ stop_reason: 'refusal', parsed_output: null, content: [] });
    const res = await call();
    expect(res.statusCode).toBe(502);
    expect(res.payload).toEqual({ error: 'refused' });
  });

  test('a cut-off or incomplete answer is reported', async () => {
    Anthropic.betaParse.mockResolvedValue({ stop_reason: 'max_tokens', parsed_output: null });
    expect((await call()).payload).toEqual({ error: 'incomplete' });

    Anthropic.betaParse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { ...lesson, action: '  ' } });
    expect((await call()).payload).toEqual({ error: 'incomplete' });
  });

  test('a rejected API key reads as "not configured"', async () => {
    Anthropic.betaParse.mockRejectedValue(sdkError('AuthenticationError'));
    const res = await call();
    expect(res.statusCode).toBe(503);
    expect(res.payload).toEqual({ error: 'not_configured' });
  });

  test('rate limits, connection problems, and other API errors each get their own answer', async () => {
    Anthropic.betaParse.mockRejectedValue(sdkError('RateLimitError'));
    expect((await call()).payload).toEqual({ error: 'busy' });

    Anthropic.betaParse.mockRejectedValue(sdkError('APIConnectionError'));
    const unreachable = await call();
    expect(unreachable.statusCode).toBe(504);
    expect(unreachable.payload).toEqual({ error: 'upstream_unreachable' });

    Anthropic.betaParse.mockRejectedValue(sdkError('APIError'));
    expect((await call()).payload).toEqual({ error: 'upstream_error' });

    Anthropic.betaParse.mockRejectedValue(new Error('something else'));
    const crashed = await call();
    expect(crashed.statusCode).toBe(500);
    expect(crashed.payload).toEqual({ error: 'server_error' });
  });
});
