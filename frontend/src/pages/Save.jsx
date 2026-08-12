import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';
import TopicInput from '../components/TopicInput';
import { api } from '../api/client';
import { isUrl } from '../utils/format';

export default function Save() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getItems()
      .then((items) => {
        const unique = [...new Set(items.map((i) => i.topic).filter(Boolean))];
        setTopics(unique.sort());
      })
      .catch(() => {});
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    const value = content.trim();

    if (!value) {
      setError('Add a link or a note to save.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      // The backend accepts either; sending the right field keeps a pasted
      // link from being treated as a note.
      await api.save({
        url: isUrl(value) ? value : undefined,
        text: isUrl(value) ? undefined : value,
        title: title.trim() || undefined,
        topic: topic.trim() || undefined,
      });

      setContent('');
      setTitle('');
      setTopic('');
      setSaved(true);
      if (topic.trim() && !topics.includes(topic.trim())) {
        setTopics((t) => [...t, topic.trim()].sort());
      }
    } catch (err) {
      setError(err.message || 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="page" onSubmit={handleSave}>
        <h1 className="page-title">Save something</h1>

        <div className="field">
          <textarea
            className={`textarea ${error ? 'textarea--error' : ''}`}
            placeholder="Paste a link or write a note"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
              if (saved) setSaved(false);
            }}
          />
          {error && <p className="field-error">{error}</p>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="title">
            Title (optional)
          </label>
          <input
            id="title"
            className="input"
            placeholder="Optional"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="topic">
            Topic (optional)
          </label>
          <TopicInput id="topic" value={topic} onChange={setTopic} topics={topics} />
        </div>

        {saved && (
          <Toast
            message="Saved. You'll see it tomorrow."
            onClose={() => setSaved(false)}
          />
        )}

        <div className="spacer" />

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>
      <BottomNav />
    </>
  );
}
