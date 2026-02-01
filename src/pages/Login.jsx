/**
 * Login Page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api.js';
import './Login.css';

export default function Login() {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [isServerOnline, setIsServerOnline] = useState(null);

    // Form fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const { login, register, isAuthenticated, error: authError, clearError } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const checkServer = async () => {
            const online = await api.health.check();
            setIsServerOnline(online);
        };
        checkServer();
    }, []);

    // Toggle mode
    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setFormError('');
        clearError();
        // Reset form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    // Validate form
    const validateForm = () => {
        if (!email || !password) {
            setFormError('Vui lòng nhập đầy đủ thông tin!');
            return false;
        }

        if (!email.includes('@')) {
            setFormError('Email không hợp lệ!');
            return false;
        }

        if (password.length < 6) {
            setFormError('Mật khẩu phải có ít nhất 6 ký tự!');
            return false;
        }

        if (isRegisterMode) {
            if (!username) {
                setFormError('Vui lòng nhập tên đạo hiệu!');
                return false;
            }
            if (username.length < 2) {
                setFormError('Đạo hiệu phải có ít nhất 2 ký tự!');
                return false;
            }
            if (password !== confirmPassword) {
                setFormError('Mật khẩu xác nhận không khớp!');
                return false;
            }
        }

        return true;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        clearError();

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            let result;
            if (isRegisterMode) {
                result = await register(username, email, password);
            } else {
                result = await login(email, password);
            }

            if (result.success) {
                navigate('/');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            {/* Background decorations */}
            <div className="login-bg-decoration">
                <div className="floating-symbol symbol-1">☯</div>
                <div className="floating-symbol symbol-2">⚔</div>
                <div className="floating-symbol symbol-3">🌙</div>
                <div className="floating-symbol symbol-4">✧</div>
            </div>

            <div className="login-container">
                {/* Header */}
                <div className="login-header">
                    <div className="login-logo">修仙</div>
                    <h1 className="login-title">Tu Tiên Giới</h1>
                    <p className="login-subtitle">
                        {isRegisterMode ? 'Khai Môn Nhập Đạo' : 'Hồi Quy Tu Tiên Giới'}
                    </p>
                </div>

                {/* Server status */}
                {isServerOnline === false && (
                    <div className="server-offline-warning">
                        Không thể kết nối tới server.
                    </div>
                )}

                {/* Form */}
                <form className="login-form" onSubmit={handleSubmit}>
                    {/* Username */}
                    {isRegisterMode && (
                        <div className="form-group">
                            <label htmlFor="username">Đạo Hiệu</label>
                            <input
                                type="text"
                                id="username"
                                placeholder="Nhập đạo hiệu của bạn..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isSubmitting}
                                autoComplete="username"
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="Nhập email..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            autoComplete="email"
                        />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password">Mật Khẩu</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Nhập mật khẩu..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                        />
                    </div>

                    {/* Confirm Password */}
                    {isRegisterMode && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Xác Nhận Mật Khẩu</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                placeholder="Nhập lại mật khẩu..."
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isSubmitting}
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {/* Error messages */}
                    {(formError || authError) && (
                        <div className="form-error">
                            {formError || authError}
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        className="login-btn"
                        disabled={isSubmitting || isServerOnline === false}
                    >
                        {isSubmitting ? (
                            <span className="loading-spinner">⟳</span>
                        ) : (
                            isRegisterMode ? '⚔ Nhập Môn' : '☯ Đăng Nhập'
                        )}
                    </button>
                </form>

                {/* Toggle mode */}
                <div className="login-toggle">
                    <span>
                        {isRegisterMode ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                    </span>
                    <button
                        type="button"
                        onClick={toggleMode}
                        disabled={isSubmitting}
                    >
                        {isRegisterMode ? 'Đăng Nhập' : 'Đăng Ký Ngay'}
                    </button>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p>"Con đường tu tiên bắt đầu từ một bước chân"</p>
                </div>
            </div>
        </div>
    );
}
