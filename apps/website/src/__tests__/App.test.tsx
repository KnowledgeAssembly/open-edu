import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from '../router';

function renderAt(path: string): void {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

describe('App shell', () => {
  it('renders the themed shell without crashing', () => {
    renderAt('/');
    expect(document.querySelector('.open-edu-runtime')).toBeInTheDocument();
  });

  it('renders the hero headline at /', () => {
    renderAt('/');
    expect(
      screen.getByRole('heading', { name: 'Learning that adapts to every child' }),
    ).toBeInTheDocument();
  });

  it('renders the courses page heading at /courses', () => {
    renderAt('/courses');
    expect(screen.getByRole('heading', { name: 'Explore Courses' })).toBeInTheDocument();
  });
});
