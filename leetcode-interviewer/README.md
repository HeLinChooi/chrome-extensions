# LeetCode Interviewer

A mock interviewer that listens while you solve a LeetCode problem out loud,
reads your code, and replies in text. Work in progress: the stages are in
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

Unlike the other extensions here, it needs a small server on your Mac. The
server runs Whisper, so your audio stays on the Mac, and it holds the Claude
API key, so the key never reaches the browser.

## Setup

```bash
brew install whisper.cpp ffmpeg
mkdir -p ~/.local/share/whisper
curl -L -o ~/.local/share/whisper/ggml-large-v3-turbo.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

The model is 1.6 GB. Its SHA-256 is
`1fc70f774d38eb169993ac391eea357ef47c88757ef72ee5943879b7e8e2bc69`.

## The API key

The server calls Claude (Sonnet 5.5) with your own API key. It reads the key
from a file outside the repo. Copy the key from console.anthropic.com, then:

```bash
mkdir -p ~/.config/leetcode-interviewer && (umask 077; pbpaste > ~/.config/leetcode-interviewer/anthropic-key)
```

`pbpaste` writes the clipboard to the file, so the key never appears in a
command line. `umask 077` makes the file readable only by you.

## Running an interview

```bash
npm install
npm run build      # then load dist/ with Load unpacked in chrome://extensions
npm start          # the local server; leave it running
```

Open a LeetCode problem, click the toolbar icon to open the side panel, and
click **Start interview**. Talk through the problem out loud. The panel shows
what Whisper heard, in small grey text, and what the interviewer says. The
microphone is recorded only between **Start** and **Stop**. Stop saves the
session as JSON in `server/recordings/sessions/`.

The interviewer is asked whether to speak only when you pause for 2.5
seconds, or stay silent for 60 seconds. Most of the time it chooses to stay
quiet. Each decision is printed in the server's terminal, with its time and
token counts.

To check the Claude call on a saved recording, without the microphone:

```bash
npm run dry-run -- server/recordings/<file>.wav two-sum
```

## Listening test

```bash
npm run listen-test
```

It records from the microphone while you read `server/passage.txt` aloud,
then prints how long Whisper took and which words it got wrong. Run it in
your own terminal: macOS asks once for microphone access, and it needs Enter
to stop. Recordings are saved in `server/recordings/`, which git ignores.
