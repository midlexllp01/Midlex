"use client";
import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
    nationalId: '',
    address: '',
    otherInfo: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Embedded Case Creation State inside Profile
  const [caseForm, setCaseForm] = useState({
    title: '',
    description: '',
    category: 'LITIGATION',
    subCategory: 'Commercial Litigation',
  });
  const [isSubmittingCase, setIsSubmittingCase] = useState(false);
  const [caseMessage, setCaseMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiFetch('/users/profile');
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          nationalId: data.nationalId || '',
          address: data.address || '',
          otherInfo: data.otherInfo || ''
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setIsSubmittingPassword(true);
    setPasswordMessage(null);
    try {
      await apiFetch('/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      setPasswordMessage({ type: 'success', text: '🔒 Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    const defaultSub = cat === 'LITIGATION' ? 'Commercial Litigation' : 'Monthly Retainer';
    setCaseForm({ ...caseForm, category: cat, subCategory: defaultSub });
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCase(true);
    setCaseMessage(null);
    try {
      const createdCase = await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify(caseForm),
      });
      setCaseMessage({ type: 'success', text: 'Legal matter created successfully! Redirecting...' });
      setCaseForm({
        title: '',
        description: '',
        category: 'LITIGATION',
        subCategory: 'Commercial Litigation',
      });
      setTimeout(() => {
        router.push(`/dashboard/cases/${createdCase.id}`);
      }, 1200);
    } catch (error: any) {
      console.error('Error creating case:', error);
      setCaseMessage({ type: 'error', text: `Failed to create case: ${error.message || 'Unknown error'}` });
    } finally {
      setIsSubmittingCase(false);
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-4">
    <div className="h-12 bg-gray-100 rounded-2xl w-1/4 mb-10" />
    <div className="grid grid-cols-2 gap-8">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
    </div>
  </div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div>
        <h2 className="text-3xl font-bold text-primary">Client Profile & Case Request</h2>
        <p className="text-gray-500 mt-2">Manage your personal profile and request legal representation (Litigation or General/Retainer matters).</p>
      </div>

      {/* Profile Form */}
      <div>
        <h3 className="text-xl font-bold text-primary mb-4">Personal Details</h3>
        {message && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 mb-6 rounded-2xl font-bold text-sm ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Full Name</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Phone Number</label>
              <input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
                placeholder="+234 ..."
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Date of Birth</label>
              <input 
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">National ID Number</label>
              <input 
                type="text"
                value={formData.nationalId}
                onChange={(e) => setFormData({...formData, nationalId: e.target.value})}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
                placeholder="NIN or Passport Number"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Residential Address</label>
            <textarea 
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
              placeholder="Full physical address"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Other Helpful Information</label>
            <textarea 
              rows={3}
              value={formData.otherInfo}
              onChange={(e) => setFormData({...formData, otherInfo: e.target.value})}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
              placeholder="e.g. Spouse name, Occupation, or any other relevant details"
            />
          </div>

          <div className="pt-4 border-t border-gray-50">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-10 py-4 bg-secondary text-white font-bold rounded-[20px] shadow-xl shadow-secondary/20 hover:shadow-2xl transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Security & Password */}
      <div id="security">
        <h3 className="text-xl font-bold text-primary mb-2 flex items-center gap-2">
          <span>🔒</span> Account Security &amp; Password
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Update your account password to keep your client portal and case documents secure.
        </p>

        {passwordMessage && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 mb-6 rounded-2xl font-bold text-sm ${
              passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {passwordMessage.text}
          </motion.div>
        )}

        <form onSubmit={handlePasswordChange} className="bg-white p-8 sm:p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Current Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800 text-sm"
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">New Password (min 6)</label>
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800 text-sm"
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800 text-sm"
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-gray-500 hover:text-primary font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {showPassword ? '🙈 Hide passwords' : '👁️ Show passwords'}
            </button>
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-[20px] shadow-lg shadow-primary/20 transition-all text-sm disabled:opacity-50"
            >
              {isSubmittingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Embedded Create Case Section */}
      <div className="pt-6">
        <h3 className="text-xl font-bold text-primary mb-4">Open New Matter / Request Counsel</h3>
        
        {caseMessage && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-4 mb-6 rounded-2xl font-bold text-sm ${
              caseMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {caseMessage.text}
          </motion.div>
        )}

        <form onSubmit={handleCreateCase} className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
          <div>
            <label className="block text-xs font-bold text-primary uppercase tracking-widest px-1 mb-3">Matter Classification Category</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleCategoryChange('LITIGATION')}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  caseForm.category === 'LITIGATION'
                    ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold">⚖️ Litigation Issue</div>
                <div className="text-xs text-gray-500 mt-1">Court cases, litigation matters, and trial disputes</div>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('GENERAL')}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  caseForm.category === 'GENERAL'
                    ? 'border-secondary bg-secondary/10 text-primary font-bold shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold">🏛️ General / Retainer Matter</div>
                <div className="text-xs text-gray-500 mt-1">Property / Realty, monthly retainer, tax advisory, corporate advisory</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary uppercase tracking-widest px-1 mb-3">Specific Practice Sub-type</label>
            <select
              value={caseForm.subCategory}
              onChange={(e) => setCaseForm({ ...caseForm, subCategory: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-secondary/20 font-medium text-gray-800"
            >
              {caseForm.category === 'LITIGATION' ? (
                <>
                  <option value="Commercial Litigation">Commercial Litigation</option>
                  <option value="Civil Dispute">Civil & Contractual Dispute</option>
                  <option value="Land & Property / Realty Dispute">Land & Property / Realty Dispute</option>
                  <option value="Criminal Defense">Criminal Defense</option>
                </>
              ) : (
                <>
                  <option value="Monthly Retainer">Monthly Corporate Retainer</option>
                  <option value="Property / Realty & Real Estate">Property / Realty & Real Estate</option>
                  <option value="Tax Advisory">Tax Advisory & Compliance</option>
                  <option value="Corporate Secretarial">Corporate Secretarial Services</option>
                  <option value="General Legal Advisory">General Legal Advisory</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary uppercase tracking-widest px-1 mb-3">Matter / Case Title</label>
            <input
              type="text"
              value={caseForm.title}
              onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
              placeholder={caseForm.category === 'LITIGATION' ? "e.g., Commercial Land Dispute - Suit No. B/104" : "e.g., Monthly Corporate Retainer - Real Estate Tax Advisory"}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary uppercase tracking-widest px-1 mb-3">Detailed Description</label>
            <textarea
              rows={4}
              value={caseForm.description}
              onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-gray-800"
              placeholder="Describe background, specific requirements, or monthly instructions..."
              required
            />
          </div>

          <div className="pt-4 border-t border-gray-50">
            <button
              type="submit"
              disabled={isSubmittingCase}
              className="px-10 py-4 bg-primary text-white font-bold rounded-[20px] shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isSubmittingCase ? 'Submitting Legal Request...' : 'Submit Legal Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
