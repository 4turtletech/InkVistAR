import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

test('names social links and exposes the terms link', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: 'InkVictus on Instagram' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'InkVictus on Facebook' })).toHaveAttribute('target', '_blank');
    expect(screen.getAllByRole('link', { name: 'Terms & Conditions' })).toHaveLength(2);
});
