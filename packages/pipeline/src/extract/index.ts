import { readFileSync } from 'node:fs';
import pdfParse from 'pdf-parse';
import type { ExtractedPDF, ChapterChunk, SectionChunk } from '../types.js';
import type { PageContent } from '../source/inventory.js';

const CHAPTER_HEADING = /^(Lesson|Chapter|Unit)\s+(\d+)\s*[:\-–—]\s*(.+)$/im;

const SECTION_HEADING = /^(\d+)\.(\d{1,2}(?:\.\d)?)\s*([A-Za-z].+)$/m;

const EXAMPLE_MARKER = /^(Example|उदाहरण)\b/i;

const EXERCISE_MARKER = /^(Let us see what you have learnt|Exercise|Practice|Answer|Answers)/im;

function parseTOC(text: string): Map<number, string> {
  const tocStart = text.indexOf('Sl. No.');
  if (tocStart === -1) return new Map();

  const tocEnd = text.indexOf('\nContents', tocStart);
  const tocText = text.slice(tocStart, tocEnd !== -1 ? tocEnd : tocStart + 800);

  const lines = tocText.split('\n');
  const result = new Map<number, string>();
  let currentNum = 0;
  let currentTitle = '';

  const ENTRY_START = /^(\d+)\.(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Sl.')) continue;

    const match = trimmed.match(ENTRY_START);
    if (match) {
      if (currentNum > 0 && currentTitle) {
        result.set(currentNum, currentTitle);
      }
      currentNum = parseInt(match[1]!, 10);
      currentTitle = match[2]!.replace(/\d+$/, '').trim();
    } else if (currentNum > 0) {
      currentTitle += ' ' + trimmed.replace(/\d+$/, '').trim();
    }
  }

  if (currentNum > 0 && currentTitle) {
    result.set(currentNum, currentTitle);
  }

  return result;
}

export async function extractPDF(pdfPath: string): Promise<ExtractedPDF> {
  if (!pdfPath.endsWith('.pdf')) {
    throw new Error(`Not a PDF file: ${pdfPath}`);
  }

  let dataBuffer: Buffer;
  try {
    dataBuffer = readFileSync(pdfPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read PDF file: ${message}`);
  }

  let pdfData;
  try {
    pdfData = await pdfParse(dataBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse PDF: ${message}`);
  }

  const text = pdfData.text;
  const chapters = parseChapters(text);

  return {
    metadata: {
      title: (pdfData.info?.Title as string) || pdfPath.split('/').pop() || 'Untitled',
      totalPages: pdfData.numpages,
    },
    chapters,
  };
}

function parseChapters(text: string): ChapterChunk[] {
  const tocChapters = parseTOC(text);
  const lines = text.split('\n');
  const chapters: ChapterChunk[] = [];
  let currentChapter: ChapterChunk | null = null;
  let currentSection: SectionChunk | null = null;
  let inExercise = false;
  let lastChapterNum = 0;
  const createdChapters = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();

    if (!line) continue;

    const chapterMatch = line.match(CHAPTER_HEADING);
    if (chapterMatch) {
      if (currentSection && currentChapter) {
        currentChapter.sections.push(currentSection);
      }
      currentSection = null;
      currentChapter = {
        chapterNumber: parseInt(chapterMatch[2]!, 10),
        chapterTitle: chapterMatch[3]!.trim(),
        sections: [],
        pages: [],
      };
      chapters.push(currentChapter);
      lastChapterNum = currentChapter.chapterNumber;
      createdChapters.add(currentChapter.chapterNumber);
      inExercise = false;
      continue;
    }

    const sectionMatch = line.match(SECTION_HEADING);
    if (sectionMatch && !EXAMPLE_MARKER.test(line) && sectionMatch[3]!.length >= 10) {
      const chapterNum = parseInt(sectionMatch[1]!, 10);

      if (!createdChapters.has(chapterNum) && tocChapters.has(chapterNum)) {
        if (currentSection && currentChapter) {
          currentChapter.sections.push(currentSection);
        }
        currentSection = null;

        const title = tocChapters.get(chapterNum) || `Chapter ${chapterNum}`;
        currentChapter = {
          chapterNumber: chapterNum,
          chapterTitle: title,
          sections: [],
          pages: [],
        };
        chapters.push(currentChapter);
        lastChapterNum = chapterNum;
        createdChapters.add(chapterNum);
        inExercise = false;
      }

      if (currentChapter && chapterNum === lastChapterNum) {
        if (currentSection) {
          currentChapter.sections.push(currentSection);
        }
        currentSection = {
          heading: line,
          body: '',
          examples: [],
          exercises: [],
        };
      }
      continue;
    }

    if (!currentChapter) continue;

    if (EXERCISE_MARKER.test(line)) {
      if (currentSection) {
        currentChapter.sections.push(currentSection);
      }
      currentSection = {
        heading: line,
        body: '',
        examples: [],
        exercises: [line],
      };
      inExercise = true;
      continue;
    }

    if (inExercise) {
      if (currentSection && currentSection.exercises) {
        if (currentSection.exercises.length === 1 && currentSection.exercises[0] === line) {
          /* skip duplicate */
        } else {
          currentSection.exercises.push(line);
        }
      }
      continue;
    }

    if (EXAMPLE_MARKER.test(line)) {
      if (currentSection) {
        currentSection.examples.push(line);
      } else {
        currentSection = {
          heading: 'Example',
          body: '',
          examples: [line],
          exercises: [],
        };
      }
      continue;
    }

    if (currentSection) {
      const isExampleContent =
        currentSection.examples.length > 0 &&
        currentSection.body === '' &&
        !SECTION_HEADING.test(line);

      if (isExampleContent) {
        currentSection.examples.push(line);
      } else if (
        currentSection.heading === 'Example' ||
        currentSection.heading.startsWith('Example')
      ) {
        currentSection.examples.push(line);
      } else {
        currentSection.body += (currentSection.body ? '\n' : '') + line;
      }
    } else {
      currentSection = {
        heading: 'Content',
        body: line,
        examples: [],
        exercises: [],
      };
    }
  }

  if (currentSection && currentChapter) {
    currentChapter.sections.push(currentSection);
  }

  return chapters;
}

export async function extractPDFPages(pdfPath: string): Promise<PageContent[]> {
  const pdfBuffer = readFileSync(pdfPath);
  const pdfData = await pdfParse(pdfBuffer);
  const fullText = pdfData.text;

  const pages: PageContent[] = [];
  const pageTexts = fullText.split(/\f/);

  for (let i = 0; i < pageTexts.length; i++) {
    const pageText = pageTexts[i];
    if (!pageText) continue;
    const text = pageText.trim();
    if (text.length > 0) {
      pages.push({ pageNum: i + 1, text });
    }
  }

  return pages;
}

export function extractTextFromPDF(pdfPath: string): Promise<string> {
  return extractPDF(pdfPath).then((pdf) =>
    pdf.chapters
      .map(
        (ch) =>
          `Chapter ${ch.chapterNumber}: ${ch.chapterTitle}\n\n` +
          ch.sections
            .map((s) => {
              let text = s.heading ? `${s.heading}\n` : '';
              text += s.body ? `${s.body}\n` : '';
              text +=
                s.examples.length > 0 ? s.examples.map((e) => `  ${e}`).join('\n') + '\n' : '';
              text +=
                s.exercises.length > 0 ? s.exercises.map((e) => `  ${e}`).join('\n') + '\n' : '';
              return text;
            })
            .join('\n'),
      )
      .join('\n\n===\n\n'),
  );
}
