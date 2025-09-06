import React, { useState } from 'react';
import { Flags } from '../utils/featureFlags';
import { Events } from '../utils/eventsClient';

export default function DailyCheckIn() {
  const [status, setStatus] = useState('idle');
  if (!Flags.GAMIFICATION) return null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const onCheckIn = async () => {
    setStatus('loading');
    const res = await Events.checkIn(token);
    if (res?.error) setStatus('error');
    else if (res?.alreadyCheckedIn) setStatus('already');
    else setStatus('done');
  };

  return (
    <div style={{ marginTop: 16 }} aria-live="polite">
      <button data-testid="check-in-btn" onClick={onCheckIn} disabled={status==='loading'}>
        {status==='loading' ? 'Checking in…' : 'Daily Check-in'}
      </button>
      {status==='done' && <span data-testid="check-in-msg" style={{ marginLeft: 8 }}>Checked in! 🎉</span>}
      {status==='already' && <span data-testid="check-in-msg" style={{ marginLeft: 8 }}>Already checked in today</span>}
      {status==='error' && <span data-testid="check-in-msg" style={{ marginLeft: 8 }}>Failed to check in</span>}
    </div>
  );
}
