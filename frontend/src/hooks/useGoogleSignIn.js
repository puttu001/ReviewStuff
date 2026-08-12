import { useCallback, useEffect, useState } from 'react';

const SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Loads Google Identity Services and hands the resulting ID token to `onToken`.
 * The backend does the actual verification — this only obtains the token.
 */
export function useGoogleSignIn(onToken) {
  const [ready, setReady] = useState(false);
  const [configError, setConfigError] = useState(
    CLIENT_ID ? null : 'Missing VITE_GOOGLE_CLIENT_ID — add it to frontend/.env',
  );

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onToken(response.credential),
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setConfigError('Could not load Google sign-in.');
      });

    return () => {
      cancelled = true;
    };
  }, [onToken]);

  const renderButton = useCallback((element) => {
    if (!window.google?.accounts?.id || !element) return;
    element.innerHTML = '';
    window.google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large',
      width: element.offsetWidth || 320,
      text: 'continue_with',
      shape: 'pill',
    });
  }, []);

  const prompt = useCallback(() => {
    window.google?.accounts?.id?.prompt();
  }, []);

  return { ready, renderButton, prompt, configError };
}
