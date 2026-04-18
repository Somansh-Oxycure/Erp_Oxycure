'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Loader2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, getInitials, getAvatarColor } from '@/lib/utils';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
  manager: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
  salesperson: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  design_engineer: 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20',
  installer: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  service_engineer: 'bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20',
  finance: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
};

const ALL_ROLES = [
  'salesperson',
  'design_engineer',
  'manager',
  'installer',
  'service_engineer',
  'finance',
];

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'salesperson',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Create User</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">First Name</label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Last Name</label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Role</label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r} className="bg-[#1a1a2e]">
                  {r.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={
              !form.firstName || !form.email || !form.password || mutation.isPending
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm text-white font-medium disabled:opacity-40 transition-colors"
          >
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.findAll({ search: search || undefined }).then((r) => r.data),
  });

  const users = data?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      usersApi.toggleActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Users</h1>
            <p className="text-sm text-gray-400">{users.length} team members</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Users className="w-10 h-10 opacity-30 mb-3" />
            <p>No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Joined</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u: any, idx: number) => {
                const initials = getInitials(`${u.firstName} ${u.lastName}`);
                const color = getAvatarColor(`${u.firstName} ${u.lastName}`);
                const isSelf = u.id === currentUser?.id;

                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-white/5 last:border-0 hover:bg-white/3"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: color }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {u.firstName} {u.lastName}
                            {isSelf && (
                              <span className="ml-2 text-xs text-sky-400">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-500/10 text-gray-400'}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">{u.phone || '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-400">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs ${u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {!isSelf && currentUser?.role === 'admin' && (
                        <button
                          onClick={() => toggleMutation.mutate({ id: u.id, active: !u.isActive })}
                          disabled={toggleMutation.isPending}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors disabled:opacity-40 ${
                            u.isActive
                              ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'
                              : 'hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-400'
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Activate
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}
