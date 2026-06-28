import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TutorMessage } from '../TutorMessage.jsx';
import { checkAccessibility } from '../../test-utils/a11y.js';

describe('TutorMessage', () => {
  it('renders children', () => {
    render(<TutorMessage role="ai">Hello world</TutorMessage>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('AI messages have bot icon', () => {
    render(<TutorMessage role="ai">AI message</TutorMessage>);
    expect(screen.getByText('🤖')).toBeInTheDocument();
  });

  it('user messages are right-aligned', () => {
    render(<TutorMessage role="user">User message</TutorMessage>);
    const container = screen.getByTestId('tutor-message');
    expect(container.className).toContain('justify-end');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<TutorMessage role="ai">Accessible message</TutorMessage>);
  });
});
