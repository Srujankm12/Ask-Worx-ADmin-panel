import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", type = "danger" }) => {
  if (!isOpen) return null;

  const themes = {
    danger: {
      icon: <AlertCircle className="w-8 h-8 text-red-500" />,
      button: "bg-red-500 hover:bg-red-600 shadow-red-200",
      bg: "bg-red-50"
    },
    success: {
      icon: <AlertCircle className="w-8 h-8 text-emerald-500" />,
      button: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200",
      bg: "bg-emerald-50"
    },
    info: {
      icon: <AlertCircle className="w-8 h-8 text-indigo-500" />,
      button: "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200",
      bg: "bg-indigo-50"
    }
  };

  const theme = themes[type] || themes.info;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        <div className="p-8 lg:p-10">
          <div className="flex justify-between items-start mb-6">
            <div className={`w-16 h-16 ${theme.bg} rounded-2xl flex items-center justify-center`}>
              {theme.icon}
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            {title}
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-10">
            {message}
          </p>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-4 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all active:scale-95 ${theme.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
