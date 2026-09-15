import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Axios from 'axios';
import CustomerAftercare from './CustomerAftercare';
import AppointmentAftercareLink from '../components/AppointmentAftercareLink';

jest.mock('axios');
jest.mock('../components/CustomerSideNav', () => () => null);
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams('appointmentId=111')],
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem('user', JSON.stringify({ id: 71 }));
});

test.each(['paid', 'unpaid', 'downpayment_paid'])('completed %s bookings retain an appointment-specific Aftercare link', (payment_status) => {
  render(<AppointmentAftercareLink appointment={{ id: 111, status: 'completed', service_type: 'General Session', payment_status }} />);
  expect(screen.getByRole('link', { name: 'View Aftercare' })).toHaveAttribute('href', '/customer/aftercare?appointmentId=111');
});

test.each(['Piercing', 'Consultation'])('does not advertise tattoo aftercare for %s', (service_type) => {
  render(<AppointmentAftercareLink appointment={{ id: 111, status: 'completed', service_type }} />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('unknown completed procedure explains the data problem instead of claiming no completed session', async () => {
  Axios.get.mockResolvedValue({ data: { success: true, active: false, reason: 'service_confirmation_required' } });
  render(<CustomerAftercare />);
  expect(await screen.findByText('Session type needs confirmation')).toBeInTheDocument();
  expect(Axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/customer/aftercare/71'), { params: { appointmentId: '111' } });
  expect(screen.queryByText('No Active Aftercare')).not.toBeInTheDocument();
});

test('network failure has a retry instead of a false no-aftercare message', async () => {
  Axios.get.mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: { success: true, active: false, reason: 'outside_tracking_window' } });
  render(<CustomerAftercare />);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not load');
  expect(screen.queryByText('No Active Aftercare')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  expect(await screen.findByText('Tracking period has ended')).toBeInTheDocument();
});

test('eligible appointment loads its personalized tracker', async () => {
  Axios.get.mockResolvedValue({ data: { success: true, active: true, aftercare: {
    appointmentId: 111, designTitle: 'Rose Test', artistName: 'Test Artist',
    completedDate: '2026-09-14', currentDay: 1, totalDays: 30, phase: 'initial',
  }, templates: [] } });
  render(<CustomerAftercare />);
  expect(screen.getByText('Loading aftercare data...')).toBeInTheDocument();
  expect(await screen.findByText('Rose Test')).toBeInTheDocument();
  expect(screen.queryByText('No Active Aftercare')).not.toBeInTheDocument();
});
