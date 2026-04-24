import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { COUNTRY_CODES } from '../constants/countryCodes';

/**
 * CountryCodeSelect — compact country code picker.
 * Shows only the dial code (e.g. "+63") when closed.
 * Shows full country name + code in the dropdown list.
 *
 * Props:
 *   value    — current code string, e.g. "+63"
 *   onChange — callback(newCode)
 *   style    — optional style overrides for the wrapper
 *   className — optional className for the wrapper
 */
function CountryCodeSelect({ value, onChange, style, className }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);
    const searchRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Focus search when opened
    useEffect(() => {
        if (open && searchRef.current) searchRef.current.focus();
    }, [open]);

    // Build list: Philippines pinned at top, rest alphabetical, filtered by search
    const phEntry = COUNTRY_CODES.find(c => c.code === '+63');
    const rest = COUNTRY_CODES.filter(c => c.code !== '+63');
    const allEntries = phEntry ? [phEntry, ...rest] : rest;

    const filtered = search
        ? allEntries.filter(c =>
            c.country.toLowerCase().includes(search.toLowerCase()) ||
            c.code.includes(search)
        )
        : allEntries;

    return (
        <div
            ref={wrapperRef}
            className={className}
            style={{
                position: 'relative',
                display: 'inline-block',
                minWidth: '80px',
                borderRadius: '6px',
                ...style
            }}
        >
            {/* Collapsed display — shows only the dial code */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%',
                    height: '100%',
                    padding: '10px 28px 10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'inherit',
                    backgroundColor: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    outline: 'none',
                    boxSizing: 'border-box',
                    ...(open ? { borderColor: '#be9055', boxShadow: '0 0 0 2px rgba(190,144,85,0.15)' } : {})
                }}
            >
                {value || '+63'}
                {/* Dropdown arrow */}
                <span style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})`,
                    transition: 'transform 0.2s',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center'
                }}><ChevronDown size={14} /></span>
            </button>

            {/* Dropdown panel */}
            {open && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    minWidth: '260px',
                    maxHeight: '240px',
                    marginTop: '4px',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 9999,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Search input */}
                    <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search country..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '7px 10px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '5px',
                                fontSize: '0.85rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            onFocus={e => e.target.style.borderColor = '#be9055'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    {/* Options list */}
                    <div style={{ overflowY: 'auto', maxHeight: '190px' }}>
                        {filtered.length === 0 && (
                            <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                                No countries found
                            </div>
                        )}
                        {filtered.map(c => (
                            <div
                                key={c.code + c.country}
                                onClick={() => {
                                    onChange(c.code);
                                    setOpen(false);
                                    setSearch('');
                                }}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    color: c.code === value ? '#be9055' : '#334155',
                                    fontWeight: c.code === value ? '600' : '400',
                                    backgroundColor: c.code === value ? 'rgba(190,144,85,0.06)' : 'transparent',
                                    transition: 'background-color 0.15s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(190,144,85,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = c.code === value ? 'rgba(190,144,85,0.06)' : 'transparent'}
                            >
                                <span>{c.country}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>{c.code}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CountryCodeSelect;
