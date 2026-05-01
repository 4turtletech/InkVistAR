import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

const CustomSelect = ({ value, onChange, options, icon: Icon, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="custom-select-wrapper" ref={dropdownRef}>
            {label && (
                <div className="premium-filter-item-label">
                    {Icon && <Icon size={16} />} <span>{label}</span>
                </div>
            )}
            <div 
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedOption?.label}</span>
                <ChevronDown size={16} className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`} />
            </div>
            
            <div className={`custom-select-dropdown ${isOpen ? 'visible' : ''}`}>
                {options.map((option, index) => (
                    <div 
                        key={option.value}
                        className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
                        onClick={() => {
                            onChange(option.value);
                            setIsOpen(false);
                        }}
                        style={isOpen ? { animationDelay: `${index * 0.03}s` } : {}}
                    >
                        {option.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomSelect;
