---
sidebar_position: 15
---

# Video Player

**Widget ID:** `core.video-player` | **Domain:** core | **Status:** stable

> Play video clips with chapters, captions, and transcripts.

## What it does

The Video Player widget plays a video file with full playback controls. Students can watch educational videos with chapter navigation, timed captions, and a transcript panel. It supports fullscreen mode and keyboard shortcuts.

## When to use this widget

- Showing educational animations and demonstrations
- Video-based science experiments
- Visual explanations of complex concepts
- Documentary-style content for older students

## Setting it up

1. Add an Exercise node to your lesson
2. Set the widget to "core.video-player"
3. Provide the path to your video file
4. Optionally add a poster image for the thumbnail
5. Add chapters for easy navigation, captions for accessibility

## Configuration fields

| Field             | Type             | Required | Description                                                               |
| ----------------- | ---------------- | -------- | ------------------------------------------------------------------------- |
| `video`           | string           | Yes      | Path to the video file (MP4 recommended).                                 |
| `title`           | string           | No       | Title shown above the video player.                                       |
| `poster`          | string           | No       | Path to a poster image shown before the video plays.                      |
| `chapters`        | array of objects | No       | Video chapters. Each has time (number, seconds) and title (string).       |
| `captions`        | array of objects | No       | Timed captions. Each has start (number), end (number), and text (string). |
| `transcript`      | string           | No       | Full text transcript of the video content.                                |
| `showTranscript`  | boolean          | No       | Show the transcript panel. Defaults to true.                              |
| `allowFullscreen` | boolean          | No       | Allow fullscreen mode. Defaults to true.                                  |
| `interactive`     | boolean          | No       | When false, plays in observe mode. Defaults to false.                     |

## Example

```json
{
  "type": "exercise",
  "title": "Photosynthesis Video",
  "widget": "core.video-player",
  "config": {
    "video": "assets/video/photosynthesis.mp4",
    "title": "Understanding Photosynthesis",
    "chapters": [
      { "time": 0, "title": "Introduction" },
      { "time": 60, "title": "Light Reactions" },
      { "time": 180, "title": "Calvin Cycle" }
    ],
    "showTranscript": true,
    "interactive": false
  }
}
```

## Tips

- Use short, focused clips (1-5 minutes)
- Always add captions for accessibility
- Chapters help students navigate to specific sections
- Video files should be placed in your lesson package directory

## See also

- [Audio Player](audio-player.md)
