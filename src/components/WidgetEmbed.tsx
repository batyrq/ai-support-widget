'use client';

import { useEffect } from 'react';

// Встраивает widget.js ровно так, как это сделал бы клиент на своём сайте.
// (Создаём <script> с data-bot-id — виджет сам нарисует пузырь в углу.)
export default function WidgetEmbed({ botId }: { botId: string }) {
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '/widget.js';
    s.setAttribute('data-bot-id', botId);
    s.async = true;
    document.body.appendChild(s);
    return () => {
      s.remove();
      document.getElementById('ai-support-widget')?.remove();
    };
  }, [botId]);
  return null;
}
