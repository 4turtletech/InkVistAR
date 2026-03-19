import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { X, Calendar } from 'lucide-react';
import './PortalStyles.css';
import { API_URL } from '../config';
import CustomerSideNav from '../components/CustomerSideNav';

function CustomerGallery(){
    const [works, setWorks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWork, setSelectedWork] = useState(null);
    const navigate = useNavigate();

    useEffect(()=>{
        const fetch = async ()=>{
            try{
                setLoading(true);
                const res = await Axios.get(`${API_URL}/api/gallery/works`);
                if (res.data.success) setWorks(res.data.works || []);
                setLoading(false);
            }catch(e){console.error(e); setLoading(false);}        
        };
        fetch();
    },[]);

    const filteredWorks = works.filter(w => 
        (w.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.artist_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
            <header className="portal-header">
                <h1>Inspiration Gallery</h1>
                <div className="search-box" style={{maxWidth: '300px'}}>
                    <input 
                        type="text" 
                        placeholder="Search tattoos..." 
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>
            <div className="portal-content">
                {loading ? <div className="no-data">Loading...</div> : (
                    <div className="gallery-grid">
                        {filteredWorks.length ? filteredWorks.map(work => (
                            <div key={work.id} className="gallery-item" onClick={() => setSelectedWork(work)}>
                                <img src={work.image_url} alt={work.title} loading="lazy" />
                                <div className="gallery-overlay">
                                    <h3>{work.title}</h3>
                                    <p>by {work.artist_name}</p>
                                    {work.price_estimate && <p style={{color: '#ffcc00', fontWeight: 'bold', fontSize: '0.8rem'}}>₱{Number(work.price_estimate).toLocaleString()} est.</p>}
                                </div>
                            </div>
                        )) : <p className="no-data">No works found</p>}
                    </div>
                )}
            </div>
            </div>

            {/* Premium Artwork Modal */}
            {selectedWork && (
                <div className="modal-overlay open" onClick={() => setSelectedWork(null)}>
                    <div className="modal-content" style={{maxWidth: '900px', width: '90%', padding: '0', overflow: 'hidden'}} onClick={e => e.stopPropagation()}>
                        <div style={{display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', height: '100%'}}>
                            {/* Image side */}
                            <div style={{flex: '1.5', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                <img src={selectedWork.image_url} alt={selectedWork.title} style={{maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain'}} />
                            </div>
                            
                            {/* Content side */}
                            <div style={{flex: '1', padding: '40px', display: 'flex', flexDirection: 'column', backgroundColor: '#fff'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                    <h2 style={{margin: '0', fontSize: '1.75rem', color: '#111'}}>{selectedWork.title || 'Classic Tattoo'}</h2>
                                    <button onClick={() => setSelectedWork(null)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#666'}}><X size={24}/></button>
                                </div>
                                
                                <p style={{color: '#666', marginTop: '10px', fontSize: '0.9rem'}}>by <span style={{color: '#4f46e5', fontWeight: '600'}}>{selectedWork.artist_name}</span></p>
                                <span className="badge" style={{backgroundColor: '#e0e7ff', color: '#4338ca', width: 'fit-content', marginTop: '5px'}}>{selectedWork.category}</span>
                                
                                <div style={{marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
                                    <p style={{color: '#4b5563', lineHeight: '1.6', fontSize: '1rem'}}>{selectedWork.description || 'A unique piece of art crafted by our resident specialists.'}</p>
                                </div>

                                {selectedWork.price_estimate && (
                                    <div style={{marginTop: 'auto', padding: '20px', backgroundColor: '#fef9ee', borderRadius: '12px', border: '1px solid #f5deb3'}}>
                                        <p style={{margin: '0', color: '#92400e', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase'}}>Estimated Price</p>
                                        <p style={{margin: '5px 0 0', color: '#111', fontSize: '1.5rem', fontWeight: '700'}}>₱{Number(selectedWork.price_estimate).toLocaleString()}</p>
                                    </div>
                                )}

                                <button 
                                    className="action-btn" 
                                    style={{marginTop: '20px', padding: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1rem'}}
                                    onClick={() => navigate('/book', { state: { artistId: selectedWork.artist_id, designTitle: selectedWork.title } })}
                                >
                                    <Calendar size={18} />
                                    Book This Tattoo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerGallery;
