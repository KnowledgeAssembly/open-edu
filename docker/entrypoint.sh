#!/bin/sh
set -eu

COURSES_DIR="${OPEN_EDU_COURSES_DIR:-/data/courses}"
SEED_DIR="${OPEN_EDU_SEED_EXAMPLES_DIR:-/opt/examples}"

mkdir -p "$COURSES_DIR"
if [ ! -w "$COURSES_DIR" ]; then
  echo "[entrypoint] ERROR: $COURSES_DIR is not writable by user $(id -un)." >&2
  echo "[entrypoint] Check the ownership of the mounted courses volume." >&2
  exit 1
fi

is_empty() {
  [ -z "$(ls -A "$1" 2>/dev/null)" ]
}

if is_empty "$COURSES_DIR"; then
  if mkdir "$COURSES_DIR/.seed-lock" 2>/dev/null; then
    echo "[entrypoint] Seeding $COURSES_DIR from $SEED_DIR"
    cp -R "$SEED_DIR/." "$COURSES_DIR/"
    rm -rf "$COURSES_DIR/.seed-lock"
  else
    echo "[entrypoint] Another container is seeding the courses volume; waiting..."
    i=0
    while [ -d "$COURSES_DIR/.seed-lock" ] && [ "$i" -lt 60 ]; do
      sleep 1
      i=$((i + 1))
    done
  fi
fi

has_course_dir() {
  find "$COURSES_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '.*' -print -quit | grep -q .
}

if ! has_course_dir; then
  echo "[entrypoint] No courses found; creating an empty hello-world course directory"
  mkdir -p "$COURSES_DIR/hello-world"
fi

if [ -z "${LLM_API_KEY:-}" ] \
  && [ -z "${OPENAI_API_KEY:-}" ] \
  && [ -z "${ANTHROPIC_API_KEY:-}" ] \
  && [ -z "${OPENROUTER_API_KEY:-}" ] \
  && [ -z "${OPEN_EDU_STUDIO_LLM_API_KEY:-}" ]; then
  echo "[entrypoint] Note: no LLM API key configured. AI features (Pipili, Studio drafting) are unavailable; everything else works."
fi

exec "$@"
