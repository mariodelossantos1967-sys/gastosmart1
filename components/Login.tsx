import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Wallet, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    await signInWithGoogle();
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-gray-100">
        <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/30">
          <Wallet className="text-white" size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-2">GastoSmart AI</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Tu asistente financiero inteligente. Controla gastos, escanea facturas y chatea con tu asesor IA desde cualquier lugar.
        </p>

        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-xl text-slate-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? (
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          ) : (
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-6 h-6 group-hover:scale-110 transition-transform"
            />
          )}
          {isLoggingIn ? 'Iniciando sesión...' : 'Continuar con Google'}
        </button>

        <p className="mt-8 text-xs text-gray-400">
          Al continuar, tus datos se guardarán de forma segura en la nube y podrás acceder desde múltiples dispositivos.
        </p>
      </div>
    </div>
  );
};