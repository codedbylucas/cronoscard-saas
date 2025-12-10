
import React, { useState } from 'react';
import { signIn, signUp } from '../services/authService';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setMessage('Conta criada com sucesso! Verifique seu email para confirmar.');
        setIsLogin(true); // Switch to login view or keep showing success message
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo Header */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/30 mb-6 transform rotate-3">
                <Calendar className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">CronosCard</h1>
            <p className="text-gray-500">Gestão visual de datas financeiras</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => { setIsLogin(true); setError(null); setMessage(null); }}
                    className={`flex-1 py-4 text-sm font-bold transition-colors ${isLogin ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Entrar
                </button>
                <div className="w-px bg-gray-100"></div>
                <button 
                    onClick={() => { setIsLogin(false); setError(null); setMessage(null); }}
                    className={`flex-1 py-4 text-sm font-bold transition-colors ${!isLogin ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Criar Conta
                </button>
            </div>

            <div className="p-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 text-green-600 text-sm">
                        <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Email Corporativo ou Pessoal</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Senha de Acesso</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isLogin ? 'Acessar Sistema' : 'Cadastrar Gratuitamente'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-gray-400">
                    Ao continuar, você concorda com nossos Termos de Uso.
                    <br/>Segurança garantida pelo Supabase.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
