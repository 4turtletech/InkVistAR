import React, { lazy, Suspense, useState } from 'react';
import './DeferredChatWidget.css';

const ChatWidget = lazy(() => import('./ChatWidget'));

function ChatLauncher({ onClick, loading = false }) {
  return (
    <button
      type="button"
      className="deferred-chat-fab"
      onClick={onClick}
      aria-label={loading ? 'Opening chat assistant' : 'Open chat assistant'}
      aria-busy={loading || undefined}
      disabled={loading}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    </button>
  );
}

export default function DeferredChatWidget(props) {
  const [hasOpened, setHasOpened] = useState(false);

  if (!hasOpened) {
    return <ChatLauncher onClick={() => setHasOpened(true)} />;
  }

  return (
    <Suspense fallback={<ChatLauncher loading />}>
      <ChatWidget {...props} initiallyOpen />
    </Suspense>
  );
}
