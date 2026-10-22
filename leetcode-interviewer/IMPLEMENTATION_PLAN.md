# LeetCode Interviewer: plan

A mock interviewer for practising LeetCode out loud. Coin solves a problem on
leetcode.com and talks through it. The interviewer listens, reads his code,
and replies in a side panel, in text. At the end it writes a scorecard.

Decisions by Coin on 22 Oct 2026:

- **On leetcode.com**, as a Chrome extension, so LeetCode's own Run and Submit
  still work.
- **Text replies only.** No voice output.
- **Whisper on the Mac** for speech to text. The audio never leaves the Mac.
- **The two failures to design against** (from interviewing.io's AI
  interviewer): it talked too much, and it did not understand him.

The behaviour comes from *Beyond Cracking the Coding Interview*, Ch 19 (the
universal rubric) and Ch 20 (the stages of a coding interview). Coin's notes
are in `knowledge-base/docs/career/bctci/`.

## Stage 1: Listening test
**Goal**: Know whether local Whisper is fast and accurate enough on Coin's voice.
**Success Criteria**: Coin reads `server/passage.txt` aloud. Wrong words are
under 5%, and no interview term (hash map, O of n, pointer) is wrong.
Transcribing a 10-second piece takes under 2 seconds with the model loaded.
**Tests**: `test/word-errors.test.js`. `npm run listen-test` on Coin's voice.
A computer voice (`say`) gave 3.4% wrong words with the prompt, 5.4% without.
Speed, measured on the M3 Pro: a 10-second clip took 1.45 s, of which 0.43 s
was loading the model.

**Result on Coin's voice (22 Oct 2026), 52 s of audio:**

| Model | Wrong words | Time |
|---|---|---|
| large-v3-turbo, plain | 11 (7.5%) | 2.9 s |
| large-v3-turbo, with prompt | 13 (8.8%) | 3.2 s |
| large-v3, plain | 23 (15.6%) | 7.0 s |
| large-v3, with prompt | 25 (17.0%) | 6.8 s |

The 5% criterion failed, but the count overstates the problem. With
large-v3-turbo, every interview term was right. Most errors were word forms
("indexes", "square"). Coin thinks he read "valid" and "indexes" himself,
and both models agree on those. One error changed the meaning: "If it is, I
return both indices" became "I store both indexes". large-v3 dropped most
Big O phrases, and the prompt made both models drop words.

**Decision**: large-v3-turbo, with no prompt. Stage 3 must treat the
transcript as possibly wrong (see there).
**Status**: Complete

## Stage 2: Extension shell
**Goal**: A side panel on `leetcode.com/problems/*`.
**Success Criteria**: The panel shows the open problem's title and Coin's
current code, and updates when he types.
**Tests**: First, check that a script in the page's own JavaScript world can
read the Monaco editor's content. Everything later depends on this.
`test/page-state.test.js`.
- 22 Oct 2026: `window.monaco` is visible in the page. Two Sum has two
  editors: the code (`cpp` when logged out) and a `plaintext` one for test
  cases. Typing fires the model's change event.
- 22 Oct 2026, the built extension in Chromium 1234: the content script
  returned the slug, title, language and code on request, and pushed a new
  snapshot after typing. Headless Chromium gets Cloudflare's "Just a
  moment..." page, so a check like this needs a visible window.
- 22 Oct 2026, Coin's Chrome: the panel showed the title, language and code,
  and updated as he typed.
**Status**: Complete

## Stage 3: Interviewer
**Goal**: Microphone → `whisper-server` (model stays loaded) → Claude → panel.
**Success Criteria**: It stays quiet while Coin talks. It speaks only when:
he asks it something; he is silent for about 60 seconds (adjustable); he
starts coding before stating an approach and its complexity; or he says
something wrong, such as a wrong Big O. It always gets the code and the speech
together. Hints come in steps, from small to large, and each one is recorded.
The transcript can be wrong (Stage 1 measured 7.5% wrong words). When Coin's
speech contradicts his code, the interviewer asks what he meant ("valid or
invalid?"). It never marks him wrong on the transcript alone.
**Tests**: A scripted mock with each of the four triggers, and one where it
must stay quiet. Check model IDs and prices with the `claude-api` skill before
choosing a model.
**Decisions (22 Oct 2026)**:
- Model: `claude-sonnet-5-5`, chosen by Coin. Adaptive thinking at `low`
  effort, structured output, server-side refusal fallback (`"default"`).
- The microphone is recorded by the server with ffmpeg, not by the panel:
  that path was proven in Stage 1, and the panel's microphone permission was
  not tested.
- Audio is split into utterances at 700 ms pauses (measured on Coin's
  recording). Claude is asked only after a 2.5 s pause following new speech,
  or after 60 s of silence (once per silence).
- `whisper-server` keeps the model loaded: 0.86 s for a 10 s clip.
- Each call is one stateless request: the system prompt and the problem are
  cached, and the transcript, code and event follow.
- The API key file is a copy of `ANTHROPIC_API_KEY` from
  `~/helin-openclaw/openclaw/.env` (Coin chose to share the travel bot's key).
  If that key is rotated, copy it again (README, "The API key").
**Dry run (22 Oct 2026)**, Coin's passage recording as a `turn-end`: the first
call took 5.4 s and wrote 1,820 tokens to the cache; the second took 2.3 s
and read them from the cache. Each call used 296 new input tokens and 100 to
200 output tokens. Both replies answered his clarifying questions; the
second also asked whether the sorted sliding window keeps the original
indexes, without giving the answer.
**Status**: In Progress. Waiting for Coin's first live mock.

## Stage 4: Scorecard
**Goal**: A scorecard on the four rubric categories (problem solving, coding,
verification, communication), each point quoting Coin with a timestamp.
**Success Criteria**: Saved as markdown with the transcript to
`knowledge-base/docs/career/interviews/record/`, never to this public repo.
**Tests**: One real mock by Coin, end to end.
**Status**: Not Started
