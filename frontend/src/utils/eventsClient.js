import axios from 'axios';
import { Flags, isTestEnv } from './featureFlags';

const STORAGE_KEY = 'merkato-events-buffer';
const ANON_KEY = 'merkato-anonymous-id';

const getAnonId = () => {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
};

const bufferPush = (evt) => {
  try {
    const buf = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    buf.push(evt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buf.slice(-200))); // cap
  } catch {}
};

const flushBuffer = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const buf = JSON.parse(raw);
    if (!Array.isArray(buf) || buf.length === 0) return;
    await Promise.all(
      buf.map((e) => axios.post('/api/behavior/events', e).catch(() => null))
    );
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export const Events = {
  track(eventName, props = {}) {
    if (!Flags.GAMIFICATION && !Flags.BEHAVIORAL_PROMOS) return; // default off
    const payload = {
      anonymousId: getAnonId(),
      eventName,
      props,
      ts: new Date().toISOString(),
    };
    // buffer; send fire-and-forget
    bufferPush(payload);
    if (!isTestEnv()) flushBuffer();
  },
  async mergeOnLogin(token) {
    try {
      const anonymousId = getAnonId();
      if (!anonymousId) return;
      await axios.post(
        '/api/behavior/merge',
        { anonymousId },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      await flushBuffer();
    } catch {}
  },
  async checkIn(token) {
    if (!Flags.GAMIFICATION) return { disabled: true };
    try {
      const res = await axios.post(
        '/api/behavior/checkin',
        {},
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      return res.data;
    } catch (e) {
      return { error: true, message: e?.response?.data?.message || 'Failed' };
    }
  },
};
