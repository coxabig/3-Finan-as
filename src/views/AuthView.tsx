import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Button, Card, Input } from '../components/ui';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Verifica se o usuário acabou de voltar de um redirecionamento de login
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // Login bem sucedido via redirect
          console.log("Redirect login success");
        }
      } catch (err: any) {
        console.error("Redirect Error:", err);
        setError(`Erro no login por redirecionamento: ${err.message}`);
      }
    };
    checkRedirect();
  }, []);

  const handleGoogleLogin = async (useRedirect = false) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      if (useRedirect) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err: any) {
      console.error("Google Login Error:", err.code, err.message);
      
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado. Tente o botão "Usar Redirecionamento" abaixo ou permita pop-ups.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('O login foi cancelado. Clique novamente para tentar.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`Domínio não autorizado: ${domain}. Adicione este domínio no console do Firebase (Authentication > Settings > Authorized domains).`);
      } else {
        setError(`Erro Google: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Facebook Login Error:", err.code, err.message);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login com Facebook não está ativado no Firebase Console.');
      } else {
        setError(`Erro Facebook: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Apple Login Error:", err.code, err.message);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login com Apple não está ativado no Firebase Console.');
      } else {
        setError(`Erro Apple: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        
        // Send email verification immediately
        await sendEmailVerification(userCred.user);
        setSuccess('Conta criada! Enviamos um link de verificação para seu e-mail. Por favor, verifique-o antes de continuar.');
        // Wait a bit to show the message before (optionally) continuing, 
        // though Firebase Auth will keep them logged in.
      } else {
        await sendPasswordResetEmail(auth, email);
        setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada e spam.');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code, err.message);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha está desativado no Firebase. Ative-o em "Authentication > Sign-in method" no console do Firebase e CLIQUE EM SALVAR.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso. Tente fazer login.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos, ou o método de login não foi habilitado no console do Firebase.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Erro de rede. Verifique sua conexão com a internet.');
      } else {
        setError(`Erro: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black italic text-orange-600 mb-2">3%</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Controle financeiro para casais</p>
        </div>

        <Card className="flex flex-col gap-6 bg-white dark:bg-zinc-900/50 border-none ring-1 ring-zinc-100 dark:ring-zinc-800 shadow-2xl">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar Conta' : 'Recuperar Senha'}
          </h2>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-3 font-black py-7 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all active:scale-[0.98] rounded-2xl shadow-sm uppercase text-xs tracking-widest"
                onClick={() => handleGoogleLogin(false)}
                disabled={loading}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center gap-2 font-black py-7 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all active:scale-[0.98] rounded-2xl shadow-sm uppercase text-[10px] tracking-widest"
                  onClick={handleFacebookLogin}
                  disabled={loading}
                >
                  <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.248h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="flex items-center justify-center gap-2 font-black py-7 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all active:scale-[0.98] rounded-2xl shadow-sm uppercase text-[10px] tracking-widest"
                  onClick={handleAppleLogin}
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.057 10.78c-.01 2.3 1.934 3.403 2.017 3.453-.015.053-.314 1.077-1.032 2.124-.62.906-1.264 1.81-2.274 1.828-1.008.018-1.287-.594-2.436-.594-1.15 0-1.464.577-2.436.612-.97.035-1.706-.976-2.328-1.882-1.272-1.847-2.24-5.213-.935-7.48.647-1.127 1.808-1.84 3.064-1.858 1.007-.018 1.96.678 2.573.678.614 0 1.764-.84 2.97-.716.505.022 1.925.203 2.836 1.536-.073.044-1.69.986-1.707 2.952m-2.702-6.52c.548-.663.916-1.583.815-2.5a2.531 2.531 0 00-1.616.83c-.482.557-.904 1.487-.791 2.39.638.048 1.493-.45 2.149-.72"/>
                  </svg>
                  <span>Apple</span>
                </Button>
              </div>

              <div className="flex flex-col items-center gap-1 mt-1">
                 <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">Pop-up bloqueado? use modo:</p>
                 <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleGoogleLogin(true)}
                  className="h-auto py-1 px-3 text-orange-600 font-black text-[9px] uppercase tracking-widest hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg underline decoration-2 underline-offset-4"
                >
                  Redirecionamento
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
              <span className="text-[10px] uppercase font-bold text-zinc-400">ou com e-mail</span>
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'register' && (
                <Input 
                  placeholder="Nome completo" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}
              <Input 
                type="email" 
                placeholder="E-mail" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {mode !== 'forgot' && (
                <Input 
                  type="password" 
                  placeholder="Senha" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}

              {error && (
                <div className="flex flex-col gap-2">
                  <p className="text-red-500 text-sm font-medium">{error}</p>
                  {error.toLowerCase().includes('google') || error.toLowerCase().includes('pop-up') || error.toLowerCase().includes('erro') ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleGoogleLogin(true)}
                      className="text-orange-600 font-bold hover:bg-orange-50 text-[10px] uppercase tracking-wider h-auto py-2"
                    >
                      Problemas com o pop-up? Tentar Redirecionamento
                    </Button>
                  ) : null}
                </div>
              )}
              {success && <p className="text-emerald-500 text-sm font-medium">{success}</p>}

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? 'Processando...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar e Verificar' : 'Enviar Link de Recuperação'}
              </Button>
            </form>
          </div>

          <div className="flex flex-col gap-2 items-center text-sm">
            {mode === 'login' ? (
              <>
                <button 
                  onClick={() => {
                    setMode('register');
                    setError('');
                    setSuccess('');
                  }} 
                  className="text-orange-600 font-bold hover:underline underline-offset-4"
                >
                  Não tem uma conta? Cadastre-se
                </button>
                <button 
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setSuccess('');
                  }} 
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  Esqueci minha senha
                </button>
              </>
            ) : mode === 'register' ? (
              <button 
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }} 
                className="text-orange-600 font-bold hover:underline underline-offset-4"
              >
                Já tem uma conta? Faça login
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full">
                <button 
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccess('');
                  }} 
                  className="text-orange-600 font-bold hover:underline underline-offset-4"
                >
                  Voltar para login
                </button>
                <div className="border-t border-zinc-100 dark:border-zinc-800 w-full mt-4 pt-4 text-center">
                  <p className="text-[10px] text-zinc-400 uppercase font-black mb-2 tracking-widest">Outras formas de acesso</p>
                  <p className="text-xs text-zinc-500 mb-3 px-4">
                    Se você criou sua conta usando o Google, basta clicar no botão "Entrar com Google" acima para recuperar o acesso instantaneamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
