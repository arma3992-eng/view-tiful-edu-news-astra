(() => {
  const supabaseClient = window.viewtifulSupabaseClient;
  const status = document.getElementById('admin-status');
  const content = document.getElementById('admin-content');
  const list = document.getElementById('pending-reporters');
  let generation = 0;
  let authRevision = 0;
  let activeUserId = null;
  let authorizedUserId = null;
  let processing = false;

  function showStatus(state, message) {
    status.dataset.state = state;
    status.textContent = message;
  }

  function clearAccess() {
    generation += 1;
    authorizedUserId = null;
    processing = false;
    content.hidden = true;
    list.replaceChildren();
  }

  if (!supabaseClient) {
    showStatus('error', '인증 서비스를 불러오지 못했습니다. 새로고침해 주세요.');
    return;
  }

  function setButtonsDisabled(disabled) {
    list.querySelectorAll('button').forEach((button) => { button.disabled = disabled || button.dataset.unavailable === 'true'; });
    content.setAttribute('aria-busy', String(disabled));
  }

  function formatDate(value) {
    if (!value) return '정보 없음';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '정보 없음' : date.toLocaleString('ko-KR');
  }

  function renderRequests(rows) {
    list.replaceChildren();
    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = '승인 대기 중인 기자 신청이 없습니다.';
      list.append(empty);
      return;
    }
    const states = { pending: '승인 대기', approved: '승인', rejected: '거절', not_requested: '신청 없음' };
    rows.forEach((row) => {
      const card = document.createElement('article');
      card.className = 'admin-request';
      const info = document.createElement('div');
      const name = document.createElement('h3');
      name.textContent = row.name || '이름 없음';
      const state = document.createElement('p');
      state.textContent = '신청 상태: ' + (states[row.reporter_status] || '확인 필요');
      const date = document.createElement('p');
      date.textContent = '신청일: ' + formatDate(row.created_at);
      info.append(name, state, date);
      const actions = document.createElement('div');
      actions.className = 'admin-request-actions';
      ['approve', 'reject'].forEach((action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-decision';
        button.dataset.action = action;
        button.textContent = action === 'approve' ? '승인' : '거절';
        button.setAttribute('aria-label', name.textContent + ' 신청 ' + button.textContent);
        button.dataset.unavailable = String(!row.id || row.reporter_status !== 'pending');
        button.disabled = button.dataset.unavailable === 'true';
        button.addEventListener('click', () => decide(action, row.id));
        actions.append(button);
      });
      card.append(info, actions);
      list.append(card);
    });
  }

  async function loadPending(version) {
    const { data, error } = await supabaseClient.rpc('get_pending_reporters');
    if (version !== generation || !authorizedUserId) return false;
    if (error || !Array.isArray(data)) throw new Error('pending_lookup_failed');
    renderRequests(data);
    content.hidden = false;
    return true;
  }

  async function verifyAccess(session) {
    clearAccess();
    const version = generation;
    const user = session && session.user;
    activeUserId = user ? user.id : null;
    if (!user) {
      window.location.replace('login.html');
      return;
    }
    showStatus('pending', '관리자 권한을 확인하고 있습니다.');
    try {
      const { data, error } = await supabaseClient.from('profiles')
        .select('role').eq('id', user.id).single();
      if (version !== generation) return;
      if (error) throw error;
      if (!data || data.role !== 'admin') {
        window.location.replace('index.html');
        return;
      }
      authorizedUserId = user.id;
      showStatus('pending', '기자 신청을 불러오고 있습니다.');
      if (await loadPending(version)) showStatus('success', '기자 신청 목록을 확인했습니다.');
    } catch {
      if (version !== generation) return;
      clearAccess();
      showStatus('error', '권한 또는 신청 목록을 확인하지 못했습니다. 새로고침해 주세요.');
    }
  }

  async function decide(action, userId) {
    if (!authorizedUserId || processing || !userId) return;
    const version = generation;
    processing = true;
    setButtonsDisabled(true);
    showStatus('pending', action === 'approve' ? '승인 처리 중입니다…' : '거절 처리 중입니다…');
    let completed = false;
    try {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (version !== generation) return;
      if (sessionError) throw sessionError;
      if (!sessionData.session || sessionData.session.user.id !== authorizedUserId) {
        await verifyAccess(sessionData.session);
        return;
      }
      const { error } = await supabaseClient.rpc(
        action === 'approve' ? 'approve_reporter' : 'reject_reporter',
        { target_user_id: userId }
      );
      if (version !== generation) return;
      if (error) throw error;
      completed = true;
      if (await loadPending(version)) {
        showStatus('success', action === 'approve' ? '기자 신청을 승인했습니다.' : '기자 신청을 거절했습니다.');
      }
    } catch {
      if (version !== generation) return;
      if (completed) {
        list.replaceChildren();
        showStatus('error', '처리는 완료했지만 목록을 새로 불러오지 못했습니다. 새로고침해 주세요.');
      } else {
        showStatus('error', '처리하지 못했습니다. 권한과 연결 상태를 확인한 뒤 다시 시도해 주세요.');
      }
    } finally {
      if (version === generation) {
        processing = false;
        setButtonsDisabled(false);
      }
    }
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    authRevision += 1;
    const userId = session && session.user ? session.user.id : null;
    if (!userId) {
      activeUserId = null;
      clearAccess();
      window.location.replace('login.html');
    } else if (userId !== activeUserId) {
      activeUserId = userId;
      clearAccess();
      const version = generation;
      window.setTimeout(() => {
        if (version === generation) verifyAccess(session);
      }, 0);
    }
  });
  const initialRevision = authRevision;
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (authRevision !== initialRevision) return;
    if (error) throw error;
    return verifyAccess(data.session);
  }).catch(() => {
    if (authRevision !== initialRevision) return;
    clearAccess();
    showStatus('error', '로그인 상태를 확인하지 못했습니다. 새로고침해 주세요.');
  });
})();
