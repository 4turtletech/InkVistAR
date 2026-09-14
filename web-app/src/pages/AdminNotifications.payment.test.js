import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Axios from 'axios';
import AdminNotifications from './AdminNotifications';
import PaymentAlertOverlay from '../components/PaymentAlertOverlay';

jest.mock('axios');
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../components/AdminSideNav', () => () => null);
jest.mock('../components/Pagination', () => () => null);

const alerts = [{
    id: 197,
    client_name: 'Payment Test Client',
    design_title: 'Test Design',
    price: 1000,
    total_paid: 200,
}];

const pollAlerts = () => act(() => {
    window.dispatchEvent(new CustomEvent('payment-alert', { detail: { alerts } }));
});

beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    Axios.get.mockImplementation(url => Promise.resolve({
        data: url.includes('pending-payment-alerts')
            ? { success: true, alerts }
            : { success: true, data: [], notifications: [] },
    }));
});

test('notification button and card reopen a dismissed payment popup without polling reopening it', async () => {
    render(<><AdminNotifications /><PaymentAlertOverlay /></>);
    const takeAction = await screen.findByRole('button', { name: 'Take Action' });

    pollAlerts();
    expect(screen.getByText('Payment Test Client')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    pollAlerts();
    expect(screen.queryByText('Payment Test Client')).not.toBeInTheDocument();

    fireEvent.click(takeAction);
    expect(screen.getByText('Payment Test Client')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Record Payment' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    fireEvent.click(screen.getByText('Payment Resolution Required'));
    expect(screen.getByText('Payment Test Client')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    pollAlerts();
    expect(screen.queryByText('Payment Test Client')).not.toBeInTheDocument();
});

test('Take Action opens after a dismissal saved before mounting the notification page', async () => {
    sessionStorage.setItem('paymentAlertShown', 'true');
    render(<><AdminNotifications /><PaymentAlertOverlay /></>);
    const takeAction = await screen.findByRole('button', { name: 'Take Action' });

    pollAlerts();
    expect(screen.queryByText('Payment Test Client')).not.toBeInTheDocument();
    fireEvent.click(takeAction);
    expect(screen.getByText('Payment Test Client')).toBeVisible();
    expect(Axios.post).not.toHaveBeenCalled();
});
