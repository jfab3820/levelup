import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, {
  DEFAULT_TRAITS,
  toDateStr, todayStr, dayDiff, addDays, weekStartOf,
  normalizeData, emptyData, applyDecay, currentStreak, bumpStreak, applyReview,
  computeRepair, applyRepair, rankPowerupTraits, buildLibraryPowerup, ensureTodayPowerup,
  isPristine, decideSync, loadInitialState, parseBackupFile, toCloudPayload,
} from './App';
import { TRAIT_LESSONS } from './powerupLibrary';

const TODAY = '2026-11-15';

function trait(overrides) {
  return { id: 'discipline', name: 'Discipline', category: 'Core', score: 50, lastReviewed: null, ...overrides };
}

// Writes data the way the old (pre-4.0) app stored it: no meta key, no decay anchors.
function seedOldApp({ traits, focus = [], log = [], streak = { count: 0, lastDate: null } }) {
  localStorage.setItem('lu_traits', JSON.stringify(traits));
  localStorage.setItem('lu_focus', JSON.stringify(focus));
  localStorage.setItem('lu_log', JSON.stringify(log));
  localStorage.setItem('lu_streak', JSON.stringify(streak));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

// ─── Dates ────────────────────────────────────────────────────────────────────
describe('dates', () => {
  test('tests run in Kansas City time', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Chicago');
  });

  test('an evening in Kansas City is still today, not tomorrow', () => {
    // 8:00 PM CST on Nov 15 is already Nov 16 in UTC — the old app logged it as the 16th.
    const eightPm = new Date('2026-11-16T02:00:00Z');
    expect(eightPm.toISOString().split('T')[0]).toBe('2026-11-16');
    expect(toDateStr(eightPm)).toBe('2026-11-15');
  });

  test('todayStr follows the device clock', () => {
    jest.useFakeTimers('modern');
    try {
      jest.setSystemTime(new Date('2026-11-16T05:59:00Z')); // 11:59 PM CST Nov 15
      expect(todayStr()).toBe('2026-11-15');
      jest.setSystemTime(new Date('2026-11-16T06:01:00Z')); // 12:01 AM CST Nov 16
      expect(todayStr()).toBe('2026-11-16');
    } finally {
      jest.useRealTimers();
    }
  });

  test('day math is not thrown off by daylight saving', () => {
    expect(dayDiff('2026-03-07', '2026-03-09')).toBe(2); // clocks spring forward Mar 8
    expect(dayDiff('2026-10-31', '2026-11-02')).toBe(2); // clocks fall back Nov 1
    expect(dayDiff('2026-11-15', '2026-11-10')).toBe(-5);
    expect(dayDiff(null, '2026-11-10')).toBe(0);
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('weeks start on Monday', () => {
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09'); // Sunday
    expect(weekStartOf('2026-11-09')).toBe('2026-11-09'); // Monday
    expect(weekStartOf('2026-11-11')).toBe('2026-11-09'); // Wednesday
  });
});

// ─── Decay ────────────────────────────────────────────────────────────────────
describe('decay', () => {
  test('never-reviewed traits do not decay', () => {
    const traits = [trait()];
    expect(applyDecay(traits, [], TODAY)).toBe(traits);
  });

  test('loses 1 point per full 7 days since the last review', () => {
    const score = daysAgo => applyDecay([trait({ lastReviewed: addDays(TODAY, -daysAgo) })], [], TODAY)[0].score;
    expect(score(6)).toBe(50);
    expect(score(7)).toBe(49);
    expect(score(13)).toBe(49);
    expect(score(20)).toBe(48);
  });

  test('the same week is never charged twice (the old bug charged it on every launch)', () => {
    const start = [trait({ lastReviewed: addDays(TODAY, -20) })];
    const first = applyDecay(start, [], TODAY);
    expect(first[0].score).toBe(48);
    expect(first[0].decayAnchor).toBe(addDays(TODAY, -6));

    // Opening the app again and again the same day changes nothing.
    expect(applyDecay(first, [], TODAY)).toBe(first);
    expect(applyDecay(applyDecay(first, [], TODAY), [], TODAY)[0].score).toBe(48);

    // One more point comes off only once another full week has passed.
    expect(applyDecay(first, [], addDays(TODAY, 1))[0].score).toBe(47);
  });

  test('focus traits are exempt and their clock is paused', () => {
    const start = [trait({ lastReviewed: addDays(TODAY, -30) })];
    const held = applyDecay(start, ['discipline'], TODAY);
    expect(held[0].score).toBe(50);
    expect(held[0].decayAnchor).toBe(TODAY);
    // Taken out of focus three days later: no back-charge for the paused time.
    expect(applyDecay(held, [], addDays(TODAY, 3))[0].score).toBe(50);
    expect(applyDecay(held, [], addDays(TODAY, 7))[0].score).toBe(49);
  });

  test('scores never go below zero', () => {
    const result = applyDecay([trait({ score: 1, lastReviewed: addDays(TODAY, -70) })], [], TODAY);
    expect(result[0].score).toBe(0);
  });
});

// ─── Streak ───────────────────────────────────────────────────────────────────
describe('streak', () => {
  test('shows 0 once a day has been missed', () => {
    expect(currentStreak({ count: 5, lastDate: TODAY }, TODAY)).toBe(5);
    expect(currentStreak({ count: 5, lastDate: addDays(TODAY, -1) }, TODAY)).toBe(5);
    expect(currentStreak({ count: 5, lastDate: addDays(TODAY, -2) }, TODAY)).toBe(0);
    expect(currentStreak({ count: 0, lastDate: null }, TODAY)).toBe(0);
  });

  test('grows on consecutive days, resets after a gap, remembers the best', () => {
    let streak = bumpStreak({ count: 0, lastDate: null, best: 0 }, '2026-11-10');
    expect(streak).toEqual({ count: 1, lastDate: '2026-11-10', best: 1 });
    expect(bumpStreak(streak, '2026-11-10')).toBe(streak); // second review the same day
    streak = bumpStreak(streak, '2026-11-11');
    streak = bumpStreak(streak, '2026-11-12');
    expect(streak.count).toBe(3);
    streak = bumpStreak(streak, '2026-11-15');
    expect(streak).toEqual({ count: 1, lastDate: '2026-11-15', best: 3 });
  });
});

// ─── Review ───────────────────────────────────────────────────────────────────
describe('review', () => {
  test('applies score changes, logs them, clears focus, bumps the streak', () => {
    const data = {
      ...emptyData(),
      traits: [trait(), trait({ id: 'patience', name: 'Patience', category: 'Character', score: 45 }), trait({ id: 'focus', name: 'Focus' })],
      focus: ['discipline', 'patience'],
    };
    const next = applyReview(data, { discipline: 5, patience: 1 }, TODAY);

    expect(next.traits[0]).toMatchObject({ score: 52, lastReviewed: TODAY, decayAnchor: TODAY });
    expect(next.traits[1]).toMatchObject({ score: 43, lastReviewed: TODAY });
    expect(next.traits[2]).toBe(data.traits[2]);
    expect(next.focus).toEqual([]);
    expect(next.streak).toEqual({ count: 1, lastDate: TODAY, best: 1 });
    expect(next.log).toEqual([
      { trait: 'Discipline', traitId: 'discipline', score: 5, delta: 2, date: TODAY },
      { trait: 'Patience', traitId: 'patience', score: 1, delta: -2, date: TODAY },
    ]);
  });

  test('scores stay between 0 and 100', () => {
    const data = {
      ...emptyData(),
      traits: [trait({ score: 100 }), trait({ id: 'low', name: 'Low', score: 1 })],
      focus: ['discipline', 'low'],
    };
    const next = applyReview(data, { discipline: 5, low: 1 }, TODAY);
    expect(next.traits.map(t => t.score)).toEqual([100, 0]);
  });

  test('does nothing when no focus trait was scored', () => {
    const data = { ...emptyData(), focus: ['discipline'] };
    expect(applyReview(data, {}, TODAY)).toBe(data);
  });
});

// ─── Repairing scores the old decay bug lowered ───────────────────────────────
describe('score repair', () => {
  test('rebuilds what a built-in trait should be from the review log', () => {
    // Discipline starts at 50. +1 sixty days ago, +2 fifty-nine days ago, nothing since.
    const log = [
      { trait: 'Discipline', score: 5, delta: 2, date: addDays(TODAY, -59) },
      { trait: 'Discipline', score: 4, delta: 1, date: addDays(TODAY, -60) },
    ];
    // Fair score: 50 + 1 + 2 = 53, minus 8 full weeks of decay = 45. The bug left it at 20.
    const offers = computeRepair([trait({ score: 20, lastReviewed: addDays(TODAY, -59) })], log, TODAY);
    expect(offers).toEqual([{ id: 'discipline', name: 'Discipline', from: 20, to: 45 }]);
  });

  test('charges fair decay for the gaps between reviews', () => {
    const log = [
      { trait: 'Discipline', traitId: 'discipline', score: 4, delta: 1, date: addDays(TODAY, -1) },
      { trait: 'Discipline', traitId: 'discipline', score: 4, delta: 1, date: addDays(TODAY, -22) },
    ];
    // 50 + 1 = 51, three weeks pass (−3) = 48, +1 = 49.
    const offers = computeRepair([trait({ score: 40, lastReviewed: addDays(TODAY, -1) })], log, TODAY);
    expect(offers[0].to).toBe(49);
  });

  test('offers nothing when the score is already right, never lowers a score, skips custom traits', () => {
    const log = [
      { trait: 'Discipline', score: 4, delta: 1, date: TODAY },
      { trait: 'My Trait', score: 4, delta: 1, date: addDays(TODAY, -90) },
    ];
    const traits = [
      trait({ score: 51, lastReviewed: TODAY }),
      trait({ id: 'my_trait_1', name: 'My Trait', score: 5, lastReviewed: addDays(TODAY, -90) }),
    ];
    expect(computeRepair(traits, log, TODAY)).toEqual([]);
    expect(computeRepair([trait({ score: 90, lastReviewed: TODAY })], log, TODAY)).toEqual([]);
    expect(computeRepair([trait()], [], TODAY)).toEqual([]);
  });

  test('applyRepair sets the score and restarts the decay clock', () => {
    const data = { ...emptyData(), traits: [trait({ score: 20, lastReviewed: addDays(TODAY, -59) }), trait({ id: 'other', name: 'Other' })] };
    const next = applyRepair(data, [{ id: 'discipline', name: 'Discipline', from: 20, to: 45 }], TODAY);
    expect(next.traits[0]).toMatchObject({ score: 45, decayAnchor: TODAY });
    expect(next.traits[1]).toBe(data.traits[1]);
  });
});

// ─── Loading data saved by the old app ────────────────────────────────────────
describe('loading and upgrading saved data', () => {
  test('a first launch starts with the default traits and a Powerup for today', () => {
    const { data, meta, repairOffers } = loadInitialState(TODAY);
    expect(data.traits).toEqual(DEFAULT_TRAITS);
    expect(data.powerups).toHaveLength(1);
    expect(meta).toMatchObject({ schema: 2, repairChecked: true, cloud: null });
    expect(repairOffers).toEqual([]);
  });

  test('upgrading does not take more decay points, and offers back the ones the bug took', () => {
    const lastReviewed = addDays(TODAY, -30);
    seedOldApp({
      traits: [trait({ score: 30, lastReviewed }), trait({ id: 'patience', name: 'Patience', category: 'Character', score: 45 })],
      log: [{ trait: 'Discipline', score: 4, delta: 1, date: lastReviewed }],
      streak: { count: 4, lastDate: lastReviewed },
    });

    const { data, meta, repairOffers } = loadInitialState(TODAY);
    expect(data.traits[0]).toMatchObject({ score: 30, decayAnchor: TODAY });
    expect(data.streak).toEqual({ count: 4, lastDate: lastReviewed, best: 4 });
    // 50 + 1 = 51, minus 4 full weeks = 47.
    expect(repairOffers).toEqual([{ id: 'discipline', name: 'Discipline', from: 30, to: 47 }]);
    expect(meta.repairChecked).toBe(false);
  });

  test('dates the old app stamped with tomorrow (UTC) are pulled back to today', () => {
    const tomorrow = addDays(TODAY, 1);
    seedOldApp({
      traits: [trait({ lastReviewed: tomorrow })],
      log: [{ trait: 'Discipline', score: 4, delta: 1, date: tomorrow }],
      streak: { count: 3, lastDate: tomorrow },
    });
    const { data } = loadInitialState(TODAY);
    expect(data.traits[0].lastReviewed).toBe(TODAY);
    expect(data.log[0].date).toBe(TODAY);
    expect(data.streak.lastDate).toBe(TODAY);
  });

  test('one unreadable key does not wipe the rest', () => {
    seedOldApp({ traits: [trait({ score: 77 })], log: [{ trait: 'Discipline', score: 4, delta: 1, date: TODAY }] });
    localStorage.setItem('lu_streak', '{not json');
    const { data } = loadInitialState(TODAY);
    expect(data.traits[0].score).toBe(77);
    expect(data.log).toHaveLength(1);
    expect(data.streak).toEqual({ count: 0, lastDate: null, best: 0 });
  });

  test('normalizeData drops junk instead of crashing', () => {
    const clean = normalizeData({
      traits: [
        trait({ score: 250 }), trait(), null, { id: 'x' },
        trait({ id: 'odd', name: '  Odd  ', category: 'Nope', score: 'abc' }),
      ],
      focus: ['discipline', 'discipline', 'ghost', 'odd'],
      log: [{ trait: 'Discipline', delta: 1, date: 'yesterday' }, { trait: 'Discipline', score: 4, delta: 1, date: TODAY }, 'nope'],
      streak: { count: 'many', lastDate: 42 },
      powerups: [{ date: TODAY, title: 'Only a title' }],
    }, TODAY);

    expect(clean.traits).toEqual([
      trait({ score: 100 }),
      { id: 'odd', name: 'Odd', category: 'Core', score: 50, lastReviewed: null },
    ]);
    expect(clean.focus).toEqual(['discipline', 'odd']);
    expect(clean.log).toHaveLength(1);
    expect(clean.streak).toEqual({ count: 0, lastDate: null, best: 0 });
    expect(clean.powerups).toEqual([]);
    expect(normalizeData(null, TODAY).traits).toEqual(DEFAULT_TRAITS);
  });

  test('backup files round-trip, and other files are refused', () => {
    const data = applyReview({ ...emptyData(), focus: ['discipline'] }, { discipline: 4 }, TODAY);
    const file = JSON.stringify({ app: 'levelup', schema: 2, exportedAt: 'now', data: toCloudPayload(data) });
    const restored = parseBackupFile(file, TODAY);
    expect(restored.traits[0].score).toBe(51);
    expect(restored.log).toEqual(data.log);

    expect(() => parseBackupFile('hello', TODAY)).toThrow(/isn't a LevelUp backup/);
    expect(() => parseBackupFile('{"traits":[]}', TODAY)).toThrow(/isn't a LevelUp backup/);
  });
});

// ─── Powerups ─────────────────────────────────────────────────────────────────
describe('powerups', () => {
  test('every built-in trait has at least three complete lessons', () => {
    const ids = new Set();
    DEFAULT_TRAITS.forEach(t => {
      const lessons = TRAIT_LESSONS[t.id];
      expect(lessons.length).toBeGreaterThanOrEqual(3);
      lessons.forEach(lesson => {
        expect(ids.has(lesson.id)).toBe(false);
        ids.add(lesson.id);
        expect(lesson.title.length).toBeGreaterThanOrEqual(5);
        ['lesson', 'action', 'reflection'].forEach(key => expect(lesson[key].length).toBeGreaterThan(30));
      });
    });
  });

  test('targets the lowest trait first', () => {
    const lowest = rankPowerupTraits(DEFAULT_TRAITS, []);
    expect(lowest.map(t => t.id)).toEqual(['financial', 'patience', 'emotional', 'discipline', 'consistency']);
    const powerup = buildLibraryPowerup(DEFAULT_TRAITS, [], TODAY);
    expect(powerup).toMatchObject({ date: TODAY, traitId: 'financial', source: 'library', done: false, swap: 0 });
    expect(powerup.title).toBe(TRAIT_LESSONS.financial[0].title);
  });

  test('rotates through the lowest traits day by day instead of repeating one', () => {
    let powerups = [];
    const seen = [];
    for (let day = 0; day < 5; day++) {
      const date = addDays(TODAY, day);
      const entry = buildLibraryPowerup(DEFAULT_TRAITS, powerups, date);
      seen.push(entry.traitId);
      powerups = [entry, ...powerups];
    }
    expect(new Set(seen).size).toBe(5);

    // Day 6 comes back to the first trait with a lesson it hasn't shown yet.
    const sixth = buildLibraryPowerup(DEFAULT_TRAITS, powerups, addDays(TODAY, 5));
    expect(sixth.traitId).toBe(seen[0]);
    expect(sixth.title).toBe(TRAIT_LESSONS[seen[0]][1].title);
  });

  test('"New lesson" moves to the next trait in line', () => {
    expect(buildLibraryPowerup(DEFAULT_TRAITS, [], TODAY, 1)).toMatchObject({ traitId: 'patience', swap: 1 });
    expect(buildLibraryPowerup(DEFAULT_TRAITS, [], TODAY, 5).title).toBe(TRAIT_LESSONS.financial[1].title);
  });

  test('custom traits get a category lesson with their name filled in', () => {
    const traits = [trait({ id: 'cooking_1', name: 'Cooking', category: 'Skills', score: 10 })];
    const powerup = buildLibraryPowerup(traits, [], TODAY);
    expect(powerup.traitName).toBe('Cooking');
    expect(powerup.lesson).toContain('Cooking');
    expect(powerup.lesson + powerup.action + powerup.reflection).not.toContain('{trait}');
  });

  test('ensureTodayPowerup adds one lesson per day and leaves an existing one alone', () => {
    const first = ensureTodayPowerup(emptyData(), TODAY);
    expect(first.powerups).toHaveLength(1);
    expect(ensureTodayPowerup(first, TODAY)).toBe(first);
    expect(ensureTodayPowerup(first, addDays(TODAY, 1)).powerups).toHaveLength(2);
  });
});

// ─── Cloud sync decisions ─────────────────────────────────────────────────────
describe('sync decisions', () => {
  const userId = 'user-1';
  const reviewed = applyReview({ ...emptyData(), focus: ['discipline'] }, { discipline: 4 }, TODAY);
  const local = { ...reviewed, updatedAt: '2026-11-15T20:00:00.000Z' };
  const linked = { cloud: { userId, remoteUpdatedAt: 'v1', dataUpdatedAt: local.updatedAt } };
  const remoteOf = (data, version = 'v1') => ({ data: toCloudPayload(data), updated_at: version });

  test('nothing in the account yet: upload this device', () => {
    expect(decideSync({ data: local, meta: { cloud: null }, remote: null, userId })).toEqual({ action: 'push' });
  });

  test('new device with no progress: take the account data', () => {
    const fresh = ensureTodayPowerup(emptyData(), TODAY);
    expect(isPristine(fresh)).toBe(true);
    expect(decideSync({ data: fresh, meta: { cloud: null }, remote: remoteOf(local), userId })).toEqual({ action: 'pull' });
  });

  test('device and account both have different progress: ask the user', () => {
    const other = { ...applyReview({ ...emptyData(), focus: ['patience'] }, { patience: 5 }, TODAY), updatedAt: 'x' };
    expect(isPristine(local)).toBe(false);
    expect(decideSync({ data: local, meta: { cloud: null }, remote: remoteOf(other), userId })).toEqual({ action: 'ask' });
    // Linked to a different account counts as not linked.
    const elsewhere = { cloud: { userId: 'someone-else', remoteUpdatedAt: 'v1', dataUpdatedAt: local.updatedAt } };
    expect(decideSync({ data: local, meta: elsewhere, remote: remoteOf(other), userId })).toEqual({ action: 'ask' });
  });

  test('device and account already match: just link them', () => {
    expect(decideSync({ data: local, meta: { cloud: null }, remote: remoteOf({ ...local, updatedAt: 'other' }), userId }))
      .toEqual({ action: 'link' });
  });

  test('once linked: push local edits, pull remote edits, otherwise do nothing', () => {
    expect(decideSync({ data: local, meta: linked, remote: remoteOf(local), userId })).toEqual({ action: 'noop' });

    const edited = { ...local, updatedAt: '2026-11-15T21:00:00.000Z' };
    expect(decideSync({ data: edited, meta: linked, remote: remoteOf(local), userId })).toEqual({ action: 'push' });

    expect(decideSync({ data: local, meta: linked, remote: remoteOf(local, 'v2'), userId })).toEqual({ action: 'pull' });
  });

  test('both changed since the last sync: the most recent edit wins', () => {
    const mine = { ...local, updatedAt: '2026-11-15T21:00:00.000Z' };
    const theirsNewer = remoteOf({ ...local, updatedAt: '2026-11-15T22:00:00.000Z' }, 'v2');
    const theirsOlder = remoteOf({ ...local, updatedAt: '2026-11-15T20:30:00.000Z' }, 'v2');
    expect(decideSync({ data: mine, meta: linked, remote: theirsNewer, userId })).toEqual({ action: 'pull', discardsLocal: true });
    expect(decideSync({ data: mine, meta: linked, remote: theirsOlder, userId })).toEqual({ action: 'push' });
  });
});

// ─── The app itself ───────────────────────────────────────────────────────────
describe('app', () => {
  const stored = key => JSON.parse(localStorage.getItem(key));
  const card = name => screen.getByRole('button', { name: new RegExp(`^${name}`), pressed: false });
  const tab = name => within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(name) });

  test('shows the header and every default trait', () => {
    render(<App />);
    expect(screen.getByText('LevelUp')).toBeInTheDocument();
    expect(screen.getByText(/Developing · 52% Functionality/)).toBeInTheDocument();
    DEFAULT_TRAITS.forEach(t => expect(screen.getByText(t.name)).toBeInTheDocument());
  });

  test('a full review: pick focus traits, score them, see them in the log', () => {
    render(<App />);
    userEvent.click(card('Discipline'));
    userEvent.click(card('Patience'));
    userEvent.click(screen.getByRole('button', { name: /Review 2 traits/ }));

    const commit = screen.getByRole('button', { name: 'Commit Review' });
    expect(commit).toBeDisabled();
    userEvent.click(screen.getByRole('button', { name: 'Discipline: 5, Strong Growth' }));
    userEvent.click(screen.getByRole('button', { name: 'Patience: 2, Poor Effort' }));
    expect(commit).toBeEnabled();
    userEvent.click(commit);

    // Lands on the log with today's entries open.
    expect(screen.getByText('Progress Log')).toBeInTheDocument();
    expect(screen.getByText('2 total reviews')).toBeInTheDocument();
    expect(screen.getByText('Strong Growth')).toBeInTheDocument();
    expect(screen.getByText('🔥 1')).toBeInTheDocument();

    const today = todayStr();
    expect(stored('lu_log')).toEqual([
      { trait: 'Discipline', traitId: 'discipline', score: 5, delta: 2, date: today },
      { trait: 'Patience', traitId: 'patience', score: 2, delta: -1, date: today },
    ]);
    expect(stored('lu_streak')).toEqual({ count: 1, lastDate: today, best: 1 });
    expect(stored('lu_focus')).toEqual([]);
    expect(stored('lu_traits').find(t => t.id === 'discipline')).toMatchObject({ score: 52, lastReviewed: today });
  });

  test('only three focus traits at a time', () => {
    render(<App />);
    ['Discipline', 'Consistency', 'Accountability', 'Vision'].forEach(name => userEvent.click(card(name)));
    expect(screen.getByText('Max 3 focus traits')).toBeInTheDocument();
    expect(stored('lu_focus')).toEqual(['discipline', 'consistency', 'accountability']);
  });

  test('data survives closing and reopening the app', () => {
    const first = render(<App />);
    userEvent.click(card('Discipline'));
    first.unmount();

    render(<App />);
    expect(screen.getByRole('button', { name: /^Discipline/, pressed: true })).toBeInTheDocument();
  });

  test('Powerup tab shows a lesson for the lowest trait and can be marked done', () => {
    render(<App />);
    userEvent.click(tab('Powerup'));

    expect(screen.getByText("Today's Powerup")).toBeInTheDocument();
    expect(screen.getByText('Financial Intelligence · 40')).toBeInTheDocument();
    expect(screen.getByText(TRAIT_LESSONS.financial[0].title)).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: 'New lesson' }));
    expect(screen.getByText('Patience · 45')).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: 'I did it' }));
    expect(screen.getByText('Done for today')).toBeInTheDocument();
    expect(stored('lu_powerups')[0]).toMatchObject({ traitId: 'patience', done: true, date: todayStr() });

    userEvent.click(screen.getByRole('button', { name: "Add Patience to today's review" }));
    expect(stored('lu_focus')).toEqual(['patience']);
  });

  test('a custom trait can be added and removed', () => {
    render(<App />);
    userEvent.click(screen.getByRole('button', { name: '+ Add New Trait' }));
    userEvent.type(screen.getByLabelText('Name'), 'Mindfulness');
    userEvent.click(screen.getByRole('button', { name: 'Add Trait' }));
    expect(screen.getByText('Mindfulness')).toBeInTheDocument();
    expect(stored('lu_traits')).toHaveLength(DEFAULT_TRAITS.length + 1);

    userEvent.click(screen.getByRole('button', { name: 'Details for Mindfulness' }));
    userEvent.click(screen.getByRole('button', { name: 'Remove this trait' }));
    userEvent.click(screen.getByRole('button', { name: 'Tap again to remove this trait' }));
    expect(screen.queryByText('Mindfulness')).not.toBeInTheDocument();
    expect(stored('lu_traits')).toHaveLength(DEFAULT_TRAITS.length);

    // Built-in traits can't be removed.
    userEvent.click(screen.getByRole('button', { name: 'Details for Discipline' }));
    expect(screen.queryByRole('button', { name: 'Remove this trait' })).not.toBeInTheDocument();
  });

  test('theme choice is applied and remembered', () => {
    render(<App />);
    userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(stored('lu_settings').theme).toBe('dark');

    userEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  test('reset keeps a safety copy that can be restored', () => {
    render(<App />);
    userEvent.click(card('Discipline'));
    userEvent.click(screen.getByRole('button', { name: /Review 1 trait/ }));
    userEvent.click(screen.getByRole('button', { name: 'Discipline: 4, Improved' }));
    userEvent.click(screen.getByRole('button', { name: 'Commit Review' }));

    userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    userEvent.click(within(screen.getByRole('dialog', { name: 'Reset everything' })).getByRole('button', { name: 'Reset' }));
    expect(stored('lu_log')).toEqual([]);
    expect(stored('lu_traits')).toEqual(DEFAULT_TRAITS);
    expect(stored('lu_backup').reason).toBe('reset');

    userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(stored('lu_log')).toHaveLength(1);
    expect(stored('lu_traits').find(t => t.id === 'discipline').score).toBe(51);
  });

  test('offers to restore points the old decay bug took, once', () => {
    const lastReviewed = addDays(todayStr(), -30);
    seedOldApp({
      traits: DEFAULT_TRAITS.map(t => (t.id === 'discipline' ? { ...t, score: 30, lastReviewed } : t)),
      log: [{ trait: 'Discipline', score: 4, delta: 1, date: lastReviewed }],
      streak: { count: 1, lastDate: lastReviewed },
    });

    const first = render(<App />);
    const dialog = screen.getByRole('dialog', { name: 'Restore lost points' });
    expect(within(dialog).getByText('Restore 17 lost points?')).toBeInTheDocument();
    userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    expect(stored('lu_traits').find(t => t.id === 'discipline').score).toBe(47);
    expect(stored('lu_backup').reason).toBe('repair');
    first.unmount();

    render(<App />);
    expect(screen.queryByRole('dialog', { name: 'Restore lost points' })).not.toBeInTheDocument();
  });

  test('cloud features stay out of the way until a Supabase project is configured', () => {
    render(<App />);
    userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText(/Cloud sync isn't connected yet/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });
});
