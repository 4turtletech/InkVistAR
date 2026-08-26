import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { MessageSquare, Calendar, Activity } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import ChatWidget from '../components/ChatWidget';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL, SOCKET_URL, getSocketAccessToken } from '../config';
import { io } from 'socket.io-client';
import './AdminChat.css';

function AdminChat() {
    const [liveSessions, setLiveSessions] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [connectionError, setConnectionError] = useState('');
    const selectedRef = useRef(null);
    const socketRef = useRef(null);
    selectedRef.current = selectedAppointment;

    useEffect(() => {

        const socket = io(SOCKET_URL, {
            autoConnect: false,
            auth: async (callback) => callback({ token: await getSocketAccessToken() }),
            reconnection: true,
        });
        socketRef.current = socket;
        socket.on('connect', () => {
            setConnectionError('');
            socket.emit('join_admin_tracking');
        });
        socket.on('connect_error', () => setConnectionError('Unable to connect to live support. Retrying...'));
        socket.on('authorization_error', () => setConnectionError('Live support authorization failed. Please sign in again.'));

        socket.on('support_sessions_update', (sessions) => {
            const sorted = [...sessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setLiveSessions(sorted);

            // If the selected active session was closed, deselect it
            const sel = selectedRef.current;
            if (sel?.isLiveChat && !sessions.find(s => s.id === sel.id)) {
                setSelectedAppointment(null);
            }
        });
        socket.connect();

        return () => {
            socketRef.current = null;
            socket.disconnect();
        };
    }, []);

    const handleEndSelectedChat = () => {
        if (!selectedAppointment?.id || !socketRef.current) return;
        socketRef.current.emit('end_support_session', selectedAppointment.id);
        setSelectedAppointment(null);
    };

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter chat-page-wrapper">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Chats & Consultations</h1>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={handleEndSelectedChat}
                            disabled={!selectedAppointment?.id}
                            style={{ opacity: selectedAppointment?.id ? 1 : 0.55 }}
                        >
                            End Selected Chat
                        </button>
                    </div>
                </header>
                <p className="header-subtitle">Manage live support sessions and artist consultations from one unified dashboard.</p>
                {connectionError && <p className="header-subtitle" style={{ color: '#dc2626' }}>{connectionError}</p>}

                <div className="admin-chat-layout glass-panel">
                    <div className="appointment-list-container">
                        {/* Pinned: Live Sessions */}
                        <div className="live-sessions-pinned">
                            {liveSessions.length > 0 ? (
                                <>
                                    <div className="chat-section-divider">
                                        <Activity size={14} /> Active Web Chats ({liveSessions.length})
                                    </div>
                                    {liveSessions.map(session => (
                                        <div
                                            key={session.id}
                                            className={`appointment-item live-chat-item ${selectedAppointment?.id === session.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedAppointment({ id: session.id, client_name: session.name, service_type: 'Live Web Chat', isLiveChat: true })}
                                        >
                                            <div className="appointment-item-name">
                                                <span>{session.name}</span>
                                                <span className="live-status-pill">Active</span>
                                            </div>
                                            <div className="appointment-item-service">{session.lastMessage}</div>
                                            <div className="appointment-item-date">{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '30px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                    <MessageSquare size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>No active chats</p>
                                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', lineHeight: 1.5, color: '#94a3b8' }}>
                                        When a customer starts a live chat session, it will appear here.
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                    <div className="chat-window-container">
                        {selectedAppointment ? (
                            <div className="chat-widget-wrapper">
                                <ChatWidget
                                    key={selectedAppointment.id}
                                    room={selectedAppointment.id}
                                    currentUser={`Admin`}
                                    isAdminMode={true}
                                    customerName={selectedAppointment.client_name}
                                    initialMessages={liveSessions.find(s => s.id === selectedAppointment.id)?.messages || []}
                                />
                            </div>
                        ) : (
                            <div className="no-chat-selected">
                                <MessageSquare size={48} />
                                <h3>Select a conversation to begin.</h3>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminChat;
