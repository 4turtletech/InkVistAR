import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ChatWidget from './ChatWidget';

const mockSocket = {
  connected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
};
const mockIo = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: (...args) => mockIo(...args),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  sessionStorage.clear();
  mockIo.mockClear();
  mockIo.mockImplementation(() => mockSocket);
  mockSocket.connect.mockClear();
  mockSocket.disconnect.mockClear();
  mockSocket.emit.mockClear();
  mockSocket.on.mockClear();
});

test('does not initialize Socket.IO while the visitor uses AI chat', () => {
  render(<ChatWidget initiallyOpen />);

  expect(mockIo).not.toHaveBeenCalled();
});

test('initializes Socket.IO when the visitor selects live support', () => {
  render(<ChatWidget initiallyOpen />);

  fireEvent.click(screen.getByTitle('Switch to Live Agent'));

  expect(mockIo).toHaveBeenCalledTimes(1);
  expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});

test('keeps the existing immediate connection for admin chat', () => {
  render(<ChatWidget isAdminMode room="support-room" />);

  expect(mockIo).toHaveBeenCalledTimes(1);
  expect(mockSocket.connect).toHaveBeenCalledTimes(1);
});
