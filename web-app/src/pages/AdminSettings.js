import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Save, Download, Upload, FileText, Bell, Database, Info, Shield, Image } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { filterName, filterDigits } from '../utils/validation';
import './AdminSettings.css';
import './AdminStyles.css';
import { API_URL } from '../config';

function AdminSettings() {
    const [settings, setSettings] = useState({
        studio: {
            name: 'InkVistAR Studio',
            email: 'contact@inkvistrar.com',
            phone: '+1-555-0100',
            address: '123 Art Street, City, State 12345',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            openingTime: '09:00',
            closingTime: '18:00',
            description: 'Premium tattoo and piercing studio'
        },
        policies: {
            terms: 'By booking an appointment, you agree to our terms of service regarding hygiene, conduct, and payment.',
            deposit: 'A non-refundable deposit of 20% is required to secure your booking. This amount will be deducted from the final price.',
            cancellation: 'Cancellations must be made at least 48 hours in advance. Late cancellations may result in forfeiture of the deposit.'
        },
        care: {
            instructions: `1. Leave the bandage on for 2-4 hours.
2. Wash your hands before touching the tattoo.
3. Gently wash the tattoo with warm water and antibacterial soap.
4. Pat dry with a clean paper towel.
5. Apply a thin layer of recommended ointment.
6. Do not pick, scratch, or peel scabs.
7. Avoid swimming or soaking for 2 weeks.`
        },
        templates: {
            confirmation: 'Hi {client_name}, your appointment for {service} with {artist} on {date} at {time} has been confirmed.',
            reminder: 'Reminder: You have an appointment tomorrow at {time} for {service}. Please arrive 10 minutes early.',
            cancellation: 'Your appointment on {date} has been cancelled. Please contact us to reschedule.'
        },
        backup: {
            lastBackup: '2024-02-24 03:00 AM',
            autoBackup: true,
            frequency: 'daily'
        },
        gallery: {
            categories: 'All, Traditional, Realism, Watercolor, Tribal, New School, Neo Traditional, Japanese, Blackwork, Minimalist'
        }
    });

    const [activeTab, setActiveTab] = useState('studio');
    const [isSaved, setIsSaved] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });
    const [errors, setErrors] = useState({});

    const validateField = (section, field, value) => {
        let errorMsg = "";
        if (section === 'studio') {
            if ((field === 'name' || field === 'email' || field === 'phone' || field === 'address') && !value) {
                errorMsg = "This field is required";
            } else if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errorMsg = "Invalid email format";
            }
        } else if ((section === 'policies' || section === 'care' || section === 'templates') && !value) {
            errorMsg = "Content cannot be empty";
        }
        setErrors(prev => ({ ...prev, [`${section}_${field}`]: errorMsg }));
        return errorMsg === "";
    };

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({ isOpen: true, title, message, type, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/admin/settings`);
            if (res.data.success && res.data.data) {
                // Merge fetched settings with defaults
                setSettings(prev => ({ ...prev, ...res.data.data }));
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const handleChangeWithValidation = (section, field, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
        validateField(section, field, value);
    };

    const handleSave = async () => {
        let isValid = true;
        isValid = validateField('studio', 'name', settings.studio.name) && isValid;
        isValid = validateField('studio', 'email', settings.studio.email) && isValid;
        isValid = validateField('studio', 'phone', settings.studio.phone) && isValid;
        isValid = validateField('studio', 'address', settings.studio.address) && isValid;
        if (!isValid) {
            setActiveTab('studio');
            showAlert("Validation Error", "Please correct the highlighted errors.", "warning");
            return;
        }

        try {
            // Save all sections
            await Promise.all(Object.keys(settings).map(section => 
                Axios.post(`${API_URL}/api/admin/settings`, {
                    section: section,
                    data: settings[section]
                })
            ));
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            showAlert("Error", "Failed to save settings", "danger");
        }
    };

    const handleBackup = () => {
        showAlert("Backup Initiated", "Backup started... System will notify when complete.", "info");
    };

    const handleRestore = () => {
        document.getElementById('restore-input').click();
    };

    return (
        <div>
            <div className="admin-st-77aa706a">
                <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={18} className="admin-st-7f4ee4f3"/> Save Changes
                </button>
            </div>

            {isSaved && (
                <div className="success-message">
                    Settings saved successfully
                </div>
            )}

            <div className="settings-container">
                <div className="settings-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'studio' ? 'active' : ''}`}
                        onClick={() => setActiveTab('studio')}
                    >
                        <Info size={16} className="admin-st-7f4ee4f3"/> Studio Info
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'policies' ? 'active' : ''}`}
                        onClick={() => setActiveTab('policies')}
                    >
                        <Shield size={16} className="admin-st-7f4ee4f3"/> Terms & Policies
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'care' ? 'active' : ''}`}
                        onClick={() => setActiveTab('care')}
                    >
                        <FileText size={16} className="admin-st-7f4ee4f3"/> Care Instructions
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        <Bell size={16} className="admin-st-7f4ee4f3"/> Templates
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'backup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('backup')}
                    >
                        <Database size={16} className="admin-st-7f4ee4f3"/> Backup & Restore
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'gallery' ? 'active' : ''}`}
                        onClick={() => setActiveTab('gallery')}
                    >
                        <Image size={16} className="admin-st-7f4ee4f3"/> Gallery Menu
                    </button>
                </div>

                <div className="settings-content">
                    {/* Studio Information */}
                    {activeTab === 'studio' && (
                        <div className="settings-panel">
                            <h2>Studio Information</h2>
                            <div className="settings-section">
                                <div className="form-group">
                                    <label>Studio Name *</label>
                                    <input
                                        type="text"
                                        value={settings.studio.name}
                                        onChange={(e) => handleChangeWithValidation('studio', 'name', filterName(e.target.value).slice(0, 100))}
                                        className={`form-input ${errors.studio_name ? 'error' : ''}`}
                                        maxLength={100}
                                    />
                                    {errors.studio_name && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.studio_name}</small>}
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            value={settings.studio.email}
                                            onChange={(e) => handleChangeWithValidation('studio', 'email', e.target.value.substring(0, 254))}
                                            className={`form-input ${errors.studio_email ? 'error' : ''}`}
                                            maxLength={254}
                                        />
                                        {errors.studio_email && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.studio_email}</small>}
                                    </div>
                                    <div className="form-group">
                                        <label>Phone *</label>
                                        <input
                                            type="tel"
                                            value={settings.studio.phone}
                                            onChange={(e) => handleChangeWithValidation('studio', 'phone', filterDigits(e.target.value).slice(0, 15))}
                                            className={`form-input ${errors.studio_phone ? 'error' : ''}`}
                                            maxLength={15}
                                        />
                                        {errors.studio_phone && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.studio_phone}</small>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={settings.studio.description}
                                        onChange={(e) => handleChangeWithValidation('studio', 'description', e.target.value.substring(0, 500))}
                                        className="form-input"
                                        rows="3"
                                        maxLength={500}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Address *</label>
                                    <input
                                        type="text"
                                        value={settings.studio.address}
                                        onChange={(e) => handleChangeWithValidation('studio', 'address', e.target.value.substring(0, 200))}
                                        className={`form-input ${errors.studio_address ? 'error' : ''}`}
                                        maxLength={200}
                                    />
                                    {errors.studio_address && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.studio_address}</small>}
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            value={settings.studio.city}
                                            onChange={(e) => handleChangeWithValidation('studio', 'city', filterName(e.target.value).slice(0, 100))}
                                            className="form-input"
                                            maxLength={100}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            value={settings.studio.state}
                                            onChange={(e) => handleChangeWithValidation('studio', 'state', filterName(e.target.value).slice(0, 50))}
                                            className="form-input"
                                            maxLength={50}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Zip Code</label>
                                        <input
                                            type="text"
                                            value={settings.studio.zipCode}
                                            onChange={(e) => handleChangeWithValidation('studio', 'zipCode', filterDigits(e.target.value).slice(0, 10))}
                                            className="form-input"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Opening Time</label>
                                        <input
                                            type="time"
                                            value={settings.studio.openingTime}
                                            onChange={(e) => handleChangeWithValidation('studio', 'openingTime', e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Closing Time</label>
                                        <input
                                            type="time"
                                            value={settings.studio.closingTime}
                                            onChange={(e) => handleChangeWithValidation('studio', 'closingTime', e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Terms & Policies */}
                    {activeTab === 'policies' && (
                        <div className="settings-panel">
                            <h2>Terms & Policies</h2>
                            <div className="settings-section">
                                <div className="form-group">
                                    <label>Terms of Service</label>
                                    <textarea
                                        value={settings.policies.terms}
                                        onChange={(e) => handleChangeWithValidation('policies', 'terms', e.target.value)}
                                        className={`form-input ${errors.policies_terms ? 'error' : ''}`}
                                        rows="5"
                                        maxLength={2000}
                                    />
                                    {errors.policies_terms && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.policies_terms}</small>}
                                </div>
                                <div className="form-group">
                                    <label>Deposit Policy</label>
                                    <textarea
                                        value={settings.policies.deposit}
                                        onChange={(e) => handleChangeWithValidation('policies', 'deposit', e.target.value)}
                                        className="form-input"
                                        rows="3"
                                        maxLength={1000}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cancellation Policy</label>
                                    <textarea
                                        value={settings.policies.cancellation}
                                        onChange={(e) => handleChangeWithValidation('policies', 'cancellation', e.target.value)}
                                        className="form-input"
                                        rows="3"
                                        maxLength={1000}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tattoo Care Instructions */}
                    {activeTab === 'care' && (
                        <div className="settings-panel">
                            <h2>Tattoo Care Instructions</h2>
                            <p className="admin-st-eee235c1">These instructions will be available to clients in their portal.</p>
                            <div className="settings-section">
                                <div className="form-group">
                                    <label>Aftercare Guide</label>
                                    <textarea
                                        value={settings.care.instructions}
                                        onChange={(e) => handleChangeWithValidation('care', 'instructions', e.target.value)}
                                        className={`form-input ${errors.care_instructions ? 'error' : ''}`}
                                        rows="10"
                                        maxLength={3000}
                                    />
                                    {errors.care_instructions && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.care_instructions}</small>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notification Templates */}
                    {activeTab === 'templates' && (
                        <div className="settings-panel">
                            <h2>Notification Templates</h2>
                            <p className="admin-st-eee235c1">Use placeholders like {'{client_name}'}, {'{date}'}, {'{time}'}.</p>
                            <div className="settings-section">
                                <div className="form-group">
                                    <label>Appointment Confirmation</label>
                                    <textarea
                                        value={settings.templates.confirmation}
                                        onChange={(e) => handleChangeWithValidation('templates', 'confirmation', e.target.value)}
                                        className="form-input"
                                        rows="3"
                                        maxLength={500}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Appointment Reminder</label>
                                    <textarea
                                        value={settings.templates.reminder}
                                        onChange={(e) => handleChangeWithValidation('templates', 'reminder', e.target.value)}
                                        className="form-input"
                                        rows="3"
                                        maxLength={500}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cancellation Notice</label>
                                    <textarea
                                        value={settings.templates.cancellation}
                                        onChange={(e) => handleChangeWithValidation('templates', 'cancellation', e.target.value)}
                                        className="form-input"
                                        rows="3"
                                        maxLength={500}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Backup & Restore */}
                    {activeTab === 'backup' && (
                        <div className="settings-panel">
                            <h2>Backup & Restore</h2>
                            <div className="settings-section">
                                <div className="form-group admin-st-629180a5">
                                    <label>Last Successful Backup</label>
                                    <p className="admin-st-902299da">{settings.backup.lastBackup}</p>
                                </div>

                                <div className="toggle-group">
                                    <label className="toggle-item">
                                        <input
                                            type="checkbox"
                                            checked={settings.backup.autoBackup}
                                            onChange={() => handleChangeWithValidation('backup', 'autoBackup', !settings.backup.autoBackup)}
                                            className="toggle-checkbox"
                                        />
                                        <span className="toggle-label">Automatic Daily Backup</span>
                                    </label>
                                </div>

                                <div className="form-group">
                                    <label>Backup Frequency</label>
                                    <select
                                        value={settings.backup.frequency}
                                        onChange={(e) => handleChangeWithValidation('backup', 'frequency', e.target.value)}
                                        className="form-input"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                <div className="admin-st-a00b0937">
                                    <button className="btn btn-primary admin-st-2609fdda" onClick={handleBackup} >
                                        <Download size={18}/> Download Backup
                                    </button>
                                    <button className="btn btn-secondary admin-st-2609fdda" onClick={handleRestore} >
                                        <Upload size={18}/> Restore from File
                                    </button>
                                    <input type="file" id="restore-input" className="admin-st-224b51a7" onChange={(e) => {
                                        e.target.value = null; // reset
                                        showAlert("Feature In Development", "System point-in-time restoration is currently being built and is not yet available.", "warning");
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gallery Menu Settings */}
                    {activeTab === 'gallery' && (
                        <div className="settings-panel fade-in">
                            <h2>Gallery Category Filters</h2>
                            <p className="admin-st-eee235c1">Define the style categories available in the customer and public galleries. Separate each category with a comma.</p>
                            <div className="settings-section">
                                <div className="form-group">
                                    <label>Categories</label>
                                    <textarea
                                        value={settings.gallery?.categories || ''}
                                        onChange={(e) => handleChangeWithValidation('gallery', 'categories', e.target.value.substring(0, 500))}
                                        className="form-input"
                                        rows="4"
                                        placeholder="All, Traditional, Realism, Watercolor..."
                                        maxLength={500}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
            <ConfirmModal {...confirmDialog} onClose={() => setConfirmDialog(prev => ({...prev, isOpen: false}))} />
        </div>
    );
}

export default AdminSettings;
