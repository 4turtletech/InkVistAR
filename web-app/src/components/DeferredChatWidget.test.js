import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DeferredChatWidget from './DeferredChatWidget';

jest.mock('./ChatWidget', () => ({
  __esModule: true,
  default: ({ initiallyOpen }) => (
    <div data-testid="full-chat-widget" data-initially-open={String(initiallyOpen)} />
  ),
}));

test('loads and opens the full chat only after the launcher is selected', async () => {
  render(<DeferredChatWidget />);

  expect(screen.queryByTestId('full-chat-widget')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open chat assistant' }));

  const chat = await screen.findByTestId('full-chat-widget');
  expect(chat).toHaveAttribute('data-initially-open', 'true');
});
