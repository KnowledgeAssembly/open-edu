// Self-contained remote widget bundle for demonstration.
// In production, this file would be hosted on a CDN.
// Relies on React being available in the host page global scope.
export default {
  id: 'open-edu.remote-practice',
  version: '1.0.0',
  render: (props) => {
    const React = window.React;
    const { useState, useEffect } = React;
    const { nodeId, config, complete } = props;
    const questions = config.questions || [];
    const [current, setCurrent] = useState(0);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);

    if (done) {
      return React.createElement(
        'div',
        { 'data-testid': 'remote-widget-result' },
        React.createElement('h3', null, 'Practice Complete!'),
        React.createElement('p', null, 'Score: ' + score + '/' + questions.length),
        React.createElement('button', { onClick: () => complete(score) }, 'Continue'),
      );
    }

    const q = questions[current];
    if (!q) {
      return React.createElement('div', null, 'No questions configured.');
    }

    const options = q.options.map((opt) =>
      React.createElement(
        'button',
        {
          key: opt.id,
          'data-testid': 'option-' + opt.id,
          onClick: () => {
            const newScore = opt.correct ? score + 1 : score;
            if (current + 1 >= questions.length) {
              setScore(newScore);
              setDone(true);
            } else {
              setScore(newScore);
              setCurrent(current + 1);
            }
          },
        },
        opt.text,
      ),
    );

    return React.createElement(
      'div',
      { 'data-testid': 'remote-widget-practice' },
      React.createElement('h3', null, q.question),
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        ...options,
      ),
    );
  },
};
