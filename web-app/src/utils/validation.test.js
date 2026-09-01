import { normalizePhilippineMobileNumber } from './validation';

describe('Philippine mobile number validation', () => {
    test.each([
        ['09171234567', '+639171234567'],
        ['9171234567', '+639171234567'],
        ['+639171234567', '+639171234567'],
        ['+63 917 123 4567', '+639171234567'],
        ['63-917-123-4567', '+639171234567'],
    ])('normalizes %s', (input, expected) => {
        expect(normalizePhilippineMobileNumber(input)).toBe(expected);
    });

    test.each(['asddasd', 'abc09171234567', '09+171234567', '08171234567', '0917123456', '+6391712345678', '', null])(
        'rejects invalid value %p',
        (input) => {
            expect(normalizePhilippineMobileNumber(input)).toBeNull();
        }
    );
});
