import { useState, useEffect } from 'react';
import { tickerMessages } from '../data/mockData';

export function AlertTicker() {
  const [messages, setMessages] = useState(tickerMessages);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => prev - 1);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  // Duplicate messages for seamless loop
  const displayMessages = [...messages, ...messages, ...messages];

  return (
    <div
      className="h-10 flex items-center overflow-hidden border-b relative"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div
        className="flex items-center gap-8 whitespace-nowrap"
        style={{
          transform: `translateX(${offset}px)`,
          willChange: 'transform',
        }}
      >
        {displayMessages.map((msg, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2"
            style={{
              fontSize: '0.875rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: msg.color }}
            />
            <span style={{ color: msg.color }}>
              {msg.icon} {msg.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
