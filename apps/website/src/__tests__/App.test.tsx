import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('App shell', () => {
  it('renders the themed shell without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(container.querySelector('.open-edu-runtime')).toBeInTheDocument();
  });
});
