import { type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it, vi } from 'vitest';
import { HotspotDemo } from '../ui/demos/HotspotDemo';
import { ImageCompareDemo } from '../ui/demos/ImageCompareDemo';
import { LabelDiagramDemo } from '../ui/demos/LabelDiagramDemo';
import { QuizDemo } from '../ui/demos/QuizDemo';
import { TimelineDemo } from '../ui/demos/TimelineDemo';
import { dictionaries } from '../i18n-dictionaries';

function renderDemo(demo: ReactNode): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">{demo}</RuntimeThemeProvider>
    </I18nProvider>,
  );
}

describe('QuizDemo', () => {
  it('shows the question and 3 option buttons', () => {
    renderDemo(<QuizDemo />);
    expect(screen.getByText('2 + 3 = ?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
  });

  it('shows success feedback when the correct option 5 is clicked', () => {
    renderDemo(<QuizDemo />);
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(screen.getByText(/Correct!/)).toBeInTheDocument();
  });

  it('shows error feedback when option 4 is clicked', () => {
    renderDemo(<QuizDemo />);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
  });

  it('re-enables options and clears feedback via Try another', () => {
    renderDemo(<QuizDemo />);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(screen.getByRole('button', { name: '4' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Try another' }));
    expect(screen.queryByText(/Not quite/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeEnabled();
  });
});

describe('TimelineDemo', () => {
  it('renders 4 milestone nodes and the instruction', () => {
    renderDemo(<TimelineDemo />);
    expect(screen.getByText('Select a year to explore.')).toBeInTheDocument();
    ['1947', '1965', '1991', '2000'].forEach((year) => {
      expect(screen.getByRole('button', { name: year })).toBeInTheDocument();
    });
  });

  it('shows the 1965 description when its node is clicked', () => {
    renderDemo(<TimelineDemo />);
    fireEvent.click(screen.getByRole('button', { name: '1965' }));
    expect(screen.getByText(/Green Revolution/)).toBeInTheDocument();
  });

  it('updates the panel when a different milestone is selected', () => {
    renderDemo(<TimelineDemo />);
    fireEvent.click(screen.getByRole('button', { name: '1965' }));
    expect(screen.getByText(/Green Revolution/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1991' }));
    expect(screen.getByText(/Economic reforms/)).toBeInTheDocument();
    expect(screen.queryByText(/Green Revolution/)).not.toBeInTheDocument();
  });
});

describe('ImageCompareDemo', () => {
  it('renders a range slider with the compare aria-label', () => {
    renderDemo(<ImageCompareDemo />);
    const slider = screen.getByRole('slider', { name: 'Drag to compare' });
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
  });

  it('updates the after-layer clip-path when the slider changes', () => {
    renderDemo(<ImageCompareDemo />);
    const slider = screen.getByRole('slider', { name: 'Drag to compare' });
    fireEvent.change(slider, { target: { value: '70' } });
    expect(screen.getByTestId('image-compare-after')).toHaveStyle('clip-path: inset(0 0 0 70%)');
    expect(screen.getByRole('slider', { name: 'Drag to compare' })).toHaveAttribute(
      'aria-valuetext',
      '70%',
    );
  });
});

describe('HotspotDemo', () => {
  it('renders 4 hotspot pins with accessible labels and the instruction', () => {
    renderDemo(<HotspotDemo />);
    expect(screen.getByText('Tap a pin to learn more.')).toBeInTheDocument();
    ['Crater', 'Conduit', 'Magma Chamber', 'Lava Flow'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('shows the crater info when the crater pin is clicked', () => {
    renderDemo(<HotspotDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Crater' }));
    expect(screen.getByText(/bowl-shaped mouth/)).toBeInTheDocument();
  });

  it('switches info when another pin is clicked', () => {
    renderDemo(<HotspotDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Crater' }));
    expect(screen.getByText(/bowl-shaped mouth/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lava Flow' }));
    expect(screen.getByText(/Molten rock as it pours down/)).toBeInTheDocument();
    expect(screen.queryByText(/bowl-shaped mouth/)).not.toBeInTheDocument();
  });
});

describe('LabelDiagramDemo', () => {
  it('renders the 4 labels, 4 drop targets, instruction, and reset button', () => {
    renderDemo(<LabelDiagramDemo />);
    expect(
      screen.getByText('Drag each label to the correct part of the flower.'),
    ).toBeInTheDocument();
    ['Petal', 'Stem', 'Leaf', 'Root'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Drop ${label} here` })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('shows success when all 4 labels are placed correctly', () => {
    renderDemo(<LabelDiagramDemo />);
    const labels = ['Petal', 'Stem', 'Leaf', 'Root'];
    for (const label of labels) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      fireEvent.click(screen.getByRole('button', { name: `Drop ${label} here` }));
    }
    expect(screen.getByText('Well done! The flower is labeled.')).toBeInTheDocument();
  });

  it('does not show success when a label is placed in the wrong spot', () => {
    renderDemo(<LabelDiagramDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Petal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Drop Stem here' }));
    expect(screen.queryByText('Well done! The flower is labeled.')).not.toBeInTheDocument();
  });

  it('overwrites an occupied target and returns the displaced label to the palette', () => {
    renderDemo(<LabelDiagramDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Petal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Drop Stem here' }));
    expect(screen.getByRole('button', { name: 'Petal' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Leaf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Drop Stem here' }));
    expect(screen.getByRole('button', { name: 'Petal' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Leaf' })).toBeDisabled();
    expect(screen.queryByText('Well done! The flower is labeled.')).not.toBeInTheDocument();
  });

  it('resets placements and re-enables the labels', () => {
    renderDemo(<LabelDiagramDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Petal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Drop Petal here' }));
    expect(screen.getByRole('button', { name: 'Petal' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: 'Petal' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Drop Petal here' })).toBeInTheDocument();
  });

  it('places labels via drag-and-drop', () => {
    renderDemo(<LabelDiagramDemo />);
    const parts: Array<[string, string]> = [
      ['Petal', 'petal'],
      ['Stem', 'stem'],
      ['Leaf', 'leaf'],
      ['Root', 'root'],
    ];
    for (const [label, id] of parts) {
      fireEvent.dragStart(screen.getByRole('button', { name: label }), {
        dataTransfer: { setData: vi.fn(), effectAllowed: 'move', dropEffect: 'move' },
      });
      fireEvent.drop(screen.getByRole('button', { name: `Drop ${label} here` }), {
        dataTransfer: { getData: () => id },
      });
    }
    expect(screen.getByText('Well done! The flower is labeled.')).toBeInTheDocument();
  });
});
