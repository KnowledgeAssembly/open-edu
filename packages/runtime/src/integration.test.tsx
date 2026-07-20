import { describe, it, expect } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { resolve } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { WorkflowEngine } from '@open-edu/workflow';
import { I18nProvider } from '@open-edu/i18n';
import runtimeDict from '@open-edu/i18n/locales/en/runtime.json';
import { RuntimeProvider } from './context/RuntimeContext';
import { LayoutShell } from './layout/LayoutShell';

const fixtureDir = resolve(__dirname, '__fixtures__/integration-package');

function Harness() {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { runtime: runtimeDict } }}>
      <RuntimeProvider loadedPackage={loadedPkg} engine={engineInstance}>
        <LayoutShell />
      </RuntimeProvider>
    </I18nProvider>
  );
}

let loadedPkg: Awaited<ReturnType<typeof loadPackage>>;
let engineInstance: WorkflowEngine;

describe('runtime + core + workflow integration', () => {
  it('renders the FIRST node on mount via the real loadPackage + WorkflowEngine', async () => {
    loadedPkg = await loadPackage(fixtureDir);
    engineInstance = new WorkflowEngine(loadedPkg.workflow!, {
      entry: loadedPkg.manifest.entry,
    });

    const { findByRole, getByText, queryByText } = render(<Harness />);

    // Header title is the manifest title.
    expect(
      await findByRole('heading', { level: 1, name: 'Integration Test Package' }),
    ).toBeInTheDocument();

    // The first lesson is rendered (MarkdownRenderer parses "# Lesson One" -> h1).
    // The package h1 and the markdown h1 are both h1 — assert by markdown text.
    await waitFor(() => {
      expect(getByText('Lesson One')).toBeInTheDocument();
    });

    // Quiz node is NOT yet rendered.
    expect(queryByText('What is 2 + 2?')).toBeNull();

    // Lesson node has a "Next" button that advances the workflow.
    const next = await findByRole('button', { name: 'Next' });
    fireEvent.click(next);

    // After clicking Next, the quiz is rendered.
    await waitFor(() => {
      expect(getByText('What is 2 + 2?')).toBeInTheDocument();
    });

    engineInstance.stop();
  });

  it('drives a quiz through to workflow completion via the real engine', async () => {
    loadedPkg = await loadPackage(fixtureDir);
    engineInstance = new WorkflowEngine(loadedPkg.workflow!, {
      entry: loadedPkg.manifest.entry,
    });

    const { findByRole, getByText, getByLabelText, queryByText } = render(<Harness />);

    // Advance from the lesson to the quiz.
    fireEvent.click(await findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(getByText('What is 2 + 2?')).toBeInTheDocument());

    // Submit the quiz with the correct answer (score 100 → COMPLETED).
    fireEvent.click(getByLabelText('4'));
    fireEvent.click(await findByRole('button', { name: 'Submit' }));

    // The workflow.completed event flips isCompleted and the shell shows the completion message.
    await waitFor(() => {
      expect(getByText(/You have completed this learning experience/)).toBeInTheDocument();
    });
    expect(queryByText('Next')).toBeNull();

    engineInstance.stop();
  });
});
