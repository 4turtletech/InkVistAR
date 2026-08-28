import React from 'react';
import { render } from '@testing-library/react';
import Axios from 'axios';
import PublicArtistProfile from './PublicArtistProfile';

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        get: jest.fn(() => new Promise(() => {})),
    },
}));

jest.mock('../config', () => ({ API_URL: 'http://test.local' }));

jest.mock('react-router-dom', () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useNavigate: () => jest.fn(),
    useParams: () => ({ id: '42' }),
}), { virtual: true });

jest.mock('../components/Navbar', () => () => <nav>Navbar</nav>);
jest.mock('../components/Footer', () => () => <footer>Footer</footer>);
jest.mock('../components/DeferredChatWidget', () => () => null);

test('starts an artist profile at the top of the page', () => {
    Axios.get.mockImplementation(() => new Promise(() => {}));
    const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(<PublicArtistProfile />);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    scrollTo.mockRestore();
});
