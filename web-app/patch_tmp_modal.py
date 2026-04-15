import re

file_path = 'src/pages/AdminAppointments.js'

with open(file_path, 'r') as f:
    text = f.read()


# 1. Inject the Reschedule Modal JSX before {/* Confirmation Modal */}
reschedule_modal_jsx = """
            {/* Reschedule Modal */}
            {rescheduleModal.isOpen && (
                <div className="modal-overlay admin-st-032d51d4" onClick={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}>
                    <div className="modal-content premium-modal admin-st-eabe81b2" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Reschedule Session</h3>
                            <button className="close-btn" onClick={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="premium-input-group">
                                <label className="admin-st-b8618eb2">New Date</label>
                                <input type="date" value={rescheduleModal.date} onChange={e => setRescheduleModal({ ...rescheduleModal, date: e.target.value })} className="premium-input-v2" />
                            </div>
                            <div className="premium-input-group" style={{ marginTop: '16px' }}>
                                <label className="admin-st-b8618eb2">New Time</label>
                                <input type="time" value={rescheduleModal.time} onChange={e => setRescheduleModal({ ...rescheduleModal, time: e.target.value })} className="premium-input-v2" />
                            </div>
                            <div className="premium-input-group" style={{ marginTop: '16px' }}>
                                <label className="admin-st-b8618eb2">Reason for Reschedule (Optional)</label>
                                <textarea
                                    className="premium-input-v2"
                                    value={rescheduleModal.reason}
                                    onChange={e => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
                                    placeholder="Explain to the customer why the schedule is changed..."
                                    rows="3"
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={handleConfirmReschedule} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} /> Confirm Reschedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}"""

text = text.replace('{/* Confirmation Modal */}', reschedule_modal_jsx, 1)

with open(file_path, 'w') as f:
    f.write(text)

print("Patch applied to AdminAppointments.js")
