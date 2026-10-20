const SUPABASE_URL = 'https://yrldislzvbpxbpgreipi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OLmPjZk8BuKinxCpWIbRUQ_oMmVavpX';

(() => {
  const form = document.getElementById('login-form') || document.getElementById('signup-form');
  const accountUser = document.getElementById('account-user');
  const accountAction = document.getElementById('account-action');
  if (!form && (!accountUser || !accountAction)) return;

  const notice = document.getElementById('auth-notice');
  const submitButton = form && form.querySelector('button[type="submit"]');
  const isSignup = form && form.id === 'signup-form';
  let busy = false;

  function showStatus(state, message) {
    notice.dataset.state = state;
    notice.textContent = message;
  }

  function errorMessage(error) {
    switch (error && error.code) {
      case 'invalid_credentials': return '이메일 또는 비밀번호를 확인해 주세요.';
      case 'email_not_confirmed': return '이메일 인증을 완료한 뒤 로그인해 주세요.';
      case 'user_already_exists':
      case 'email_exists': return '이미 가입된 이메일입니다. 로그인해 주세요.';
      case 'weak_password': return '비밀번호가 보안 조건에 맞지 않습니다. 더 길고 복잡하게 입력해 주세요.';
      case 'email_address_invalid':
      case 'validation_failed': return '입력한 이메일과 회원 정보를 확인해 주세요.';
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit': return '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
      case 'signup_disabled': return '현재 회원가입을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.';
      default: return isSignup
        ? '회원가입을 완료하지 못했습니다. 입력 정보와 연결 상태를 확인해 주세요.'
        : '로그인하지 못했습니다. 입력 정보와 연결 상태를 확인해 주세요.';
    }
  }

  let supabaseClient;
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch {
    if (!form) return;
    submitButton.disabled = true;
    showStatus('error', '인증 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
    form.addEventListener('submit', (event) => event.preventDefault());
    return;
  }

  // Main header shares the existing account links and their styles.
  if (accountUser && accountAction) {
    let signedIn = false;
    let signingOut = false;
    let sessionRevision = 0;

    function renderAccount(session) {
      const user = session && session.user;
      signedIn = Boolean(user);
      if (user) {
        const name = user.user_metadata && user.user_metadata.name;
        accountUser.textContent = (typeof name === 'string' && name.trim()) || user.email || '로그인됨';
        accountUser.removeAttribute('href');
        accountAction.textContent = '로그아웃';
        accountAction.setAttribute('href', '#');
        accountAction.setAttribute('role', 'button');
      } else {
        accountUser.textContent = '로그인';
        accountUser.setAttribute('href', 'login.html');
        accountAction.textContent = '회원가입';
        accountAction.setAttribute('href', 'signup.html');
        accountAction.removeAttribute('role');
      }
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      sessionRevision += 1;
      renderAccount(session);
    });
    const initialRevision = sessionRevision;
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!error && sessionRevision === initialRevision) renderAccount(data.session);
    }).catch(() => {
      // Keep the existing account links available when session lookup fails.
    });

    accountAction.addEventListener('click', async (event) => {
      if (!signedIn && !signingOut) return;
      event.preventDefault();
      if (signingOut) return;
      signingOut = true;
      accountAction.setAttribute('aria-disabled', 'true');
      try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        renderAccount(null);
      } catch {
        window.alert('로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        signingOut = false;
        accountAction.removeAttribute('aria-disabled');
      }
    });
    accountAction.addEventListener('keydown', (event) => {
      if (signedIn && event.key === ' ') {
        event.preventDefault();
        accountAction.click();
      }
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;

    const fields = new FormData(form);
    const email = fields.get('email').trim();
    const password = fields.get('password');
    if (isSignup && password !== fields.get('password_confirmation')) {
      showStatus('error', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    busy = true;
    submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    showStatus('pending', isSignup ? '회원가입 중입니다…' : '로그인 중입니다…');
    let redirecting = false;

    try {
      const result = isSignup
        ? await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fields.get('name').trim(),
              requested_role: fields.get('role') === 'reporter' ? 'reporter' : 'user',
            },
          },
        })
        : await supabaseClient.auth.signInWithPassword({ email, password });

      if (result.error) {
        showStatus('error', errorMessage(result.error));
        return;
      }
      if (!result.data || !result.data.user || (!isSignup && !result.data.session)) {
        showStatus('error', errorMessage(null));
        return;
      }
      if (isSignup && !result.data.session) {
        showStatus('success', '가입 신청이 완료되었습니다. 이메일 인증 후 로그인해 주세요.');
        return;
      }

      showStatus('success', isSignup
        ? '회원가입이 완료되었습니다. 메인 페이지로 이동합니다.'
        : '로그인되었습니다. 메인 페이지로 이동합니다.');
      redirecting = true;
      window.setTimeout(() => window.location.assign('index.html'), 1000);
    } catch {
      showStatus('error', '서버에 연결하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.');
    } finally {
      if (!redirecting) {
        busy = false;
        submitButton.disabled = false;
        form.removeAttribute('aria-busy');
      }
    }
  });
})();
