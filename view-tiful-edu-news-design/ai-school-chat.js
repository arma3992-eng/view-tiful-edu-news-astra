'use strict';
// AI·디지털교육 페이지의 "AI 중점학교 물어보기" 챗봇 위젯
// 서버: api/chat.js  ·  대화 내용은 이 페이지 메모리에만 있고 저장하지 않습니다.
(() => {
  const root = document.querySelector('#ai-school-chat');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  if ((params.get('type') || 'all') !== 'digital') return;
  root.hidden = false;

  const log = root.querySelector('.chat-log');
  const form = root.querySelector('.chat-form');
  const input = form.querySelector('textarea');
  const sendButton = form.querySelector('button[type="submit"]');
  const counter = root.querySelector('.chat-counter');
  const MAX = 400;
  const history = [];
  let busy = false;

  // 답변 표시: HTML로 해석하지 않고 **굵게**, 줄바꿈, "- " 목록만 텍스트 노드로 만듭니다.
  function appendInline(parent, text) {
    text.split(/(\*\*[^*]+\*\*)/g).forEach(part => {
      if (!part) return;
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        parent.append(strong);
      } else {
        parent.append(document.createTextNode(part));
      }
    });
  }

  function renderRich(container, text) {
    let list = null;
    text.split('\n').forEach(rawLine => {
      const line = rawLine.trimEnd();
      const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (bullet) {
        if (!list) { list = document.createElement('ul'); container.append(list); }
        const item = document.createElement('li');
        appendInline(item, bullet[1]);
        list.append(item);
        return;
      }
      list = null;
      if (!line.trim()) return;
      const paragraph = document.createElement('p');
      appendInline(paragraph, line.replace(/^#+\s*/, ''));
      container.append(paragraph);
    });
  }

  function addMessage(role, text, { error = false } = {}) {
    const bubble = document.createElement('div');
    bubble.className = `chat-msg chat-${role}` + (error ? ' chat-error' : '');
    if (role === 'assistant' && !error) renderRich(bubble, text);
    else bubble.textContent = text;
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  async function ask(question) {
    if (busy) return;
    const text = question.trim();
    if (!text) { input.focus(); return; }
    busy = true;
    sendButton.disabled = true;
    root.querySelectorAll('.chat-suggestions button').forEach(b => { b.disabled = true; });
    addMessage('user', text);
    input.value = '';
    updateCounter();
    const pending = addMessage('assistant', '자료를 확인하고 있습니다…');
    pending.classList.add('chat-pending');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-12) })
      });
      const data = await response.json().catch(() => ({}));
      pending.remove();
      if (!response.ok || !data.answer) {
        addMessage('assistant', data.error || '지금은 답변할 수 없습니다. 잠시 후 다시 시도해 주세요.', { error: true });
        return;
      }
      addMessage('assistant', data.answer);
      history.push({ role: 'user', content: text }, { role: 'assistant', content: data.answer });
    } catch (error) {
      pending.remove();
      addMessage('assistant', '연결에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.', { error: true });
      console.error(error);
    } finally {
      busy = false;
      sendButton.disabled = false;
      root.querySelectorAll('.chat-suggestions button').forEach(b => { b.disabled = false; });
      input.focus();
    }
  }

  function updateCounter() {
    counter.textContent = `${input.value.length}/${MAX}`;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    ask(input.value);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      ask(input.value);
    }
  });
  input.addEventListener('input', updateCounter);
  root.querySelectorAll('.chat-suggestions button').forEach(button => {
    button.addEventListener('click', () => ask(button.textContent));
  });
  updateCounter();
  addMessage('assistant',
    '안녕하세요. 2026년 AI 중점학교의 지역·학교급별 현황, 지정 비율, 학교 이름을 찾아드려요. 아래 예시 질문을 눌러 시작해 보세요.');
})();
