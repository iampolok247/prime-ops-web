import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, updateMe } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const payload = { name, avatar };
      if (newPassword) payload.currentPassword = currentPassword, payload.newPassword = newPassword;
      await updateMe(payload);
      setMsg('Profile updated');
      setCurrentPassword(''); setNewPassword('');
    } catch (e) {
      setErr(e?.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-navy mb-4">Edit Profile</h1>
      {msg && <div className="mb-3 text-green-700">{msg}</div>}
      {err && <div className="mb-3 text-red-600">{err}</div>}
      <form onSubmit={submit} className="bg-white shadow-soft rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <img src={avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-gold"/>
          <div className="flex-1">
            <label className="block text-sm text-royal mb-1">Avatar URL</label>
            <input className="w-full border rounded-xl px-3 py-2" value={avatar} onChange={e=>setAvatar(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm text-royal mb-1">Full Name</label>
          <input className="w-full border rounded-xl px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-royal mb-1">Current Password</label>
            <input type="password" className="w-full border rounded-xl px-3 py-2" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-royal mb-1">New Password</label>
            <input type="password" className="w-full border rounded-xl px-3 py-2" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
          </div>
        </div>

        <button className="mt-6 bg-gold text-navy rounded-xl px-5 py-2 font-semibold hover:bg-lightgold">Save Changes</button>
      </form>
    </div>
  );
}
