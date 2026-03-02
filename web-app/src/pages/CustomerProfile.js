import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { User, Mail, Phone, MapPin, Save, Edit2, X, FileText } from 'lucide-react';
import './PortalStyles.css';
import { API_URL } from '../config';
import CustomerSideNav from '../components/CustomerSideNav';

function CustomerProfile(){
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        location: '',
        preferences: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const user = JSON.parse(localStorage.getItem('user'));
    const customerId = user ? user.id : null;

    useEffect(()=>{
        const fetch = async ()=>{
            try{ 
                if (!customerId) return;
                setLoading(true); 
                const res = await Axios.get(`${API_URL}/api/customer/profile/${customerId}`); 
                if(res.data.success) {
                    setProfile({
                        name: res.data.profile.name || '',
                        email: res.data.profile.email || '',
                        phone: res.data.profile.phone || '',
                        location: res.data.profile.location || '',
                        preferences: res.data.profile.notes || ''
                    });
                }
                setLoading(false);
            } catch(e){
                console.error(e); 
                setLoading(false);
            }        
        };
        fetch();
    }, [customerId]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await Axios.put(`${API_URL}/api/customer/profile/${customerId}`, {
                ...profile,
                notes: profile.preferences
            });
            alert('Profile updated successfully!');
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Failed to update profile');
        }
        setSaving(false);
    };

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
            <header className="portal-header"><h1>My Profile</h1></header>
            <div className="portal-content">
                {loading ? <div className="no-data">Loading...</div> : (
                    <div className="data-card" style={{maxWidth: '800px', margin: '0 auto'}}>
                        {!isEditing ? (
                            <div className="profile-view">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem'}}>
                                    <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                                        <div style={{
                                            width: '80px', height: '80px', borderRadius: '50%', 
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white', fontSize: '2.5rem', fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {profile.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 style={{margin: '0 0 5px 0', fontSize: '1.8rem'}}>{profile.name}</h2>
                                            <p style={{margin: 0, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                                <Mail size={16}/> {profile.email}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="btn btn-secondary" onClick={() => setIsEditing(true)} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <Edit2 size={16}/> Edit Profile
                                    </button>
                                </div>

                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                                    <div className="info-group">
                                        <label><Phone size={16}/> Phone Number</label>
                                        <p>{profile.phone || 'Not provided'}</p>
                                    </div>
                                    <div className="info-group">
                                        <label><MapPin size={16}/> Location</label>
                                        <p>{profile.location || 'Not provided'}</p>
                                    </div>
                                    <div className="info-group" style={{gridColumn: '1 / -1'}}>
                                        <label><FileText size={16}/> Tattoo Preferences</label>
                                        <p>{profile.preferences || 'No preferences listed'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSave}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                    <h2 style={{margin: 0}}>Edit Profile</h2>
                                    <button type="button" className="close-btn" onClick={() => setIsEditing(false)}><X size={24}/></button>
                                </div>
                                <div className="form-group">
                                    <label><User size={16}/> Name</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={profile.name}
                                        onChange={e => setProfile({...profile, name: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label><Mail size={16}/> Email</label>
                                    <input 
                                        type="email" 
                                        className="form-input"
                                        value={profile.email}
                                        disabled
                                        style={{backgroundColor: '#f3f4f6', cursor: 'not-allowed'}}
                                    />
                                </div>
                                <div className="form-group">
                                    <label><Phone size={16}/> Phone</label>
                                    <input 
                                        type="tel" 
                                        className="form-input"
                                        value={profile.phone}
                                        onChange={e => setProfile({...profile, phone: e.target.value})}
                                        placeholder="555-0123"
                                    />
                                </div>
                                <div className="form-group">
                                    <label><MapPin size={16}/> Location</label>
                                    <input 
                                        type="text" 
                                        className="form-input"
                                        value={profile.location}
                                        onChange={e => setProfile({...profile, location: e.target.value})}
                                        placeholder="City, State"
                                    />
                                </div>
                                <div className="form-group">
                                    <label><FileText size={16}/> Tattoo Preferences</label>
                                    <textarea 
                                        className="form-input"
                                        value={profile.preferences}
                                        onChange={e => setProfile({...profile, preferences: e.target.value})}
                                        placeholder="E.g. Realism, Blackwork, Sleeve ideas..."
                                        rows="3"
                                    />
                                </div>
                                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)} style={{flex: 1}}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving} style={{flex: 1}}>
                                        {saving ? 'Saving...' : <><Save size={18} style={{marginRight: '8px'}}/> Save Changes</>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}

export default CustomerProfile;
