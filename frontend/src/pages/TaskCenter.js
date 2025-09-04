import React, { useEffect, useMemo, useRef, useState } from 'react';

function useEventSource(url) {
  const [messages, setMessages] = useState([]);
  const esRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;
    const onMessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setMessages((prev) => [...prev, data]);
      } catch {}
    };
    es.addEventListener('message', onMessage);
    es.onerror = () => {
      // auto-close on error
      es.close();
    };
    return () => {
      es.removeEventListener('message', onMessage);
      es.close();
    };
  }, [url]);

  return messages;
}

const SPINNER = (
  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #ccc', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

export default function TaskCenter() {
  const [defs, setDefs] = useState([]);
  const [running, setRunning] = useState(null); // { id, key }
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((d) => setDefs(d.tasks || []))
      .catch(() => setDefs([]));
  }, []);

  const streamUrl = useMemo(() => (running ? `/api/tasks/${running.id}/stream` : ''), [running]);
  const events = useEventSource(streamUrl);

  useEffect(() => {
    if (!events.length) return;
    const last = events[events.length - 1];
    if (last.type === 'status') setStatus(last.status);
    if (last.type === 'log') setLogs((prev) => [...prev, last.line]);
  }, [events]);

  async function startTask(key) {
    setStatus('running');
    setLogs([]);
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus('error');
      setLogs((l) => [...l, `ERROR: ${data.message || 'Failed to start task'}`]);
      return;
    }
    setRunning({ id: data.id, key: data.key });
  }

  async function cancelTask() {
    if (!running) return;
    await fetch(`/api/tasks/${running.id}/cancel`, { method: 'POST' });
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Task Center</h1>
      <p>Run critical commands with live status and logs.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {defs.map((d) => (
          <button key={d.key} onClick={() => startTask(d.key)} disabled={status === 'running'}>
            {status === 'running' && running?.key === d.key ? SPINNER : null}
            <span style={{ marginLeft: 8 }}>{d.label}</span>
          </button>
        ))}
        {running && (
          <button onClick={cancelTask} style={{ background: '#e74c3c', color: '#fff' }}>
            Cancel
          </button>
        )}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Status: </strong>
        <span>{status || 'idle'}</span>
      </div>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, minHeight: 240, overflow: 'auto' }}>
        {logs.join('\n')}
      </pre>
      <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
