import { useState, useEffect } from 'react';
import Axios from 'axios';
import { API_URL } from '../config';

function Appointments() {
    const [appointments, setAppointments] = useState([]);
    const [user] = useState(() => JSON.parse(localStorage.getItem('user')));

    useEffect(() => {
        const fetchAppointments = async () => {
            if (user?.artistId) {
                try {
                    const res = await Axios.get(`${API_URL}/api/artist/${user.artistId}/appointments`);
                    if (res.data.success) setAppointments(res.data.appointments);
                } catch (error) {
                    console.error("Error fetching appointments:", error);
                }
            }
        };
        fetchAppointments();
    }, [user]);

    return (
        <div className="page-container">
            <h1>Appointments</h1>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', background: '#f4f4f4' }}>
                        <th>Date</th><th>Time</th><th>Client</th><th>Design</th><th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.map(appt => (
                        <tr key={appt.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td>{new Date(appt.appointment_date).toLocaleDateString()}</td>
                            <td>{appt.start_time}</td>
                            <td>{appt.client_name}</td>
                            <td>{appt.design_title}</td>
                            <td>{appt.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export default Appointments;