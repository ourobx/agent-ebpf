import React, { useState } from 'react';

interface EnterpriseContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterpriseContactModal: React.FC<EnterpriseContactModalProps> = React.memo(({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    companyName: '',
    orgSize: '100-1000',
    cloudProvider: 'AWS',
    aiFramework: 'LangChain / CrewAI',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl shadow-2xl p-6 sm:p-8 z-10 font-sans text-xs text-slate-200">
        <div className="flex items-center justify-between border-b border-[#1C1C1C] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
              Request Enterprise Architecture Review
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded border border-white/10"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 font-mono">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">
              ✓
            </div>
            <h4 className="text-sm font-bold text-white">Architecture Review Requested</h4>
            <p className="text-xs text-slate-400 max-w-xs font-sans">
              Our principal infrastructure security team will review your topology and contact you within 2 business hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[#05080E] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Work Email (Corporate)</label>
                <input
                  type="email"
                  required
                  placeholder="alex@enterprise.com"
                  value={formData.workEmail}
                  onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                  className="w-full bg-[#05080E] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Company / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fortune 500 Bank"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-[#05080E] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Enterprise Size</label>
                <select
                  value={formData.orgSize}
                  onChange={(e) => setFormData({ ...formData, orgSize: e.target.value })}
                  className="w-full bg-[#05080E] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 transition"
                >
                  <option value="1-50">1 - 50 Employees</option>
                  <option value="50-500">50 - 500 Employees</option>
                  <option value="500-5000">500 - 5,000 Employees</option>
                  <option value="5000+">5,000+ Employees (Global Enterprise)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Primary Cloud Architecture</label>
                <select
                  value={formData.cloudProvider}
                  onChange={(e) => setFormData({ ...formData, cloudProvider: e.target.value })}
                  className="w-full bg-[#05080E] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 transition"
                >
                  <option value="AWS">Amazon Web Services (EKS / EC2)</option>
                  <option value="GCP">Google Cloud (GKE / Compute)</option>
                  <option value="Azure">Microsoft Azure (AKS)</option>
                  <option value="BareMetal">On-Premises Bare Metal / Sovereign Linux</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">AI Framework / Orchestrator</label>
                <input
                  type="text"
                  placeholder="e.g. LangChain, CrewAI, OpenAI Assistants"
                  value={formData.aiFramework}
                  onChange={(e) => setFormData({ ...formData, aiFramework: e.target.value })}
                  className="w-full bg-[#05080E] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Architecture Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Describe your threat model or database scaling requirements..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-[#05080E] border border-white/10 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-400 transition"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-sans text-xs rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] transition"
            >
              Submit Enterprise Architecture Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
});
