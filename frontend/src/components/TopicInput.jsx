const DATALIST_ID = 'topic-suggestions';

/**
 * Free-text topic entry backed by existing topics.
 * Topics are plain strings with no lookup table, so suggesting what already
 * exists is the only thing stopping "tech" and "Tech" becoming two topics.
 */
export default function TopicInput({ value, onChange, topics = [], ...props }) {
  return (
    <>
      <input
        className="input"
        list={DATALIST_ID}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pick or type a topic"
        {...props}
      />
      <datalist id={DATALIST_ID}>
        {topics.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  );
}
