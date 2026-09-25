import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Axios from 'axios';
import GuestFeedbackModal from './GuestFeedbackModal';

afterEach(() => {
    jest.restoreAllMocks();
});

test('requires a rating or comment and submits guest feedback inline', async () => {
    const post = jest.spyOn(Axios, 'post').mockResolvedValue({ data: { success: true } });
    render(<GuestFeedbackModal isOpen onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please select a rating or write a short comment.');
    expect(post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit feedback' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.stringContaining('/api/guest-feedback'), expect.objectContaining({ rating: 5 })));
    expect(await screen.findByText('Thank you for sharing.')).toBeInTheDocument();
});
