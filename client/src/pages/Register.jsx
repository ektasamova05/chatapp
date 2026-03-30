import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, MessageCircle, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';


// ✅ ✅ ✅ FIX 1: MOVE FIELD COMPONENT OUTSIDE (VERY IMPORTANT)
const Field = ({ icon: Icon, type, placeholder, value, onChange, error, toggle, showToggle }) => (
  <div>
    <div className="relative">
      <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`input-base pl-11 pr-11 ${error ? 'border-red-500 focus:border-red-500' : ''}`}
      />

      {toggle && (
        <button
          type="button"
          onClick={toggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
        >
          {showToggle ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>

    {error && <p className="text-red-400 text-xs mt-1 ml-1">{error}</p>}
  </div>
);


const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.username || form.username.length < 3) e.username = 'Min 3 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password || form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
      });

      login(res.data.token, res.data.user);
      toast.success('Welcome to ChatApp! 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(124,58,237,0.15) 0%, var(--bg) 60%)' }}
    >
      <div className="w-full max-w-md animate-slide-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 glow-accent">
            <MessageCircle size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">ChatApp</h1>
          <p className="text-[var(--muted)] mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <Field
              icon={User}
              type="text"
              placeholder="Username"
              value={form.username}
              error={errors.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            />

            {/* Email */}
            <Field
              icon={Mail}
              type="email"
              placeholder="Email address"
              value={form.email}
              error={errors.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />

            {/* Password */}
            <Field
              icon={Lock}
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              error={errors.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              toggle={() => setShowPass(p => !p)}
              showToggle={showPass}
            />

            {/* Confirm Password */}
            <Field
              icon={Lock}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm password"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
              toggle={() => setShowConfirm(p => !p)}
              showToggle={showConfirm}
            />

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account <ArrowRight size={16} />
                </span>
              )}
            </button>

          </form>

          <p className="text-center text-[var(--muted)] text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;



