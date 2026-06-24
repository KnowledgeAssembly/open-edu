import { useState, useEffect } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

const realWorldSchema = z.object({
  scenario: z.string().min(1),
  taskDescription: z.string().optional(),
  prompt: z.string().optional(),
  expectedAnswer: z.string().optional(),
  visualExample: z.string().optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional().default(false),
});

function RealWorldComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;

  const parsed = realWorldSchema.safeParse(rawConfig);

  const [submitted, setSubmitted] = useState(false);
  const [response, setResponse] = useState('');

  const content = parsed.success ? parsed.data : null;
  const isInteractive = content?.interactive ?? false;

  useEffect(() => {
    if (!parsed.success) return;
    if (isInteractive || submitted) return;
    const timer = setTimeout(() => {
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'open-edu.real-world',
        action: 'observe',
        observed: true,
        correct: true,
      });
      complete(100);
      setSubmitted(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [parsed.success, isInteractive, submitted, emitInteraction, complete]);

  const handleComplete = () => {
    if (!content) return;

    const interactionData: Record<string, unknown> = {
      type: 'widget.interaction',
      widgetId: 'open-edu.real-world',
      action: 'submit',
      response,
      correct: true,
    };

    if (content.expectedAnswer && response) {
      interactionData.expectedAnswer = content.expectedAnswer;
      interactionData.responseExactMatch =
        response.trim().toLowerCase() === content.expectedAnswer.trim().toLowerCase();
    }

    emitInteraction(interactionData);
    complete(100);
    setSubmitted(true);
  };

  if (!parsed.success) {
    return (
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid real world configuration.</p>
      </div>
    );
  }

  const { scenario, taskDescription, prompt, visualExample, hint } = parsed.data;

  if (!isInteractive) {
    return (
      <div data-testid="real-world-observe">
        <article aria-label="Real World Scenario">
          {visualExample && <span aria-hidden="true">{visualExample} </span>}
          <p>{scenario}</p>
        </article>
        {taskDescription && <p data-testid="task-description">{taskDescription}</p>}
        {prompt && (
          <p data-testid="prompt" aria-label="Prompt">
            {prompt}
          </p>
        )}
        {submitted && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Completed.</p>
          </div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div data-testid="real-world">
        <article aria-label="Real World Scenario">
          {visualExample && <span aria-hidden="true">{visualExample} </span>}
          <p>{scenario}</p>
        </article>
        {taskDescription && <p>{taskDescription}</p>}
        {prompt && <p>{prompt}</p>}
        <div role="status" aria-live="assertive" data-testid="real-world-result">
          <p>Task completed.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="real-world">
      <article aria-label="Real World Scenario">
        {visualExample && <span aria-hidden="true">{visualExample} </span>}
        <p>{scenario}</p>
      </article>
      {taskDescription && <p data-testid="task-description">{taskDescription}</p>}
      {prompt && (
        <p data-testid="prompt" aria-label="Prompt">
          {prompt}
        </p>
      )}
      {hint && (
        <p data-testid="hint" aria-label="Hint">
          {hint}
        </p>
      )}
      <div>
        <label htmlFor="real-world-response" data-testid="response-label">
          {prompt ?? 'Your response:'}
        </label>
        <textarea
          id="real-world-response"
          data-testid="response-textarea"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={4}
          aria-describedby={hint ? 'real-world-hint' : undefined}
        />
      </div>
      <button onClick={handleComplete} data-testid="complete-task-button">
        I Completed This Task
      </button>
    </div>
  );
}

const RealWorldWidget: WidgetDefinition = {
  id: 'open-edu.real-world',
  version: '0.1.0',
  render: RealWorldComponent,
};

export { RealWorldWidget as realWorld };
export default RealWorldWidget;
