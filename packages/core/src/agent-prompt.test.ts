import { describe, it, expect } from 'vitest';
import { generateAgentPrompt } from './agent-prompt';

describe('generateAgentPrompt', () => {
  it('should return a non-empty string', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(500);
  });

  it('should describe the package file structure', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toContain('package.json');
    expect(prompt).toContain('workflow.json');
    expect(prompt).toContain('rewards.json');
    expect(prompt).toContain('nodes/');
  });

  it('should include Zod schema summaries as JSON-like representations', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toContain('"id"');
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"version"');
    expect(prompt).toContain('"author"');
    expect(prompt).toContain('"entry"');
  });

  it('should document all node types', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toContain('lesson');
    expect(prompt).toContain('quiz');
    expect(prompt).toContain('reflection');
    expect(prompt).toContain('exercise');
    expect(prompt).toContain('custom');
  });

  it('should include workflow JSON examples', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toContain('onComplete');
    expect(prompt).toContain('conditions');
    expect(prompt).toContain('COMPLETED');
  });

  it('should list common mistakes', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toContain('Common Mistakes');
    expect(prompt).toContain('Entry node missing');
    expect(prompt).toContain('Orphaned routing keys');
  });

  it('should include a fill-in-the-blanks template', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toContain('PACKAGE_ID');
    expect(prompt).toContain('PACKAGE_TITLE');
    expect(prompt).toContain('{{');
    expect(prompt).toContain('}}');
  });

  it('should mention rewards configuration', () => {
    const prompt = generateAgentPrompt();
    expect(prompt).toContain('badge.award');
    expect(prompt).toContain('webhook');
    expect(prompt).toContain('script');
  });

  it('should be consistently formatted (deterministic)', () => {
    const prompt1 = generateAgentPrompt();
    const prompt2 = generateAgentPrompt();
    expect(prompt1).toBe(prompt2);
  });
});
