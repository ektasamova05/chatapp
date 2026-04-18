import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mail, Phone, Info, Calendar, Edit2, Check, X, Lock, ZoomIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatLastSeen, getAvatarUrl } from '../../utils/helpers';
import { format } from 'date-fns';

const ProfileModal = ({ user, isOwn = false, onClose }) => {
  const { updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: user?.username || '', bio: user?.bio || '', phone: user?.phone || '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [showBigAvatar, setShowBigAvatar] = useState(false);

  // ✅ FIX: full profile data for other users
  const [fullUser, setFullUser] = useState(user);

  const fileRef = useRef();

  // ✅ FIX: fetch full profile when viewing other user
  useEffect(() => {
    if (!isOwn && user?.id) {
      api.get(`/users/${user.id}`)
        .then(res => setFullUser(res.data.user || res.data))
        .catch(() => setFullUser(user)); // fallback to original if fetch fails
    } else {
      setFullUser(user);
    }
  }, [user?.id, isOwn]);

  useEffect(() => {
    setForm({ username: user?.username || '', bio: user?.bio || '', phone: user?.phone || '' });
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setRemoveAvatar(false);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const resetEditingState = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      if (form.username !== user.username) fd.append('username', form.username);
      fd.append('bio', form.bio);
      fd.append('phone', form.phone);
      if (avatarFile) fd.append('avatar', avatarFile);
      if (removeAvatar) fd.append('removeAvatar', 'true');
      const res = await api.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data.user);
      setFullUser(res.data.user);
      toast.success('Profile updated!');
      resetEditingState();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passForm.newPassword !== passForm.confirmNew) return toast.error('Passwords do not match');
    if (passForm.newPassword.length < 6) return toast.error('Min 6 characters');
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed!');
      setShowPassForm(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmNew: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  // ✅ use fullUser for display (has all fields)
  const effectiveAvatar = removeAvatar ? null : (avatarPreview || fullUser?.avatar);
  const displayUser = { ...fullUser, avatar: effectiveAvatar };
  const bigAvatarUrl = effectiveAvatar ? getAvatarUrl(effectiveAvatar) : null;

  return (
    <>
      <div
        className="overlay profile-backdrop flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="card w-full max-w-md animate-bounce-in overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="h-28 bg-gradient-to-r from-violet-900 via-indigo-800 to-violet-900 relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 rounded-lg text-white transition-colors"
            >
              <X size={16} />
            </button>
            {isOwn && editing && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                {(fullUser?.avatar || avatarPreview) && !removeAvatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white transition-colors text-xs"
                  >
                    Remove Photo
                  </button>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="p-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-white transition-colors flex items-center gap-1.5 text-xs"
                >
                  <Camera size={14} /> Change Photo
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          </div>

          {/* Avatar */}
          <div className="px-6 pb-6">
            <div className="-mt-12 mb-4 flex items-end justify-between">
              <div className="relative group/avatar">
                <Avatar
                  user={displayUser}
                  size="2xl"
                  showOnline={!isOwn}
                  className="border-4 border-[var(--sidebar)] cursor-pointer"
                />
                {bigAvatarUrl && (
                  <button
                    onClick={() => setShowBigAvatar(true)}
                    className="absolute inset-0 rounded-full flex items-center justify-center
                      bg-black/0 group-hover/avatar:bg-black/40 transition-all duration-200"
                    title="View photo"
                  >
                    <ZoomIn
                      size={22}
                      className="text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200"
                    />
                  </button>
                )}
                {isOwn && !editing && (
                  <button
                    onClick={() => { setEditing(true); setShowPassForm(false); }}
                    className="absolute bottom-1 right-1 p-1.5 bg-violet-600 hover:bg-violet-700 rounded-full text-white transition-colors z-10"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>

              {isOwn && editing && (
                <div className="flex gap-2">
                  <button
                    onClick={resetEditingState}
                    className="btn-ghost text-sm py-2"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={loading} className="btn-primary text-sm py-2">
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Check size={14} /> Save</>}
                  </button>
                </div>
              )}
            </div>

            {/* Name */}
            {editing ? (
              <input
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className="input-base text-xl font-bold mb-1"
                placeholder="Username"
              />
            ) : (
              <h2 className="text-xl font-bold text-[var(--text)]">{fullUser?.username}</h2>
            )}

            {!isOwn && (
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {fullUser?.isOnline
                  ? <span className="text-green-400">● Online</span>
                  : `Last seen: ${formatLastSeen(fullUser?.lastSeen)}`}
              </p>
            )}

            {/* Info rows */}
            <div className="mt-5 space-y-3">
              <div className="flex gap-3">
                <Info size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--muted)] mb-1">Bio</p>
                  {editing ? (
                    <textarea
                      value={form.bio}
                      onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      className="input-base text-sm resize-none" rows={2}
                      placeholder="About me..." maxLength={300}
                    />
                  ) : (
                    <p className="text-sm text-[var(--text)]">
                      {fullUser?.bio || <span className="text-[var(--muted)]">No bio</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* ✅ Email — only show to own profile */}
              {isOwn && (
                <div className="flex gap-3">
                  <Mail size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">
                      Email <span className="text-[var(--muted)]">(not editable)</span>
                    </p>
                    <p className="text-sm text-[var(--text)]">{fullUser?.email}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Phone size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--muted)] mb-1">Phone</p>
                  {editing ? (
                    <input
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className="input-base text-sm" placeholder="+1 234 567 8900"
                    />
                  ) : (
                    <p className="text-sm text-[var(--text)]">
                      {fullUser?.phone || <span className="text-[var(--muted)]">Not set</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Calendar size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">Joined</p>
                  <p className="text-sm text-[var(--text)]">
                    {fullUser?.createdAt ? format(new Date(fullUser.createdAt), 'MMMM yyyy') : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Change Password — own profile only */}
            {isOwn && !editing && (
              <div className="mt-5 pt-5 border-t border-[var(--border)]">
                <button
                  onClick={() => setShowPassForm(p => !p)}
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-medium"
                >
                  <Lock size={14} /> {showPassForm ? 'Cancel' : 'Change Password'}
                </button>
                {showPassForm && (
                  <div className="mt-3 space-y-3 animate-slide-up">
                    {['currentPassword', 'newPassword', 'confirmNew'].map((k, i) => (
                      <input
                        key={k} type="password"
                        placeholder={['Current password', 'New password', 'Confirm new password'][i]}
                        value={passForm[k]}
                        onChange={e => setPassForm(p => ({ ...p, [k]: e.target.value }))}
                        className="input-base text-sm"
                      />
                    ))}
                    <button onClick={handlePasswordChange} disabled={loading} className="btn-primary w-full text-sm">
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Avatar Lightbox */}
      {showBigAvatar && bigAvatarUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowBigAvatar(false)}
        >
          <button
            onClick={() => setShowBigAvatar(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <p className="text-white font-semibold text-sm opacity-80">{fullUser?.username}</p>
          </div>
          <img
            src={bigAvatarUrl}
            alt={fullUser?.username}
            className="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            style={{ border: '2px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ProfileModal;
