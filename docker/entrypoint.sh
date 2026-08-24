#!/bin/sh
set -eu

COURSES_DIR="${OPEN_EDU_COURSES_DIR:-/data/courses}"
SEED_DIR="${OPEN_EDU_SEED_EXAMPLES_DIR:-/opt/examples}"
SEED_LOCK=".seed-lock"

mkdir -p "$COURSES_DIR"
if [ ! -w "$COURSES_DIR" ]; then
  echo "[entrypoint] ERROR: $COURSES_DIR is not writable by user $(id -un)." >&2
  echo "[entrypoint] Check the ownership of the mounted courses volume." >&2
  exit 1
fi

# Emptiness must ignore the seed lock itself, so a crashed first seed can be
# retried on the next start instead of being silently skipped forever.
has_content() {
  find "$1" -mindepth 1 ! -name "$SEED_LOCK" -print -quit | grep -q .
}

cleanup_lock() {
  rm -rf "$COURSES_DIR/$SEED_LOCK"
}

seed() {
  trap cleanup_lock EXIT INT TERM
  echo "[entrypoint] Seeding $COURSES_DIR from $SEED_DIR"
  cp -R "$SEED_DIR/." "$COURSES_DIR/"
  cleanup_lock
  trap - EXIT INT TERM
}

if [ -d "$COURSES_DIR/$SEED_LOCK" ]; then
  echo "[entrypoint] Another container may be seeding the courses volume; waiting..."
  i=0
  while [ -d "$COURSES_DIR/$SEED_LOCK" ] && [ "$i" -lt 60 ]; do
    sleep 1
    i=$((i + 1))
  done
  if [ -d "$COURSES_DIR/$SEED_LOCK" ]; then
    echo "[entrypoint] WARNING: seed lock still present after 60s." >&2
    echo "[entrypoint] A previous seed probably crashed; removing the stale lock." >&2
    cleanup_lock
  fi
fi

if ! has_content "$COURSES_DIR"; then
  if mkdir "$COURSES_DIR/$SEED_LOCK" 2>/dev/null; then
    seed
  else
    echo "[entrypoint] Another container started seeding; skipping."
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
