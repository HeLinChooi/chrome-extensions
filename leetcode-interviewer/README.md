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

## The extension

```bash
npm install
npm run build
```

Load `dist/` with **Load unpacked** in `chrome://extensions`. Open a LeetCode
problem and click the toolbar icon: the side panel opens. For now it shows the
problem title, the language and your code, and updates about once a second as
you type.

## Listening test

```bash
npm run listen-test
```

It records from the microphone while you read `server/passage.txt` aloud,
then prints how long Whisper took and which words it got wrong. Run it in
your own terminal: macOS asks once for microphone access, and it needs Enter
to stop. Recordings are saved in `server/recordings/`, which git ignores.
