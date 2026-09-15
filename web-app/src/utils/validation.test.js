import { artistProfileErrors, composeCustomerName, customerProfileErrors, isStrongPassword, normalizePhilippineMobileNumber, normalizeProfileText, passwordStrengthFeedback, profileNameError, suggestCustomerNameParts } from './validation';

describe('password validation', () => {
    test('accepts the same special characters as the backend policy', () => {
        expect(isStrongPassword('Hello@_1234')).toBe(true);
        expect(passwordStrengthFeedback('Hello_1234').hasSymbol).toBe(true);
        expect(isStrongPassword('hello_1234')).toBe(false);
        expect(isStrongPassword('HelloWorld1')).toBe(false);
    });
});

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

describe('profile validation', () => {
    test.each([null, undefined, ''])('keeps missing optional name fields blank when reopening a profile (%p)', (emptyValue) => {
        // The API returns database NULL for optional name parts cleared on save.
        const savedProfile = {
            first_name: 'Jean Angela', middle_name: emptyValue,
            last_name: 'Bautista', suffix: emptyValue,
        };
        expect(normalizeProfileText(emptyValue)).toBe('');
        expect(suggestCustomerNameParts(savedProfile)).toEqual({
            first_name: 'Jean Angela', middle_name: '', last_name: 'Bautista',
            suffix: '', name_needs_review: false,
        });
        expect(composeCustomerName(savedProfile)).toBe('Jean Angela Bautista');
        expect(customerProfileErrors({ ...savedProfile, phone: '9171234567' })).toEqual({});
    });

    test('does not accept database null as a required name or specialization', () => {
        expect(customerProfileErrors({ first_name: null, last_name: null, phone: '9171234567' }))
            .toMatchObject({ first_name: 'First name is required.', last_name: 'Last name is required.' });
        expect(artistProfileErrors({ name: null, specialization: null, experience_years: 5 }))
            .toMatchObject({ name: 'Full name is required.', specialization: 'Select at least one specialization.' });
    });

    test('artist profile validates identity and professional fields together', () => {
        expect(artistProfileErrors({ name: 'Juan Dela Cruz', phone: '+639171234567', experience_years: 5, specialization: 'Realism', bio: '' })).toEqual({});
        const errors = artistProfileErrors({ name: ' ', phone: '+6312', experience_years: 2.5, specialization: '', bio: 'x'.repeat(1001) });
        expect(errors).toMatchObject({ name: expect.any(String), phone: expect.any(String), experience_years: expect.any(String), specialization: expect.any(String), bio: expect.any(String) });
    });

    test('customer profile validates name, PH phone, and text limits', () => {
        expect(customerProfileErrors({ name: 'Maria Santos', phone: '9171234567', location: 'Pasay', preferences: '' })).toEqual({});
        expect(customerProfileErrors({ name: 'M', phone: '123', location: 'x'.repeat(201), preferences: 'x'.repeat(501) }))
            .toMatchObject({ name: expect.any(String), phone: expect.any(String), location: expect.any(String), preferences: expect.any(String) });
        expect(profileNameError(' ')).toBeTruthy();
        expect(normalizeProfileText('  Pasay <City>\n')).toBe('Pasay City');
    });

    test('customer structured names compose safely and legacy names remain editable', () => {
        const structured = { first_name: 'María', middle_name: 'Lourdes', last_name: 'de la Cruz', suffix: 'Jr.' };
        expect(composeCustomerName(structured)).toBe('María Lourdes de la Cruz Jr.');
        expect(customerProfileErrors({ ...structured, phone: '9171234567', location: '', preferences: '' })).toEqual({});
        expect(customerProfileErrors({ ...structured, last_name: '', phone: '9171234567' })).toHaveProperty('last_name');
        expect(suggestCustomerNameParts({ name: 'Angela Bautista', name_needs_review: true })).toEqual({
            first_name: 'Angela', middle_name: '', last_name: 'Bautista', suffix: '', name_needs_review: true,
        });
    });
});
