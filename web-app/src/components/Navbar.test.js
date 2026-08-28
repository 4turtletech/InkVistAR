import React from 'react';
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';

const mockLocation = { pathname: '/artist/42' };

jest.mock('react-router-dom', () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useLocation: () => mockLocation,
    useNavigate: () => jest.fn(),
}), { virtual: true });

describe('Navbar public section state', () => {
    beforeEach(() => {
        localStorage.clear();
        mockLocation.pathname = '/artist/42';
    });

    test('keeps Artists active on an artist profile route', () => {
        render(<Navbar />);

        expect(screen.getByRole('link', { name: 'Artists' })).toHaveClass('active-link');
    });

    test('does not activate Artists for the artist portal route', () => {
        mockLocation.pathname = '/artist';
        render(<Navbar />);

        expect(screen.getByRole('link', { name: 'Artists' })).not.toHaveClass('active-link');
    });
});
