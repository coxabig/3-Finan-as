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
  GoogleAuthProvider
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
        setError(`Erro: ${err.message}`);
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
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 font-bold py-6 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading && mode === 'login' && !email ? (
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading && mode === 'login' && !email ? 'Conectando...' : 'Entrar com Google'}
            </Button>

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
