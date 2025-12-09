import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  test('renders hero content', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /build confident, transparent pricing in minutes/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/wine pricing studio/i)).toBeInTheDocument();
    expect(
      screen.getByText(/capture supplier costs, logistics, and margin expectations/i)
    ).toBeInTheDocument();
  });

  test('renders calculator sections', () => {
    render(<App />);

    expect(screen.getByText(/product basics/i)).toBeInTheDocument();
    expect(screen.getByText(/logistics & margins/i)).toBeInTheDocument();
    expect(screen.getByText(/sales assumptions/i)).toBeInTheDocument();
  });
});
