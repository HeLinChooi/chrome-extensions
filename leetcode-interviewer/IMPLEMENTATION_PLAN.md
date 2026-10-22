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
was loading the model. So the speed criterion passes; accuracy on Coin's
voice is still unmeasured.
**Status**: In Progress. Waiting for Coin's recording.

## Stage 2: Extension shell
**Goal**: A side panel on `leetcode.com/problems/*`.
**Success Criteria**: The panel shows the open problem's title and Coin's
current code, and updates when he types.
**Tests**: First, check that a script in the page's own JavaScript world can
read the Monaco editor's content. Everything later depends on this.
**Status**: Not Started

## Stage 3: Interviewer
**Goal**: Microphone → `whisper-server` (model stays loaded) → Claude → panel.
**Success Criteria**: It stays quiet while Coin talks. It speaks only when:
he asks it something; he is silent for about 60 seconds (adjustable); he
starts coding before stating an approach and its complexity; or he says
something wrong, such as a wrong Big O. It always gets the code and the speech
together. Hints come in steps, from small to large, and each one is recorded.
**Tests**: A scripted mock with each of the four triggers, and one where it
must stay quiet. Check model IDs and prices with the `claude-api` skill before
choosing a model.
**Status**: Not Started

## Stage 4: Scorecard
**Goal**: A scorecard on the four rubric categories (problem solving, coding,
verification, communication), each point quoting Coin with a timestamp.
**Success Criteria**: Saved as markdown with the transcript to
`knowledge-base/docs/career/interviews/record/`, never to this public repo.
**Tests**: One real mock by Coin, end to end.
**Status**: Not Started
