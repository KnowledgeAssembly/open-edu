# Dictionary Data Source Analysis

## Current Data

**Source**: Unknown origin — appears to be a custom extraction from Wiktionary
**Format**: Single `dictionary.json` (302MB) / `dictionary.json.gz` (77MB)
**Schema**: Custom — one JSON object per word, flat `definitions[]` array
**License**: CC-BY-SA 3.0 (Wiktionary derivative)

### Current data quality issues confirmed:

| Problem                            | Example                                               | Root Cause                                     |
| ---------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| Raw wikitext in definitions        | `#* {{RQ:Shakespeare\|...\|passage=...}}`             | Extractor didn't resolve templates             |
| `# #: #* :` markers in definitions | `# Of an activity...`, `:`, `#*`                      | List markers not stripped                      |
| Broken or no phonetic              | `ˈæpəl/\|[ˈæpəl]\|~\|[ˈæpl̩]` or empty string ` `      | Multiple variants joined raw; missing fallback |
| Non-standard PoS                   | `==verb==`, `=noun=`, `proper-noun`                   | PoS normalization not applied                  |
| Synonyms contain wikitext          | `{{t\|fi\|-adinen}}`, `{{anagrams\|en\|...}}`         | Translation/anagram data leaked into synonyms  |
| Translations not separate          | Mixed into `synonyms[]` as `Finnish: {{t\|fi\|word}}` | Translation data dumped into synonym field     |
| Entries with useless content       | 363K entries are just `:`, `#*`, `.`                  | Quotations and formatting kept as definitions  |
| No examples separation             | Examples in the definitions array as sibling entries  | Examples not identified as such                |

## Kaikki.org Data

**Source**: Wiktextract (https://github.com/tatuylonen/wiktextract)
**Format**: JSONL (one line per part-of-speech, per word)
**License**: CC-BY-SA 3.0 (Wiktionary derivative)
**Update frequency**: Weekly

### Two tiers available:

#### 1. Raw Wiktextract Data (recommended)

- **Download**: `raw-wiktextract-data.jsonl.gz` (2.6GB compressed, 22GB uncompressed) — ALL languages
- **Per-language**: Per-language extracts available (English in a 1.3GB chunk)
- **Includes**: All fields, raw templates, etymology templates
- **Status**: Primary, ongoing format
- **Contains**: Language entries for ALL languages in English Wiktionary (thousands of languages)

#### 2. Postprocessed English Dictionary (DEPRECATED)

- **Download**: `kaikki.org-dictionary-English.jsonl` (2.9GB)
- **Per-word pages**: Per-word HTML/JSON views available
- **Status**: DEPRECATED (will be removed per https://github.com/tatuylonen/wiktextract/issues/1178)
- **Note**: We should NOT depend on this format since it's being removed

### Kaikki Data Quality Sample (from postprocessed English data):

For `dictionary (noun)`:

```json
{
  "pos": "noun",
  "word": "dictionary",
  "senses": [
    {
      "glosses": ["A reference work listing words or names from one or more languages, usually ordered alphabetically, explaining each word's meanings or senses, often additionally providing etymologies, pronunciation, translations, usage examples, and other information."],
      "examples": [{"text": "If you want to know the meaning of a word, look it up in the dictionary."}]
    },
    {
      "glosses": ["A reference work on a particular subject or activity in which the entries are arranged alphabetically; an alphabetical encyclopedia."],
      "tags": ["broadly"],
      "examples": [{"text": "a law dictionary"}]
    }
  ],
  "sounds": [
    {"ipa": "/ˈdɪk.ʃə.nə.ɹi/"},
    {"ipa": "/ˈdɪk.ʃən.ɹi/"}
  ],
  "synonyms": [{"word": "wordbook"}, {"word": "wordhoard"}],
  "translations": [...548 entries, e.g., {"code": "fi", "lang": "Finnish", "word": "sanakirja"}],
  "forms": [{"form": "dictionaries", "tags": ["plural"]}],
  "derived": [...31 entries],
  "etymology_text": "From Early Modern English dictionary...",
  "categories": ["en:Dictionaries", "en:Reference works"]
}
```

## Comparison

| Aspect                 | Current Data                                          | Kaikki Raw Wiktextract                                   |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| **Definitions**        | Raw wikitext with `#:*` markers, `{{templates}}`      | Clean `glosses[]` per sense                              |
| **Part of Speech**     | `==verb==`, `=noun=`, `proper-noun`                   | Standardized: `verb`, `noun`, `adj`, `adv`               |
| **Phonetic**           | Raw `ˈæpəl/\|[ˈæpəl]\|~\|[ˈæpl̩]`                      | Clean `/ˈdɪk.ʃə.nə.ɹi/` in `sounds[].ipa`                |
| **Synonyms**           | Contains `{{t\|fi\|-adinen}}`, anagrams, translations | Clean `[{"word": "wordbook"}, {"word": "wordhoard"}]`    |
| **Examples**           | Mixed into definitions array                          | Per-sense `examples[].text`                              |
| **Translations**       | Missing or mixed into synonyms                        | Structured per-sense, per-language                       |
| **Word count**         | 637K unique words, 650K entries                       | 1.37M English word forms (incl. inflections)             |
| **Compressed size**    | 77MB                                                  | ~2.6GB (raw, all languages) or ~800MB (English-only raw) |
| **Extraction quality** | Poor — raw dump with minimal processing               | Full Lua/template expansion via wiktextract              |
| **Format**             | JSON array (single file)                              | JSONL (streamable, per-line)                             |
| **Schema**             | Custom, undocumented                                  | Well-documented TypedDict models                         |
| **Update frequency**   | Unknown                                               | Weekly                                                   |

## Migration Assessment

### Effort Summary

| Task                                                              | Effort                                   |
| ----------------------------------------------------------------- | ---------------------------------------- |
| Download and extract English-only data from raw JSONL             | Low (use `wiktwords --language-code en`) |
| Convert JSONL to our internal DictionaryEntry schema              | Medium (map fields)                      |
| Build server-side data pipeline (generate once, serve compressed) | Medium                                   |
| Handle 1.37M words (more entries)                                 | Low (server already handles 650K)        |
| Fix WordTapHandler popover to use new fields                      | Low-Minimal (same fields, cleaner data)  |
| Test coverage for new data pipeline                               | Medium                                   |

### Recommended approach:

1. **Use raw wiktextract data** (the non-deprecated format): `wiktwords --language-code en --all --out en.jsonl --edition en enwiktionary-2026-06-01-pages-articles.xml.bz2`
2. **OR use the pre-extracted raw data** from `raw-wiktextract-data.jsonl.gz` and filter to English only
3. **Build a pipeline** that:
   - Streams JSONL line-by-line
   - Filters to English entries
   - Maps fields: `pos` → `partOfSpeech`, `sounds[].ipa` → `phonetic`, `senses[].glosses` → `definitions[]`, `senses[].examples` → `examples[]`
   - Extracts primary IPA from `sounds[]`
   - Builds the server-ready dictionary JSON.gz
4. **Keep the dev-server architecture** — the current server loads the dictionary and serves via REST. Only the data generation step changes.

### Risks

- **Deprecation**: The postprocessed data is deprecated (issue #1178). Raw data is the primary format.
- **Compressed size**: ~800MB for English-only raw data (gzipped) vs current 77MB. 10x larger on disk.
- **Processing time**: Running `wiktwords` yourself takes ~1.25 hours on a 128-core machine. Using pre-extracted data avoids this.

### Verdict

**Kaikki data is strictly superior in every quality dimension.** The current data appears to be an early-stage, poorly processed extract. The kaikki raw data has:

- Proper template expansion (resolves `{{RQ:...}}`, `{{taxon|...}}`, etc.)
- Clean, structured glosses
- Clean IPA pronunciations
- Clean synonyms (not mixed with translations or anagrams)
- Proper PoS normalization
- Per-sense examples
- Rich metadata (tags, categories, etymology, forms)

The cost is 10x larger compressed data and a more complex data pipeline. For an educational app where dictionary quality directly impacts UX, this trade-off is likely worth it.
