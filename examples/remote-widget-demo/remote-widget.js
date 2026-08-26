// LEGACY trusted-remote (same-realm) demo.
// ---------------------------------------------------------------
// This file demonstrates the OLD trusted-remote pattern where the
// widget bundle is loaded in the same JavaScript realm as the host
// and receives host-scope globals directly.
//
// NOTE: window.React in the host scope is DEPRECATED for community
// widgets. Community widgets must be framework-agnostic and must NOT
// assume React (or any framework) is bundled/available in the host.
//
// Instead, community widgets should talk to the host through the
// sandboxed open-edu.widget/1 postMessage protocol. Use the SDK's
// createWidgetHostClient (from @open-edu/widget-sdk) to send and
// receive protocol envelopes inside a sandboxed iframe.
//
// This file is kept byte-identical (apart from this comment) so it
// continues to function for legacy trusted-remote opt-in tests. New
// widgets should target the sandboxed protocol instead.
// ---------------------------------------------------------------
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
