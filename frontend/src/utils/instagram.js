const SCRIPT_ID = 'reviewstuff-instagram-embed-script';
let scriptPromise;

// Share URLs often include tracking parameters. Only actual post permalinks
// belong in the embed; profiles, share redirects and lookalike hosts do not.
export function instagramPostUrl(content) {
  try {
    const url = new URL(content.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname)) {
      return null;
    }
    if (url.username || url.password || url.port) return null;

    const match = url.pathname.match(/^\/(p|reel|tv)\/([\w-]+)\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/` : null;
  } catch {
    return null;
  }
}

export function loadInstagramEmbeds() {
  if (window.instgrm?.Embeds?.process) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;

    function finish(error) {
      clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve();
      }
    }

    function onLoad() {
      finish(window.instgrm?.Embeds?.process ? null : new Error('Instagram embeds unavailable'));
    }

    function onError() {
      finish(new Error('Instagram embed script could not load'));
    }

    const timer = setTimeout(onError, 12000);
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    document.head.append(script);
  }).catch((error) => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
}
