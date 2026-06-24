import { useState } from 'react';
import type { WidgetDefinition } from '../types';

interface Option {
  id: string;
  text: string;
  correct?: boolean;
}

function PracticeWidgetComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config, emitInteraction, complete } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const options = Array.isArray(config.options) ? (config.options as Option[]) : [];
  const prompt = typeof config.prompt === 'string' ? config.prompt : '';
  const explanation = typeof config.explanation === 'string' ? config.explanation : undefined;

  if (!prompt || options.length === 0) {
    return (
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid widget configuration: missing prompt or options.</p>
      </div>
    );
  }

  const correctOption = options.find((o) => o.correct);
  const isCorrect = submitted && selectedId === correctOption?.id;

  const handleSubmit = () => {
    if (!selectedId || submitted) return;
    setSubmitted(true);
    const score = selectedId === correctOption?.id ? 100 : 0;
    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'open-edu.multiple-choice-practice',
      action: 'submit',
      selectedId,
      score,
    });
    complete(score);
  };

  return (
    <div role="group" aria-label={prompt} data-testid="multiple-choice-practice">
      <p>{prompt}</p>
      {options.map((opt) => (
        <label key={opt.id} style={{ display: 'block', margin: '0.5em 0' }}>
          <input
            type="radio"
            name="practice-choice"
            value={opt.id}
            checked={selectedId === opt.id}
            onChange={() => !submitted && setSelectedId(opt.id)}
            disabled={submitted}
            aria-label={opt.text}
          />{' '}
          {opt.text}
        </label>
      ))}
      <button onClick={handleSubmit} disabled={!selectedId || submitted}>
        {submitted ? (isCorrect ? 'Correct!' : 'Incorrect') : 'Submit'}
      </button>
      {submitted && explanation && <p role="status">{explanation}</p>}
    </div>
  );
}

const PracticeWidget: WidgetDefinition = {
  id: 'open-edu.multiple-choice-practice',
  version: '0.1.0',
  render: PracticeWidgetComponent,
};

export { PracticeWidget as multipleChoicePractice };
export default PracticeWidget;
