import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const MultiSelectDropdown = ({ 
    options = [], 
    selectedStr = '', 
    onChange, 
    placeholder = "Select options..." 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Parse incoming comma-separated string into an array
    const selectedArray = (selectedStr || '').split(',').map(s => s.trim()).filter(s => s);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        let newSelection = [...selectedArray];
        if (newSelection.includes(option)) {
            newSelection = newSelection.filter(item => item !== option);
        } else {
            newSelection.push(option);
        }
        onChange(newSelection.join(', '));
    };

    // Calculate display text
    let displayText = placeholder;
    if (selectedArray.length === 1) {
        displayText = selectedArray[0];
    } else if (selectedArray.length > 1) {
        displayText = `${selectedArray.length} items selected`;
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
            <div 
                className="form-input" 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    background: '#fff',
                    borderColor: isOpen ? '#daa520' : '#e2e8f0',
                    boxShadow: isOpen ? '0 0 0 2px rgba(218, 165, 32, 0.2)' : 'none'
                }}
            >
                <span style={{ color: selectedArray.length > 0 ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayText}
                </span>
                <ChevronDown size={16} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {options.map((option) => {
                        const isSelected = selectedArray.includes(option);
                        return (
                            <div 
                                key={option}
                                onClick={() => toggleOption(option)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    background: isSelected ? 'rgba(218, 165, 32, 0.1)' : 'transparent',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    border: `1px solid ${isSelected ? '#daa520' : '#cbd5e1'}`,
                                    background: isSelected ? '#daa520' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px',
                                    flexShrink: 0,
                                    transition: 'all 0.2s'
                                }}>
                                    {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                                </div>
                                <span style={{ 
                                    fontSize: '0.9rem', 
                                    color: isSelected ? '#daa520' : '#334155',
                                    fontWeight: isSelected ? '500' : '400'
                                }}>
                                    {option}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
