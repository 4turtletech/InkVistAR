import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { MessageSquare, Calendar, Activity } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import ChatWidget from '../components/ChatWidget';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';
import { io } from 'socket.io-client';
import './AdminChat.css';

function AdminChat() {
    const [liveSessions, setLiveSessions] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const selectedRef = useRef(null);
    selectedRef.current = selectedAppointment;

    useEffect(() => {

        const socket = io(API_URL);
        socket.emit('join_admin_tracking');

        socket.on('support_sessions_update', (sessions) => {
            const sorted = [...sessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setLiveSessions(sorted);

            // If the selected active session was closed, deselect it
            const sel = selectedRef.current;
            if (sel?.isLiveChat && !sessions.find(s => s.id === sel.id)) {
                setSelectedAppointment(null);
            }
        });

        return () => socket.disconnect();
    }, []);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter chat-page-wrapper">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Chats & Consultations</h1>
                    </div>
                </header>
                <p className="header-subtitle">Manage live support sessions and artist consultations from one unified dashboard.</p>

                <div className="admin-chat-layout glass-panel">
                    <div className="appointment-list-container">
                        {/* Pinned: Live Sessions */}
                        <div className="live-sessions-pinned">
                            {liveSessions.length > 0 && (
                                <div className="chat-section-divider">
                                    <Activity size={14} /> Active Web Chats ({liveSessions.length})
                                </div>
                            )}
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
