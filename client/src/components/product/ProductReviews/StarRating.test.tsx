// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders 5 stars correctly', () => {
    const { container } = render(<StarRating rating={4} />);
    const starWrappers = container.querySelectorAll('.relative');
    expect(starWrappers.length).toBe(5);
  });

  it('renders full stars and empty stars for integer ratings', () => {
    const { container } = render(<StarRating rating={3} />);
    const filledOverlays = container.querySelectorAll('div[style*="width: 100%"]');
    expect(filledOverlays.length).toBe(3);
  });

  it('renders half star fractional clip (50% width) for half-star ratings like 4.5', () => {
    const { container } = render(<StarRating rating={4.5} />);
    const fullFilled = container.querySelectorAll('div[style*="width: 100%"]');
    const halfFilled = container.querySelectorAll('div[style*="width: 50%"]');
    expect(fullFilled.length).toBe(4);
    expect(halfFilled.length).toBe(1);
  });

  it('renders half star fractional clip for 3.5 rating', () => {
    const { container } = render(<StarRating rating={3.5} />);
    const fullFilled = container.querySelectorAll('div[style*="width: 100%"]');
    const halfFilled = container.querySelectorAll('div[style*="width: 50%"]');
    expect(fullFilled.length).toBe(3);
    expect(halfFilled.length).toBe(1);
  });

  it('allows clicking left half of a star to select half-star rating (e.g. 4.5)', () => {
    const handleChange = vi.fn();
    render(<StarRating rating={0} interactive onRatingChange={handleChange} />);

    const halfButtons = screen.getAllByRole('button');
    // Each star has 2 hitboxes: left (half) and right (full), so 10 buttons total
    expect(halfButtons.length).toBe(10);

    // Click 4.5 star (Star 5 left half, index 8)
    const star5Left = screen.getByLabelText('4.5 stars');
    fireEvent.click(star5Left);
    expect(handleChange).toHaveBeenCalledWith(4.5);

    // Click 3.5 star (Star 4 left half, index 6)
    const star4Left = screen.getByLabelText('3.5 stars');
    fireEvent.click(star4Left);
    expect(handleChange).toHaveBeenCalledWith(3.5);
  });

  it('allows clicking right half of a star to select full star rating (e.g. 4.0)', () => {
    const handleChange = vi.fn();
    render(<StarRating rating={0} interactive onRatingChange={handleChange} />);

    const star4Right = screen.getByLabelText('4 stars');
    fireEvent.click(star4Right);
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('updates preview fill on hover over half star', () => {
    const { container } = render(<StarRating rating={2} interactive />);
    const star4Left = screen.getByLabelText('3.5 stars');
    
    fireEvent.mouseEnter(star4Left);
    const halfFilledOnHover = container.querySelectorAll('div[style*="width: 50%"]');
    const fullFilledOnHover = container.querySelectorAll('div[style*="width: 100%"]');
    expect(fullFilledOnHover.length).toBe(3);
    expect(halfFilledOnHover.length).toBe(1);
  });
});
