// Cloud sync, sign-in, and AI Powerups, tested against an in-memory stand-in for Supabase.
// The stand-in keeps one row per user with a version stamp, like the real user_state table.
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __backend as backend } from '@supabase/supabase-js';
import App, { DEFAULT_TRAITS, emptyData, applyReview, toCloudPayload, todayStr, addDays } from './App';

jest.mock('./cloudConfig.json', () => ({
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'sb_publishable_test',
}));

jest.mock('@supabase/supabase-js', () => {
  const backend = {
    users: {},
    rows: {},
    session: null,
    listeners: new Set(),
    version: 0,
    offline: false,
    beforeUpdate: null, // hook: lets a test slip in a write from "another device"
    requests: [],
    reset() {
      this.users = { 'me@example.com': { id: 'user-1', password: 'secret1' } };
      this.rows = {};
      this.session = null;
      this.listeners.clear();
      this.version = 0;
      this.offline = false;
      this.beforeUpdate = null;
      this.requests = [];
    },
    stamp() {
      this.version += 1;
      return `2026-11-15T00:00:00.${String(this.version).padStart(6, '0')}+00:00`;
    },
    // Writes a row the way some other device would.
    writeFromElsewhere(userId, data) {
      this.rows[userId] = { data: JSON.parse(JSON.stringify(data)), updated_at: this.stamp() };
    },
    emit(event) {
      this.listeners.forEach(listener => listener(event, this.session));
    },
  };
  backend.reset();

  const clone = value => JSON.parse(JSON.stringify(value));
  const offlineError = { message: 'TypeError: Failed to fetch' };

  async function run(query, shape) {
    await Promise.resolve();
    backend.requests.push(query.op);
    if (backend.offline) return { data: null, error: offlineError };
    const userId = query.op === 'insert' ? query.payload.user_id : query.filters.user_id;
    const row = backend.rows[userId];

    if (query.op === 'select') {
      return { data: row ? { data: clone(row.data), updated_at: row.updated_at } : null, error: null };
    }
    if (query.op === 'insert') {
      if (row) return { data: null, error: { code: '23505', message: 'duplicate key value' } };
      backend.rows[userId] = { data: clone(query.payload.data), updated_at: backend.stamp() };
      return { data: { updated_at: backend.rows[userId].updated_at }, error: null };
    }
    // update
    if (backend.beforeUpdate) {
      const hook = backend.beforeUpdate;
      backend.beforeUpdate = null;
      hook();
    }
    const current = backend.rows[userId];
    if (!current || (query.filters.updated_at && query.filters.updated_at !== current.updated_at)) {
      return { data: shape === 'many' ? [] : null, error: null };
    }
    current.data = clone(query.payload.data);
    current.updated_at = backend.stamp();
    return { data: [{ updated_at: current.updated_at }], error: null };
  }

  function from() {
    const query = { op: 'select', filters: {}, payload: null };
    const builder = {
      select() { return builder; },
      insert(payload) { query.op = 'insert'; query.payload = payload; return builder; },
      update(payload) { query.op = 'update'; query.payload = payload; return builder; },
      eq(column, value) { query.filters[column] = value; return builder; },
      maybeSingle() { return run(query, 'one'); },
      single() { return run(query, 'one'); },
      then(resolve, reject) { return run(query, 'many').then(resolve, reject); },
    };
    return builder;
  }

  const auth = {
    async getSession() {
      return { data: { session: backend.session }, error: null };
    },
    // Like the real client: reports the saved session shortly after subscribing.
    onAuthStateChange(listener) {
      backend.listeners.add(listener);
      Promise.resolve().then(() => {
        if (backend.listeners.has(listener)) listener('INITIAL_SESSION', backend.session);
      });
      return { data: { subscription: { unsubscribe: () => backend.listeners.delete(listener) } } };
    },
    async signInWithPassword({ email, password }) {
      const user = backend.users[email];
      if (!user || user.password !== password) {
        return { data: { session: null, user: null }, error: { message: 'Invalid login credentials' } };
      }
      backend.session = { access_token: `token-for-${user.id}`, user: { id: user.id, email } };
      backend.emit('SIGNED_IN');
      return { data: { session: backend.session, user: backend.session.user }, error: null };
    },
    async signUp({ email, password }) {
      if (backend.users[email]) return { data: { user: { identities: [] }, session: null }, error: null };
      backend.users[email] = { id: `user-${Object.keys(backend.users).length + 1}`, password };
      return { data: { user: { id: backend.users[email].id, identities: [{}] }, session: null }, error: null };
    },
    async signOut() {
      backend.session = null;
      backend.emit('SIGNED_OUT');
      return { error: null };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null };
    },
    async updateUser() {
      return { data: {}, error: null };
    },
  };

  return { createClient: () => ({ auth, from }), __backend: backend };
});

const stored = key => JSON.parse(localStorage.getItem(key));
const card = name => screen.getByRole('button', { name: new RegExp(`^${name}`), pressed: false });
const tab = name => within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(name) });
const SLOW = { timeout: 5000 }; // local edits are uploaded about 1.5 seconds after they happen

// Renders the app and lets Supabase report the starting session, as it does on a real launch.
async function renderApp() {
  render(<App />);
  await act(async () => {});
}

function signInThroughSettings(password = 'secret1') {
  userEvent.click(screen.getByRole('button', { name: 'Settings' }));
  userEvent.type(screen.getByLabelText('Email'), 'me@example.com');
  userEvent.type(screen.getByLabelText('Password'), password);
  userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

function alreadySignedIn() {
  backend.session = { access_token: 'token-for-user-1', user: { id: 'user-1', email: 'me@example.com' } };
}

// Progress as it would look after one review on some device.
function reviewedData(traitId, score, stamp) {
  const data = applyReview({ ...emptyData(), focus: [traitId] }, { [traitId]: score }, todayStr());
  return toCloudPayload({ ...data, updatedAt: stamp });
}

function reviewInApp(traitName, label) {
  userEvent.click(tab('Traits'));
  userEvent.click(card(traitName));
  userEvent.click(screen.getByRole('button', { name: /Review 1 trait/ }));
  userEvent.click(screen.getByRole('button', { name: `${traitName}: ${label}` }));
  userEvent.click(screen.getByRole('button', { name: 'Commit Review' }));
}

beforeEach(() => {
  localStorage.clear();
  backend.reset();
  global.fetch = jest.fn(() => Promise.reject(new Error('unexpected network call')));
});

describe('signing in', () => {
  test('a wrong password explains itself and signs nobody in', async () => {
    await renderApp();
    signInThroughSettings('nope');
    expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument();
    expect(backend.session).toBeNull();
    expect(backend.rows).toEqual({});
  });

  test('first sign-in uploads this device to an empty account', async () => {
    await renderApp();
    reviewInApp('Discipline', '5, Strong Growth');
    signInThroughSettings();

    expect(await screen.findByText('me@example.com')).toBeInTheDocument();
    await waitFor(() => expect(backend.rows['user-1']).toBeDefined());
    expect(backend.rows['user-1'].data.log).toEqual(stored('lu_log'));
    expect(backend.rows['user-1'].data.traits.find(t => t.id === 'discipline').score).toBe(52);
    expect(await screen.findByText(/^Synced/)).toBeInTheDocument();
    expect(stored('lu_meta').cloud).toMatchObject({ userId: 'user-1', remoteUpdatedAt: backend.rows['user-1'].updated_at });
  });

  test('creating an account asks for email confirmation; an existing email says so', async () => {
    await renderApp();
    userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    userEvent.type(screen.getByLabelText('Password'), 'secret1');
    userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/Open the confirmation link/)).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    userEvent.clear(screen.getByLabelText('Email'));
    userEvent.type(screen.getByLabelText('Email'), 'me@example.com');
    userEvent.type(screen.getByLabelText('Password'), 'secret1');
    userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/already has an account/)).toBeInTheDocument();
  });

  test('signing out keeps everything on the device', async () => {
    await renderApp();
    reviewInApp('Discipline', '4, Improved');
    signInThroughSettings();
    await screen.findByText(/^Synced/);

    userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(stored('lu_log')).toHaveLength(1);
    expect(backend.rows['user-1'].data.log).toHaveLength(1);
  });
});

describe('syncing between devices', () => {
  test('a new device with no progress takes the account data without asking', async () => {
    backend.writeFromElsewhere('user-1', reviewedData('discipline', 5, '2026-11-15T12:00:00.000Z'));
    alreadySignedIn();

    await renderApp();
    await waitFor(() => expect(stored('lu_log')).toHaveLength(1));
    expect(stored('lu_traits').find(t => t.id === 'discipline').score).toBe(52);
    expect(screen.queryByRole('dialog', { name: 'Choose which data to keep' })).not.toBeInTheDocument();
    expect(stored('lu_meta').cloud.remoteUpdatedAt).toBe(backend.rows['user-1'].updated_at);
    // Nothing was written back: taking account data is not an edit.
    expect(backend.requests).not.toContain('update');
    expect(backend.requests).not.toContain('insert');
  });

  test('progress on both sides: the user picks the account, and the device copy is kept as a backup', async () => {
    backend.writeFromElsewhere('user-1', reviewedData('patience', 5, '2026-11-15T12:00:00.000Z'));
    await renderApp();
    reviewInApp('Discipline', '4, Improved');
    signInThroughSettings();

    const dialog = await screen.findByRole('dialog', { name: 'Choose which data to keep' });
    expect(within(dialog).getAllByText(/1 review · last one Today/)).toHaveLength(2);
    userEvent.click(within(dialog).getByRole('button', { name: "Use my account's progress" }));

    await waitFor(() => expect(stored('lu_traits').find(t => t.id === 'patience').score).toBe(47));
    expect(stored('lu_traits').find(t => t.id === 'discipline').score).toBe(50);
    expect(stored('lu_backup')).toMatchObject({ reason: 'cloud' });
    expect(stored('lu_backup').data.traits.find(t => t.id === 'discipline').score).toBe(51);
    expect(backend.rows['user-1'].data.traits.find(t => t.id === 'patience').score).toBe(47);
  });

  test('progress on both sides: the user picks this device, and the account is replaced', async () => {
    backend.writeFromElsewhere('user-1', reviewedData('patience', 5, '2026-11-15T12:00:00.000Z'));
    await renderApp();
    reviewInApp('Discipline', '4, Improved');
    signInThroughSettings();

    const dialog = await screen.findByRole('dialog', { name: 'Choose which data to keep' });
    userEvent.click(within(dialog).getByRole('button', { name: "Use this device's progress" }));

    await waitFor(() => expect(backend.rows['user-1'].data.traits.find(t => t.id === 'discipline').score).toBe(51));
    expect(backend.rows['user-1'].data.traits.find(t => t.id === 'patience').score).toBe(45);
    expect(stored('lu_traits').find(t => t.id === 'discipline').score).toBe(51);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Choose which data to keep' })).not.toBeInTheDocument());
  });

  test('an edit made after linking is uploaded shortly afterwards', async () => {
    alreadySignedIn();
    await renderApp();
    await waitFor(() => expect(backend.rows['user-1']).toBeDefined());
    const firstVersion = backend.rows['user-1'].updated_at;

    reviewInApp('Courage', '5, Strong Growth');
    await waitFor(() => expect(backend.rows['user-1'].updated_at).not.toBe(firstVersion), SLOW);
    expect(backend.rows['user-1'].data.traits.find(t => t.id === 'courage').score).toBe(52);
    expect(stored('lu_meta').cloud.remoteUpdatedAt).toBe(backend.rows['user-1'].updated_at);
  });

  test('coming back to the app picks up changes made on another device', async () => {
    alreadySignedIn();
    await renderApp();
    await waitFor(() => expect(backend.rows['user-1']).toBeDefined());

    backend.writeFromElsewhere('user-1', reviewedData('gratitude', 5, new Date().toISOString()));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });

    await waitFor(() => expect(stored('lu_traits').find(t => t.id === 'gratitude').score).toBe(57));
    expect(screen.queryByRole('dialog', { name: 'Choose which data to keep' })).not.toBeInTheDocument();
  });

  test('if another device saves first, this device looks again instead of overwriting it', async () => {
    alreadySignedIn();
    await renderApp();
    await waitFor(() => expect(backend.rows['user-1']).toBeDefined());

    // While this device is uploading its edit, a newer edit from elsewhere lands first.
    const newer = reviewedData('gratitude', 5, addDays(todayStr(), 1) + 'T00:00:00.000Z');
    backend.beforeUpdate = () => backend.writeFromElsewhere('user-1', newer);
    reviewInApp('Courage', '5, Strong Growth');

    // The stale write is refused, the newer account data wins, and the local edit is kept as a backup.
    await waitFor(() => expect(stored('lu_traits').find(t => t.id === 'gratitude').score).toBe(57), SLOW);
    expect(backend.rows['user-1'].data.traits.find(t => t.id === 'gratitude').score).toBe(57);
    expect(stored('lu_backup')).toMatchObject({ reason: 'cloud' });
    expect(stored('lu_backup').data.traits.find(t => t.id === 'courage').score).toBe(52);
  });

  test('offline: the app keeps working, and syncs once the connection is back', async () => {
    alreadySignedIn();
    await renderApp();
    await waitFor(() => expect(backend.rows['user-1']).toBeDefined());
    const firstVersion = backend.rows['user-1'].updated_at;

    backend.offline = true;
    reviewInApp('Courage', '5, Strong Growth');
    expect(stored('lu_traits').find(t => t.id === 'courage').score).toBe(52);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1800)); });
    expect(backend.rows['user-1'].updated_at).toBe(firstVersion);

    backend.offline = false;
    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(backend.rows['user-1'].updated_at).not.toBe(firstVersion), SLOW);
    expect(backend.rows['user-1'].data.traits.find(t => t.id === 'courage').score).toBe(52);
  });

  test('decay applied on launch is not treated as an edit that could overwrite newer account data', async () => {
    // This device last synced long ago. Opening it applies decay locally…
    const old = addDays(todayStr(), -30);
    const stale = applyReview({ ...emptyData(), focus: ['discipline'] }, { discipline: 4 }, old);
    const stamp = `${old}T12:00:00.000Z`;
    backend.writeFromElsewhere('user-1', toCloudPayload({ ...stale, updatedAt: stamp }));
    const syncedVersion = backend.rows['user-1'].updated_at;
    localStorage.setItem('lu_traits', JSON.stringify(stale.traits));
    localStorage.setItem('lu_log', JSON.stringify(stale.log));
    localStorage.setItem('lu_streak', JSON.stringify(stale.streak));
    localStorage.setItem('lu_updated_at', JSON.stringify(stamp));
    localStorage.setItem('lu_meta', JSON.stringify({
      schema: 2, repairChecked: true,
      cloud: { userId: 'user-1', remoteUpdatedAt: syncedVersion, dataUpdatedAt: stamp },
    }));
    // …while another device has reviewed since.
    backend.writeFromElsewhere('user-1', reviewedData('gratitude', 5, new Date().toISOString()));
    alreadySignedIn();

    await renderApp();
    await waitFor(() => expect(stored('lu_traits').find(t => t.id === 'gratitude').score).toBe(57));
    expect(backend.rows['user-1'].data.traits.find(t => t.id === 'gratitude').score).toBe(57);
    expect(backend.requests).not.toContain('update');
  });
});

describe('AI Powerups', () => {
  const aiLesson = {
    title: 'Count Before You Spend',
    lesson: 'A lesson written by the model.',
    action: 'Write down three purchases.',
    reflection: 'Where did my money go today?',
  };
  const reply = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });

  test('signed in: the first visit of the day asks Claude for a lesson and shows it', async () => {
    alreadySignedIn();
    global.fetch = jest.fn(() => reply(200, { lesson: aiLesson, remaining: 4 }));
    await renderApp();
    userEvent.click(tab('Powerup'));

    expect(await screen.findByText('Count Before You Spend')).toBeInTheDocument();
    expect(screen.getByText('✦ WRITTEN FOR YOU')).toBeInTheDocument();
    expect(screen.getByText('Financial Intelligence · 40')).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/powerup');
    expect(options.headers.Authorization).toBe('Bearer token-for-user-1');
    expect(JSON.parse(options.body)).toEqual({
      trait: { name: 'Financial Intelligence', category: 'Skills', score: 40 },
      recentTitles: [],
    });
    expect(stored('lu_powerups')[0]).toMatchObject({ source: 'ai', title: 'Count Before You Spend', done: false });

    // Leaving and coming back does not ask again.
    userEvent.click(tab('Traits'));
    userEvent.click(tab('Powerup'));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('if the AI lesson fails, the built-in lesson is shown with a short explanation', async () => {
    alreadySignedIn();
    global.fetch = jest.fn(() => reply(429, { error: 'daily_limit' }));
    await renderApp();
    userEvent.click(tab('Powerup'));

    expect(await screen.findByText(/You've used today's AI lessons/)).toBeInTheDocument();
    expect(screen.getByText('Know Your Number')).toBeInTheDocument();
    expect(screen.getByText('BUILT-IN LESSON')).toBeInTheDocument();
    expect(stored('lu_powerups')[0]).toMatchObject({ source: 'library', aiTried: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('"Use a built-in lesson" skips the wait and ignores a late answer', async () => {
    alreadySignedIn();
    let finish;
    global.fetch = jest.fn(() => new Promise(resolve => { finish = resolve; }));
    await renderApp();
    userEvent.click(tab('Powerup'));

    userEvent.click(await screen.findByRole('button', { name: 'Use a built-in lesson' }));
    expect(screen.getByText('Know Your Number')).toBeInTheDocument();

    await act(async () => {
      finish({ ok: true, status: 200, json: async () => ({ lesson: aiLesson }) });
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(screen.queryByText('Count Before You Spend')).not.toBeInTheDocument();
    expect(stored('lu_powerups')[0]).toMatchObject({ source: 'library', aiTried: true });
  });

  test('signed out: built-in lessons only, with a hint that signing in adds AI lessons', async () => {
    await renderApp();
    userEvent.click(tab('Powerup'));
    expect(screen.getByText('Know Your Number')).toBeInTheDocument();
    expect(screen.getByText(/Want lessons written for you/)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('AI Powerups can be switched off in Settings', async () => {
    alreadySignedIn();
    localStorage.setItem('lu_settings', JSON.stringify({ theme: 'system', aiPowerups: false }));
    await renderApp();
    await waitFor(() => expect(backend.rows['user-1']).toBeDefined());
    userEvent.click(tab('Powerup'));
    expect(screen.getByText('Know Your Number')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

test('the default traits are what a brand-new account starts with', async () => {
  alreadySignedIn();
  await renderApp();
  await waitFor(() => expect(backend.rows['user-1']).toBeDefined());
  expect(backend.rows['user-1'].data.traits).toEqual(DEFAULT_TRAITS);
});
