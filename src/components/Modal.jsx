import React from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, message, type = 'success' }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-12 h-12 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-12 h-12 text-rose-500" />;
      default: return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getButtonBg = () => {
    switch (type) {
      case 'success': return 'bg-emerald-500 shadow-emerald-500/20';
      case 'error': return 'bg-rose-500 shadow-rose-500/20';
      default: return 'bg-slate-900 shadow-slate-900/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-300 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-8 p-6 bg-slate-50 rounded-[32px]">
            {getIcon()}
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            {title}
          </h2>
          
          <p className="text-sm font-bold text-slate-400 leading-relaxed mb-10 max-w-[280px]">
            {message}
          </p>

          <button
            onClick={onClose}
            className={`w-full py-5 rounded-[24px] text-white font-black text-xs uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-95 shadow-xl ${getButtonBg()}`}
          >
            Acknowledged
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
