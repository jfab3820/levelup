// Built-in Powerup lessons. This file is content only — all logic lives in App.js.
//
// Every lesson has: id, title, lesson (the idea), action (one thing to do today,
// under 10 minutes), reflection (a question for tonight's review).
//
// TRAIT_LESSONS is keyed by the default trait ids from DEFAULT_TRAITS.
// CATEGORY_LESSONS covers custom traits; "{trait}" is replaced with the trait's name.

export const TRAIT_LESSONS = {
  // ─── Core ───────────────────────────────────────────────────────────────────
  discipline: [
    {
      id: "discipline-1",
      title: "Decide Once, Not Daily",
      lesson:
        "Discipline usually breaks at the moment of decision, not the moment of effort. Every time you ask \"should I do it now?\" you hand a tired brain a vote. Take the vote away. Pick the exact time and place for one hard thing and treat it like a shift at work: you don't decide whether to show up, you just show up. People who plan \"when X happens, I will do Y\" follow through far more often than people who wait to feel ready.",
      action:
        "Write one if-then rule for tomorrow: \"When [specific trigger], I will [specific action].\" Put it where you'll see it.",
      reflection: "Where did I renegotiate with myself today, and what rule would have ended the negotiation?",
    },
    {
      id: "discipline-2",
      title: "Shrink the Start",
      lesson:
        "Resistance is strongest right before you begin and drops fast once you're moving. So stop trying to win the whole task in your head. Commit only to the first two minutes: open the file, put on the shoes, write one sentence. You're allowed to stop after that. Most of the time you won't, because starting was the hard part. Discipline is less about forcing yourself through an hour and more about making the first step too small to refuse.",
      action: "Pick the task you've been putting off. Set a 2-minute timer and do only the very first step.",
      reflection: "What did I avoid starting today, and what would its two-minute version have been?",
    },
    {
      id: "discipline-3",
      title: "Design Beats Willpower",
      lesson:
        "People with strong self-control aren't fighting temptation all day. They arrange their lives so they run into less of it. Willpower is a backup system; your environment is the main one. Put friction in front of what pulls you off course and remove friction from what you want to do. Twenty extra seconds of hassle is often enough to break an automatic bad habit, and twenty fewer seconds is enough to start a good one.",
      action:
        "Add 20 seconds of friction to one temptation right now: log out, delete the shortcut, or move it to another room.",
      reflection: "What in my surroundings made the right choice harder today?",
    },
  ],
  consistency: [
    {
      id: "consistency-1",
      title: "Never Miss Twice",
      lesson:
        "Missing once is an accident. Missing twice is the start of a new habit. Everyone slips, and one skipped day changes almost nothing. What matters is how fast you get back. The people who stay consistent for years aren't the ones who never fall off. They're the ones who refuse to let one miss turn into two. Don't aim for a perfect record. Aim for a short gap.",
      action: "Name the habit you most recently skipped. Do a small version of it today, even five minutes.",
      reflection: "When I slip, how long does it usually take me to get back, and what would shorten that?",
    },
    {
      id: "consistency-2",
      title: "Set a Bad-Day Minimum",
      lesson:
        "Consistency is built by what you do on your worst days, not your best ones. If your habit only works when you have energy and time, it will break the first hard week. Give every habit a floor: a version so small you can do it sick, tired, or busy. One push-up. One page. One line on the list. The floor keeps the chain alive, and keeping the chain alive is the whole game.",
      action: "Choose one habit and write down its bad-day minimum: the smallest version that still counts.",
      reflection: "Did I do at least the minimum today? If not, was the minimum still too big?",
    },
    {
      id: "consistency-3",
      title: "Attach It to an Anchor",
      lesson:
        "New habits fail when they float. \"I'll do it sometime today\" means it competes with everything else. Habits that stick are tied to something you already do without thinking: after I pour my coffee, after I park the car, after I brush my teeth. The old habit becomes the trigger for the new one, so you don't have to remember or decide. Same cue, same place, same order, every day.",
      action: "Finish this sentence and say it out loud: \"After I [thing I already do daily], I will [new habit].\"",
      reflection: "Which of my habits has a clear trigger, and which ones am I leaving to chance?",
    },
  ],
  accountability: [
    {
      id: "accountability-1",
      title: "Find Your Part",
      lesson:
        "When something goes wrong there are usually two true stories: what happened to you, and what you could have done differently. The first one may be completely fair, but it gives you nothing to work with. The second one hands you control. Accountability isn't blaming yourself for everything. It's looking for the piece that was yours, because that's the only piece you can change next time.",
      action:
        "Pick one thing that went wrong this week. Write one sentence starting \"My part in this was...\" and one starting \"Next time I will...\"",
      reflection: "Where did I reach for an explanation today when I could have reached for my part?",
    },
    {
      id: "accountability-2",
      title: "Close Every Loop",
      lesson:
        "Trust is built on a simple ratio: promises kept over promises made. Most people damage it not by lying but by letting small commitments quietly expire. \"I'll look into it.\" \"I'll call you back.\" Each one left hanging teaches people, and you, that your word is soft. The fix is to make fewer promises and close every one: do it, schedule it, or go back and honestly renegotiate it.",
      action:
        "List every open promise you can think of, to others and to yourself. Pick one and finish it, schedule it, or renegotiate it today.",
      reflection: "What did I say I would do today that is still open?",
    },
    {
      id: "accountability-3",
      title: "Write It Where You Can See It",
      lesson:
        "A commitment that lives only in your head is easy to bend. A commitment on paper is a contract. Writing down what you intend to do, and checking it off when it's done, turns vague intention into a record you can't argue with. It also shows you the truth about your days: what you actually did versus what you meant to do. That gap is where the growth is.",
      action: "Before bed, write tomorrow's three must-dos by hand. Tomorrow, check them off as you finish.",
      reflection: "How did what I planned compare with what I actually did today?",
    },
  ],
  vision: [
    {
      id: "vision-1",
      title: "Picture an Ordinary Tuesday",
      lesson:
        "Big goals stay fuzzy because we picture highlights: the win, the title, the number. A sharper test is the ordinary day. Where do you wake up three years from now? What work fills the morning? Who's around? What's missing that's here today? A clear ordinary day gives you something to aim at and something to measure today against. If you can't describe it, you can't walk toward it.",
      action: "Write five sentences describing a normal weekday three years from now, from waking up to going to bed.",
      reflection: "Did anything I did today belong in that future day?",
    },
    {
      id: "vision-2",
      title: "One Thing This Year",
      lesson:
        "A list of ten goals is really a list of zero, because nothing on it gets your full weight. Vision works by subtraction. Among everything you want, there is usually one change that would make the others easier or unnecessary: a skill, a certificate, a debt gone, a habit locked in. Name it, and you know what to protect when the week gets crowded.",
      action:
        "Complete this sentence in writing: \"If only one thing changes in the next 12 months, it has to be ___.\" Then write the next small step.",
      reflection: "How much of today went toward my one thing?",
    },
    {
      id: "vision-3",
      title: "Link Today to the Long Road",
      lesson:
        "Vision without a daily link is a daydream. The link is simple: every day, one task that the future version of you will be glad you did. Not ten. One. Do it early, before the day's noise takes over. A year of single daily steps is 365 steps, which is further than most people travel on any goal.",
      action: "Look at today's list and star the one item future-you will care about most. Do it first.",
      reflection: "What was today's one step toward the long-term picture? If there wasn't one, what crowded it out?",
    },
  ],

  // ─── Character ──────────────────────────────────────────────────────────────
  integrity: [
    {
      id: "integrity-1",
      title: "Small Promises Count Most",
      lesson:
        "Integrity isn't proven in dramatic moments. It's built in the small ones nobody is checking: showing up on time, returning what you borrowed, doing the thing you mentioned in passing. Each kept promise is a small deposit in how much people trust you, and in how much you trust yourself. That second account matters more than it sounds. It's hard to believe in your own big plans if you routinely break your small ones.",
      action: "Find one small thing you said you'd do and haven't. Do it today, without announcing it.",
      reflection: "Which small promise did I keep today that nobody would have noticed if I hadn't?",
    },
    {
      id: "integrity-2",
      title: "The Same Person in Every Room",
      lesson:
        "The word integrity comes from the same root as \"integrated\": whole, undivided. It means the person you are at work, at home, online, and alone is one person. Every time you adjust the truth to fit the room, you create a second version of yourself to keep track of. That's tiring, and people sense it. Being the same everywhere is simpler and it's what makes you believable.",
      action: "Notice one moment today when you're tempted to shade the truth to look better. Say the plain version instead.",
      reflection: "Was there a room today where I acted like someone I'm not?",
    },
    {
      id: "integrity-3",
      title: "Tell the Truth Faster",
      lesson:
        "Uncomfortable truths get more expensive with time. A mistake admitted today is a small conversation. The same mistake discovered next month is a breach of trust. Most dishonesty isn't a lie, it's a delay: waiting for a better moment that never comes. Shortening the time between knowing something and saying it is one of the most practical ways to build integrity.",
      action: "Name one thing you've been putting off telling someone. Tell them today, or set the exact time you will.",
      reflection: "What am I currently sitting on that someone else deserves to know?",
    },
  ],
  humility: [
    {
      id: "humility-1",
      title: "Ask What You're Missing",
      lesson:
        "Humility isn't thinking less of yourself. It's caring more about what's true than about being right. The fastest way to practice it is to assume, in any disagreement, that the other person knows something you don't, and go looking for it. You don't have to agree in the end. But you'll usually find a piece you hadn't considered, and people can tell when they've actually been heard.",
      action: "In one conversation today, ask \"What am I missing here?\" and listen to the whole answer without defending yourself.",
      reflection: "Whose view did I dismiss too quickly today?",
    },
    {
      id: "humility-2",
      title: "Borrow Someone Else's Eyes",
      lesson:
        "You can't see your own blind spots. That's what makes them blind spots. Other people can see them clearly, but most won't say anything unless you ask, and ask in a way that makes it safe to answer. One specific question beats a general one: not \"any feedback?\" but \"what's one thing I could do better?\" Then the hard part: don't explain, don't defend. Just say thank you.",
      action:
        "Ask one person you trust: \"What's one thing I could do better?\" Whatever they say, your only reply is \"thank you.\"",
      reflection: "What feedback have I heard more than once and still not acted on?",
    },
    {
      id: "humility-3",
      title: "Give the Credit Away",
      lesson:
        "Almost nothing you've done was done alone. Someone taught you, covered for you, gave you a chance, or simply put up with you while you figured it out. Humble people notice this and say so, out loud and by name. It costs nothing, it's true, and it changes how people feel about working with you. Taking the blame and sharing the credit is the pattern to copy.",
      action: "Tell one person today, specifically, what they did that helped you and what difference it made.",
      reflection: "Who helped me get where I am this week, and do they know it?",
    },
  ],
  courage: [
    {
      id: "courage-1",
      title: "Do It Scared",
      lesson:
        "Courage isn't the absence of fear. It's moving while the fear is still there. Waiting until you feel ready rarely works, because avoidance makes fear grow: every time you dodge something, your brain files it as dangerous. Facing it, even in a small way, teaches the opposite. The feeling usually peaks just before you act and fades once you're in it.",
      action:
        "Choose one thing you've been avoiding because it's uncomfortable: a call, an ask, a conversation. Take the first step within the next hour.",
      reflection: "What did I avoid today because of how it would feel rather than what it would cost?",
    },
    {
      id: "courage-2",
      title: "Name the Worst Case",
      lesson:
        "Vague fear is the strongest kind. As long as the bad outcome stays blurry, your mind fills it in with disaster. Writing it down shrinks it. What exactly is the worst realistic result? How likely is it? What could you do to prevent it, and how would you recover if it happened anyway? Most fears, once spelled out, turn out to be survivable and often temporary.",
      action:
        "Take one decision you're afraid of. Write three lines: the realistic worst case, how you'd prevent it, how you'd recover.",
      reflection: "Which of my fears have I never actually put into words?",
    },
    {
      id: "courage-3",
      title: "Ask Anyway",
      lesson:
        "A lot of what people want stays out of reach for one reason: they never asked. Fear of hearing \"no\" feels like protection, but a \"no\" leaves you exactly where you already are. The only real loss is the chance you didn't take. Asking is a muscle. The more often you hear \"no\" and survive it, the less it controls you, and the more often you'll be surprised by a \"yes.\"",
      action: "Make one ask today where \"no\" is a real possibility: a discount, some feedback, a favor, an introduction.",
      reflection: "What did I want today that I talked myself out of asking for?",
    },
  ],
  patience: [
    {
      id: "patience-1",
      title: "Widen the Gap",
      lesson:
        "Between what happens and what you do about it there is a gap. For most people it lasts a fraction of a second. Patience is the skill of making it longer. One slow breath is enough to let the thinking part of your brain catch up with the reacting part. You don't have to feel calm. You only have to wait a few seconds before you speak, type, or hit the horn.",
      action:
        "Pick one irritation you can predict today: traffic, a slow line, a certain person. When it comes, take three slow breaths before you do anything.",
      reflection: "Where did I react today before I'd had time to choose?",
    },
    {
      id: "patience-2",
      title: "Results Run Late",
      lesson:
        "Effort and results almost never show up at the same time. You do the work for weeks and the scoreboard barely moves, then it moves all at once. Most people quit in that quiet stretch, right before it would have paid off. Patience here isn't waiting around. It's continuing to do the work while the evidence is still thin, trusting the process you chose when you were thinking clearly.",
      action:
        "Pick one area where slow progress frustrates you. Write what it will look like in 12 months if you simply don't stop.",
      reflection: "What am I tempted to quit that just needs more time?",
    },
    {
      id: "patience-3",
      title: "Assume There's a Reason",
      lesson:
        "When we're slow or short with someone, we know why: bad night, hard news, a lot on our mind. When someone else does it, we tend to decide it's who they are. That habit makes us impatient with nearly everyone. Flip it. Assume there's a reason you can't see. You'll be right more often than not, and even when you're wrong you've spared yourself the anger.",
      action:
        "The next time someone frustrates you today, silently finish this sentence before responding: \"Maybe they're dealing with ___.\"",
      reflection: "Who did I judge quickly today, and what might I not know about their day?",
    },
  ],
  gratitude: [
    {
      id: "gratitude-1",
      title: "Three Specific Things",
      lesson:
        "The mind is built to notice problems first. That bias kept our ancestors alive, but it also means good things slide by unrecorded unless you catch them on purpose. Writing down a few specific things you're grateful for trains your attention to look for them, and people who do it regularly tend to report feeling better about their lives. The key word is specific: not \"my family,\" but what one person did today.",
      action: "Write three good things from the last 24 hours, and next to each one, why it happened.",
      reflection: "What good thing almost went unnoticed today?",
    },
    {
      id: "gratitude-2",
      title: "Say It to Them",
      lesson:
        "Feeling grateful and expressing it are two different things, and the second is where most of the value is. People consistently underestimate how much a sincere thank-you means to the person receiving it, and overestimate how awkward it will be. A short, specific message can change someone's day and strengthens the relationship on both ends. Name what they did and what it meant to you.",
      action: "Send one message today thanking someone for something specific they did, and tell them what difference it made.",
      reflection: "Who has helped me recently without hearing a real thank-you?",
    },
    {
      id: "gratitude-3",
      title: "Imagine It Gone",
      lesson:
        "We stop seeing what's always there. The car that starts, the person who answers the phone, a body that works well enough to get through the day. One way to see them again is to picture life without one of them, in detail, for a minute. It sounds dark, but it does the opposite: the ordinary thing comes back into focus as something you're lucky to have.",
      action:
        "Pick one thing you rely on every day: a person, your health, your car. Spend one full minute imagining today without it.",
      reflection: "What am I treating as guaranteed that isn't?",
    },
  ],

  // ─── Mind ───────────────────────────────────────────────────────────────────
  emotional: [
    {
      id: "emotional-1",
      title: "Name It to Tame It",
      lesson:
        "Putting a feeling into words takes some of the heat out of it. Research on labeling emotions suggests that naming what you feel engages the thinking parts of the brain and quiets the alarm. The more precise the word, the better it works. \"Bad\" doesn't help much. \"Embarrassed,\" \"left out,\" or \"worried about money\" gives you something you can actually deal with.",
      action:
        "Three times today, stop and name what you're feeling in one precise word. \"Irritated,\" not \"bad.\"",
      reflection: "What was the strongest feeling I had today, and what was underneath it?",
    },
    {
      id: "emotional-2",
      title: "Ride the Wave",
      lesson:
        "A strong emotion rises, peaks, and falls on its own if you don't feed it. What keeps it going is what you do at the top: firing off the text, replaying the argument, making the decision. Emotional control isn't about feeling less. It's about not acting at the peak. Put time between the feeling and the action and you'll usually be dealing with a smaller feeling.",
      action:
        "Set a personal rule for today: when a strong emotion hits, no texts, no replies, and no decisions for ten minutes.",
      reflection: "Did I act at the peak of an emotion today? What would ten minutes have changed?",
    },
    {
      id: "emotional-3",
      title: "Check the Story",
      lesson:
        "Feelings don't come straight from events. They come from the story you tell about the event. \"He didn't text back\" is a fact. \"He doesn't respect me\" is a story, and it's the story that hurts. Separating the two gives you room. Ask what else the same facts could mean. You're not pretending things are fine. You're checking whether your first interpretation is the only one.",
      action:
        "Take one thing that upset you recently. Write the bare facts in one line, your story about it in a second, and one other possible story in a third.",
      reflection: "Which of today's reactions came from a fact, and which came from a story?",
    },
  ],
  focus: [
    {
      id: "focus-1",
      title: "One Thing, One Block",
      lesson:
        "Multitasking is really rapid switching, and every switch costs you. Part of your attention stays stuck on the last thing while you start the next, so you do both worse and both slower. Focus is a simple arrangement: one task, a fixed block of time, and nothing else within reach. Twenty-five undivided minutes will often beat two distracted hours.",
      action: "Set a 25-minute timer. Put your phone in another room. Work on one task until the timer ends.",
      reflection: "How many times did I switch tasks today without finishing what I was on?",
    },
    {
      id: "focus-2",
      title: "Empty Your Head First",
      lesson:
        "Unfinished tasks keep running in the background of your mind, pulling at your attention while you try to work on something else. You don't have to finish them to quiet them. Writing them down is often enough, because your brain stops rehearsing what it trusts is recorded. A cluttered head can't focus. A written list can hold the clutter for you.",
      action:
        "Before your next block of work, spend three minutes writing down every open loop in your head. Then pick one and start.",
      reflection: "What was nagging at me today that I never wrote down?",
    },
    {
      id: "focus-3",
      title: "Spend Your Best Hours Well",
      lesson:
        "Your ability to concentrate isn't flat across the day. Most people have a window of a few hours when they're sharpest, and they tend to spend it on email, errands, and other people's requests. Find your window and guard it. Put your hardest, most important work there and push the easy stuff to the low-energy hours, where it belongs.",
      action: "Notice when you feel sharpest today. Block that same hour tomorrow for your single hardest task.",
      reflection: "What did I spend my best hour on today?",
    },
  ],
  reasoning: [
    {
      id: "reasoning-1",
      title: "Hunt for the Other Side",
      lesson:
        "Once we believe something, we notice everything that supports it and skim past whatever doesn't. This is confirmation bias and nobody is immune, including smart people, who are just better at defending what they already think. The fix is to go looking for the strongest case against your own view. If your belief survives, you hold it for better reasons. If it doesn't, you just got smarter.",
      action: "Pick one belief you hold strongly. Spend five minutes finding the best argument against it.",
      reflection: "What did I accept today because it matched what I already believed?",
    },
    {
      id: "reasoning-2",
      title: "Think in Percentages",
      lesson:
        "\"It'll work\" and \"it won't\" are both usually wrong, because most things are uncertain. Good thinkers put a rough number on it: 70% likely, 30% likely. A number forces you to admit what you don't know, lets you plan for the other outcome, and, most usefully, lets you check yourself later. Over time you learn whether your 70% really happens about seven times in ten.",
      action:
        "Make one prediction today with a percentage attached, like \"70% chance this takes under an hour.\" Check it tonight.",
      reflection: "Where was I overconfident today, and what did I miss?",
    },
    {
      id: "reasoning-3",
      title: "Ask \"And Then What?\"",
      lesson:
        "Most bad decisions look fine at the first step. The cost shows up at the second or third. Skipping the workout saves an hour; then what? Taking the loan fixes this month; then what? Asking \"and then what?\" a few times in a row moves you past the immediate result to the consequences that actually matter. It takes thirty seconds and catches a lot of mistakes.",
      action: "Take one decision you're facing today. Ask \"and then what?\" three times in a row and write down each answer.",
      reflection: "Which choice today did I judge only by its first result?",
    },
  ],
  learning: [
    {
      id: "learning-1",
      title: "Test Yourself Instead of Re-reading",
      lesson:
        "Re-reading and highlighting feel productive because the material looks familiar. Familiar isn't the same as learned. What builds memory is pulling information out of your head, not putting it back in. Closing the book and trying to recall what you just covered is harder and less pleasant, which is exactly why it works. Struggling to remember is the learning.",
      action:
        "After you learn something today, close it. Write everything you can recall for two minutes, then check what you missed.",
      reflection: "What did I study today that I couldn't explain right now without looking?",
    },
    {
      id: "learning-2",
      title: "Space It Out",
      lesson:
        "Cramming works for tomorrow and fails for next month. Memory strengthens when you come back to something after you've started to forget it. Several short reviews spread over days beat one long session, even when the total time is the same. The forgetting in between isn't failure. It's what makes the next review stick.",
      action: "Pick one thing you learned in the past week. Review it for five minutes now and schedule another look in three days.",
      reflection: "What have I learned recently that I haven't gone back to since?",
    },
    {
      id: "learning-3",
      title: "Teach It to Find the Gaps",
      lesson:
        "You don't really understand something until you can explain it in plain words. Trying to teach a concept, even to an empty room, shows you exactly where your understanding runs out: the spot where you reach for jargon or go vague. That spot is your next thing to study. Simple explanations aren't a sign of shallow knowledge. They're the proof of deep knowledge.",
      action:
        "Explain one concept you're learning out loud in everyday words, as if to a 12-year-old. Write down where you got stuck.",
      reflection: "What can I do but not yet explain?",
    },
  ],
  creativity: [
    {
      id: "creativity-1",
      title: "Quantity Before Quality",
      lesson:
        "Good ideas rarely arrive alone. They show up in a crowd of bad ones. People who produce the best ideas mostly produce the most ideas, and sort them afterward. The mistake is judging while you generate, which shuts the tap off. Separate the two jobs: first make a long, messy list with no filter, then go back and pick.",
      action: "Set a five-minute timer and write ten ideas for one problem you have. Bad ideas count toward the ten.",
      reflection: "Did I shut down an idea today before it had a chance to become a better one?",
    },
    {
      id: "creativity-2",
      title: "Combine Two Things",
      lesson:
        "Very little is invented from nothing. Most new ideas are old ideas connected in a way nobody had tried. That means creativity depends on what you have to connect, and on the habit of asking how unrelated things might fit. What you know from one job, hobby, or hard season of life is raw material for another. Your particular mix of experience is something nobody else has.",
      action: "Pick two unrelated things you know well. Write three ways they could be combined into something useful.",
      reflection: "What do I know from one part of my life that could solve a problem in another?",
    },
    {
      id: "creativity-3",
      title: "Add a Limit",
      lesson:
        "Unlimited options sound like freedom but usually produce nothing. A blank page with no rules is paralyzing. A tight constraint forces invention: no money, ten minutes, only what's already in the room. Limits push you off the obvious path and make you find a new one. When you're stuck, don't wait for more resources. Take some away.",
      action: "Take a problem you're stuck on and solve it under one limit: zero dollars, ten minutes, or only what's within reach.",
      reflection: "Where am I waiting for more time or money when a constraint might serve me better?",
    },
  ],

  // ─── Body ───────────────────────────────────────────────────────────────────
  health: [
    {
      id: "health-1",
      title: "Protect Your Sleep Window",
      lesson:
        "Sleep is the base that mood, focus, and self-control all sit on. When it's short or irregular, everything else gets harder and you blame your willpower. The most useful change for most people isn't a gadget or a supplement. It's going to bed and getting up at roughly the same times every day, and keeping screens out of the last half hour so your mind can wind down.",
      action:
        "Set a \"screens off\" alarm for 30 minutes before the bedtime that gives you a full night. Follow it tonight.",
      reflection: "How did last night's sleep show up in today's mood and patience?",
    },
    {
      id: "health-2",
      title: "Move Every Day, Even a Little",
      lesson:
        "The exercise that changes your health is the exercise you'll actually keep doing. A short brisk walk is easy to underrate, but it lifts mood, clears your head, and counts toward the regular activity health guidelines recommend. Doing a little every day beats doing a lot once in a while. Build the daily habit first. Intensity can come later.",
      action: "Take a brisk 10-minute walk today, outside if you can.",
      reflection: "How did my body feel today, and how much did I move it?",
    },
    {
      id: "health-3",
      title: "Make the Good Choice the Easy One",
      lesson:
        "Most of what you eat and drink is decided by what's closest, not by what you planned. If the good option takes effort and the poor one is within reach, the poor one wins by evening. Set it up in advance: water where you can see it, something decent already prepared, the junk out of sight or out of the house. You're not relying on discipline at 9 PM. You're making the decision earlier, when it's easy.",
      action: "Put a full water bottle where you'll see it all day, and prepare one healthy snack or meal for tomorrow.",
      reflection: "Which of today's food and drink choices were planned, and which just happened?",
    },
  ],

  // ─── Skills ─────────────────────────────────────────────────────────────────
  negotiation: [
    {
      id: "negotiation-1",
      title: "Know Your Walk-Away",
      lesson:
        "Your power in any negotiation comes from what you'll do if there's no deal. Negotiators call it your best alternative. If you haven't worked it out, you'll accept bad terms out of fear, or reject good ones out of pride. Before you ask for anything, know two things: your best option if the answer is no, and the point where no deal is better than this deal.",
      action:
        "For one upcoming ask (a price, a raise, a deadline), write your best alternative if they say no and the number where you'd walk away.",
      reflection: "In my last negotiation, did I know my walk-away point before I started?",
    },
    {
      id: "negotiation-2",
      title: "Ask, Then Stay Quiet",
      lesson:
        "The side that understands the other side better usually gets the better deal. What people say they want is their position. Why they want it is their interest, and interests are where deals get made. Ask open questions and then do the hard part: stop talking. Silence feels uncomfortable, so people fill it, often with exactly the information you needed.",
      action:
        "In your next back-and-forth, ask \"What matters most to you here?\" and let them finish completely before you speak.",
      reflection: "Did I learn something today about what the other person actually needed?",
    },
    {
      id: "negotiation-3",
      title: "Trade, Don't Give",
      lesson:
        "Giving something up for free doesn't earn goodwill. It teaches the other side to ask for more. Every concession should be a trade: if I do this, you do that. It keeps things fair, shows that what you're giving has value, and often surfaces a swap that's cheap for you and valuable for them. The phrase is simple and worth practicing until it's automatic.",
      action: "Use this sentence once today, even over something small: \"I can do that if you can ___.\"",
      reflection: "Did I give anything away today without asking for something back?",
    },
  ],
  communication: [
    {
      id: "communication-1",
      title: "Listen to Understand",
      lesson:
        "Most people listen while preparing their reply, which means they aren't really listening. The test of whether you understood someone is whether you can say their point back in a way they'd agree with. Do that before giving your own view. It catches misunderstandings early, cools down disagreements, and makes the other person far more willing to hear you in return.",
      action: "In one conversation today, say \"So what you're saying is...\" and get a yes before sharing your own view.",
      reflection: "Who did I talk over or half-listen to today?",
    },
    {
      id: "communication-2",
      title: "Lead With the Point",
      lesson:
        "People are busy and attention is short. If your main point comes at the end, after the background and the build-up, a lot of listeners never get there. Put the conclusion first: what you need or what you've decided. Then give the reasons for anyone who wants them. It feels blunt at first. To the person on the other end it feels like respect for their time.",
      action: "Before your next important message, write the main point in one sentence. Put that sentence first.",
      reflection: "Did anyone have to ask me \"so what do you need?\" today?",
    },
    {
      id: "communication-3",
      title: "Say Exactly What You Need",
      lesson:
        "Vague requests get vague results. \"Can you help with this sometime?\" leaves the other person guessing what, how much, and by when, and then you're frustrated when they guess wrong. A clear request names the specific thing, who it's for, and the deadline. Being clear isn't being demanding. It's doing the other person the favor of not making them read your mind.",
      action: "Rewrite one request you need to make so it states exactly what you need and by when. Then send it.",
      reflection: "Where did unclear words from me cause confusion today?",
    },
  ],
  financial: [
    {
      id: "financial-1",
      title: "Know Your Number",
      lesson:
        "You can't steer money you can't see. Most people have a rough idea of what they earn and almost no idea what they spend, and the gap between the guess and the truth is usually where the trouble is. You don't need a complicated budget to start. You need one honest number: what actually left your accounts last week, and where the biggest share went.",
      action:
        "Open your bank app and add up everything you spent in the last seven days. Write down the total and the biggest category.",
      reflection: "Did today's spending match what I say matters to me?",
    },
    {
      id: "financial-2",
      title: "Pay Yourself First",
      lesson:
        "If you save whatever is left at the end of the month, there's usually nothing left. Flip the order. Move money to savings the day you're paid, automatically, before you can spend it. The amount matters less than the habit. A small transfer that happens every payday without a decision beats a big plan that depends on remembering and feeling disciplined.",
      action:
        "Set up one automatic transfer to savings for your next payday, or raise an existing one by any amount.",
      reflection: "Is my saving automatic, or does it depend on what's left over?",
    },
    {
      id: "financial-3",
      title: "Know What Your Debt Costs",
      lesson:
        "Debt has a price, and the interest rate is the price tag. A balance at a high rate grows quietly every month you carry it, so paying only the minimum can keep you in place for years. Once you've covered every minimum, each extra dollar does the most good against the highest rate. You can't make that call until all your debts and their rates are in one list.",
      action: "List each debt you have with its balance and interest rate. Circle the highest rate.",
      reflection: "Do I know, right now, how much interest I paid last month?",
    },
  ],
  leadership: [
    {
      id: "leadership-1",
      title: "Go First",
      lesson:
        "People do what they see, not what they're told. Whatever standard you want from others, on time, prepared, honest about mistakes, the fastest way to set it is to meet it yourself where they can see. Leadership doesn't need a title. It starts the moment you do the right thing before anyone asks and without waiting to see whether anyone else will.",
      action: "Pick one standard you wish others kept. Visibly keep it yourself today, without commenting on it.",
      reflection: "What did people learn from watching me today?",
    },
    {
      id: "leadership-2",
      title: "Tell People What They're Good At",
      lesson:
        "Most people never hear a clear statement of what they do well. They hear what went wrong. A leader's job is to make others better, and one of the cheapest ways is to name a specific strength and the moment you saw it. Vague praise fades. \"You stayed calm when that customer got loud\" tells someone exactly what to keep doing.",
      action: "Tell one person today a specific strength you see in them and the moment you noticed it.",
      reflection: "Who around me is doing good work that nobody has acknowledged?",
    },
    {
      id: "leadership-3",
      title: "Decide and Explain",
      lesson:
        "An unmade decision is still a decision, and usually the worst one, because everyone waits. People can handle a call they disagree with much better than they handle not knowing. Gather what you reasonably can, choose, and then say plainly what you chose and why. The \"why\" is what earns trust, even from people who would have gone the other way.",
      action:
        "Make one decision you've been sitting on. Tell whoever it affects what you decided and why, in two sentences.",
      reflection: "What is waiting on a decision from me right now?",
    },
  ],

  // ─── Relationships ──────────────────────────────────────────────────────────
  family: [
    {
      id: "family-1",
      title: "Phone Down, Eyes Up",
      lesson:
        "Being in the room is not the same as being present. The people closest to you can tell the difference between your attention and your half-attention, and they notice which one they usually get. A phone on the table, even face down, splits it. Short stretches of full attention do more for a relationship than long stretches of being nearby.",
      action: "Spend 15 minutes with a family member today with your phone in another room.",
      reflection: "When someone in my family talked to me today, did they get all of me?",
    },
    {
      id: "family-2",
      title: "Ask a Better Question",
      lesson:
        "\"How was your day?\" gets \"fine,\" and both of you move on. You can live beside someone for years and stop learning anything new about them. Real questions change that: ones you don't already know the answer to, asked because you want to know. Then listen without fixing or correcting. Being curious about the people you love is a way of telling them they still matter to you.",
      action:
        "Ask one family member something you don't know the answer to, like \"What's been on your mind lately?\" Listen without offering a fix.",
      reflection: "What did I learn about someone in my family today?",
    },
    {
      id: "family-3",
      title: "Protect the Rituals",
      lesson:
        "Families are held together less by big occasions than by small things repeated: a weekly call, a shared meal, a prayer, a walk. Rituals work because they don't depend on anyone being in the mood. They just happen, and over years they add up to the relationship itself. They're also the first thing to get dropped when life gets busy, so they need defending.",
      action: "Choose one small family ritual to protect this week, a call, a meal, or a walk, and put it on the calendar now.",
      reflection: "Which family ritual have I let slide, and what would it take to bring it back?",
    },
  ],
};

export const CATEGORY_LESSONS = {
  Core: [
    {
      id: "core-generic-1",
      title: "Define What Good Looks Like",
      lesson:
        "You can't get better at something you haven't defined. \"Improve my {trait}\" is a wish. A standard is something you could check at the end of the day and answer yes or no. Describe what a person strong in {trait} actually does on an ordinary day, in behavior you could see. Once it's concrete, you know what to practice and you can tell whether you did.",
      action: "Write one sentence describing what a good day looks like for {trait}, in terms of something you would visibly do.",
      reflection: "By my own definition, was today a good day for {trait}?",
    },
    {
      id: "core-generic-2",
      title: "Count One Thing",
      lesson:
        "What you count, you pay attention to, and what you pay attention to tends to improve. Pick one small action that feeds {trait} and count how often you do it. Don't track the result, track the action, because the action is the part you control. A simple tally on paper is enough. The number isn't there to judge you. It's there to tell you the truth.",
      action: "Choose one countable action that builds {trait}. Put a tally mark on paper each time you do it today.",
      reflection: "What was today's count, and what got in the way of one more?",
    },
  ],
  Character: [
    {
      id: "character-generic-1",
      title: "You Are What You Repeat",
      lesson:
        "Character isn't a fixed thing you have. It's the pattern of what you do, especially when it's inconvenient. Each time you act with {trait} when it would be easier not to, you add a piece of evidence for the kind of person you are. One act won't change how you see yourself. A hundred will. The goal today isn't to be transformed. It's to cast one more vote.",
      action: "Find one moment today where {trait} is the harder option, and choose it on purpose.",
      reflection: "Where did I practice {trait} today when it cost me something?",
    },
    {
      id: "character-generic-2",
      title: "Find Your Example",
      lesson:
        "Abstract values are hard to follow. A person is easier. Think of someone you respect who clearly has {trait}: someone you know, or someone you've read about. In a tough moment, asking \"what would they do here?\" gives you a concrete answer when your own judgment is clouded. You're not copying their life. You're borrowing their standard until it becomes yours.",
      action: "Name one person who shows {trait} well. Write down one specific thing they do that you could do today.",
      reflection: "Would the person I named have handled today the way I did?",
    },
  ],
  Mind: [
    {
      id: "mind-generic-1",
      title: "Practice at the Edge",
      lesson:
        "Doing what's already easy maintains a skill. It doesn't grow it. Improvement happens just past what's comfortable, where you make mistakes and have to concentrate. For {trait}, that means picking one specific part you're weak at and working on that, rather than repeating what you already do well. It's less enjoyable, and that's the sign you're in the right spot.",
      action: "Pick the one part of {trait} you find hardest. Spend ten focused minutes on only that.",
      reflection: "Did I stretch {trait} today, or stay where it's comfortable?",
    },
    {
      id: "mind-generic-2",
      title: "Review the Tape",
      lesson:
        "Experience alone doesn't teach much. People can do something for twenty years and stop improving after two. What turns experience into skill is looking back at it on purpose: what worked, what didn't, what you'd change. Athletes watch film for this reason. A two-minute honest review at the end of the day does the same job for {trait}.",
      action: "Write two lines about {trait} today: one thing that went well, one thing you'd do differently.",
      reflection: "What is one thing today taught me about {trait}?",
    },
  ],
  Body: [
    {
      id: "body-generic-1",
      title: "Start Smaller Than You Think",
      lesson:
        "The body adapts to what you do regularly, not what you do once. Big efforts that leave you sore and discouraged usually end the plan within two weeks. A version small enough to repeat tomorrow, and the day after, is what creates change. For {trait}, choose the amount you could do even on a low day, and let it grow only after it's automatic.",
      action: "Do a version of {trait} today that takes ten minutes or less and that you could repeat tomorrow.",
      reflection: "Was what I did today for {trait} something I can keep up daily?",
    },
    {
      id: "body-generic-2",
      title: "Recovery Is Part of the Work",
      lesson:
        "Progress doesn't happen during the effort. It happens afterward, while you rest, eat, and sleep. Pushing hard with no recovery wears you down and stalls the gains you're working for. Treat rest as part of the plan for {trait}, not a break from it. Enough sleep, enough water, and an easy day now and then are what let the hard days count.",
      action: "Choose one recovery step for today: an earlier bedtime, more water, or ten minutes of stretching.",
      reflection: "Did I give my body what it needed to recover today?",
    },
  ],
  Skills: [
    {
      id: "skills-generic-1",
      title: "Reps Over Theory",
      lesson:
        "Reading about a skill feels like progress, but skills live in doing. You can study {trait} for months and still freeze the first time it counts. A short real attempt teaches more than a long study session, because it shows you what actually happens when you try. Keep the stakes low, do it badly at first, and repeat. The reps are the lesson.",
      action: "Do one small, real repetition of {trait} today, in a low-stakes situation.",
      reflection: "How many real attempts at {trait} did I make today, versus time spent thinking about it?",
    },
    {
      id: "skills-generic-2",
      title: "Get Feedback Fast",
      lesson:
        "Practice without feedback mostly locks in whatever you're already doing, including the mistakes. The quicker you find out how an attempt went, the quicker you can adjust. For {trait}, look for the shortest path to an honest signal: ask someone who's better than you, compare your work to a strong example, or record yourself and review it. Feedback you get today is worth more than feedback you get next month.",
      action: "After your next attempt at {trait}, get one piece of feedback: from a person, a recording, or a comparison to a good example.",
      reflection: "What did today's feedback tell me to change about how I practice {trait}?",
    },
  ],
  Relationships: [
    {
      id: "relationships-generic-1",
      title: "Show Up the Same Way Every Time",
      lesson:
        "Relationships are built on being predictable in the good sense: people know you'll answer, you'll remember, you'll be there. Grand gestures matter far less than small things done reliably. For {trait}, pick one simple act and make it regular. A short check-in every week does more than a big effort twice a year, because trust is made of repetition.",
      action: "Do one small thing for {trait} today that you could repeat every week: a text, a call, a few minutes of your time.",
      reflection: "Who could count on me today?",
    },
    {
      id: "relationships-generic-2",
      title: "Repair Quickly",
      lesson:
        "Every close relationship has friction. What separates the strong ones is how fast things get repaired. A short, honest \"I was wrong about that\" or \"I didn't handle that well\" the same day keeps a small crack from widening. Waiting for the other person to go first, or for the moment to feel right, lets it harden. Going first isn't losing. It's leading.",
      action: "Think of one recent moment of friction. Reach out today with a simple, honest sentence owning your part.",
      reflection: "Is there anything between me and someone I care about that I've left unrepaired?",
    },
  ],
};
