import { useState } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';
import './AdminStyles.css';
import { API_URL } from '../config';

function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        
        try {
            setErrorMsg(""); // clear previous error
            const response = await Axios.post(`${API_URL}/api/login`, {
                email: email,
                password: password,
                type: 'admin' // Hardcoded type ensures only admins can log in here
            });
            if (response.data.success) {
                console.log("Admin Data:", response.data.user);
                navigate('/admin/dashboard', { replace: true });
            }
        } catch (error) {
            if (error.response) {
                setErrorMsg(error.response.data.message);
            } else {
                setErrorMsg("Connection Error");
            }
        }
    };

    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-box">
                <h2>Admin Portal</h2>
                <p>Please sign in to manage the system</p>
                {errorMsg && <div className="error-alert admin-error-alert">{errorMsg}</div>}
                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            placeholder="admin@inkvistar.com"
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" className="admin-btn">Sign In</button>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin;