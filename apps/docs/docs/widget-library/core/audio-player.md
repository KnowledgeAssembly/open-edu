---
sidebar_position: 14
---

# Audio Player

**Widget ID:** `core.audio-player` | **Domain:** core | **Status:** stable

> Play audio clips with transcripts, captions, and comprehension support.

## What it does

The Audio Player widget plays an audio file with playback controls. Students can listen to spoken content, read along with a transcript, and view timed captions. It supports bookmarks, waveform visualization, and keyboard controls.

## When to use this widget

- Language learning with pronunciation examples
- Listening comprehension exercises
- Audio-based instructions for young learners
- Storytelling and read-aloud activities

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.audio-player"
3. Provide the path to your audio file
4. Add a title and optional description
5. Optionally provide a transcript and timed captions

## Configuration fields

| Field            | Type             | Required | Description                                                                                 |
| ---------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------- |
| `audio`          | string           | Yes      | Path to the audio file (MP3, WAV, etc.).                                                    |
| `title`          | string           | No       | Title shown above the audio player.                                                         |
| `description`    | string           | No       | Additional context about the audio.                                                         |
| `transcript`     | string           | No       | Full text transcript of the audio content.                                                  |
| `captions`       | array of objects | No       | Timed captions. Each has start (number, seconds), end (number, seconds), and text (string). |
| `showTranscript` | boolean          | No       | Show the transcript panel. Defaults to true.                                                |
| `waveform`       | boolean          | No       | Show audio waveform visualization. Defaults to false.                                       |
| `bookmarks`      | boolean          | No       | Allow students to bookmark positions. Defaults to true.                                     |
| `interactive`    | boolean          | No       | When false, plays in observe mode. Defaults to false.                                       |

## Example

```json
{
  "type": "exercise",
  "title": "Listen to Bird Sounds",
  "widget": "core.audio-player",
  "config": {
    "audio": "assets/audio/birdsong.mp3",
    "title": "Morning Birdsong",
    "description": "Listen to the sounds of birds in the morning.",
    "transcript": "You can hear a variety of bird calls: chirping, whistling, and trilling.",
    "captions": [
      { "start": 0, "end": 3, "text": "Chirping sounds begin" },
      { "start": 3, "end": 6, "text": "Whistling melodies join in" },
      { "start": 6, "end": 10, "text": "A chorus of bird calls" }
    ],
    "showTranscript": true,
    "bookmarks": true,
    "interactive": false
  }
}
```

## Tips

- Always provide a transcript for accessibility
- Use short audio clips (1-3 minutes) for focused listening
- Timed captions help students follow along
- Audio files should be placed in your lesson package directory

## See also

- [Video Player](video-player.md)
