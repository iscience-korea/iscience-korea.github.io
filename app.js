// =========================================
// 자유게시판 프론트엔드 로직
// 백엔드 API: /iscience/api  (Apache ProxyPass 기준)
// =========================================

const API_BASE = '/iscience/api';
const PAGE_SIZE = 10;

let state = {
  currentView: 'list',
  currentPage: 1,
  currentPostId: null,
};

// ---------- 화면 전환 ----------
function navigate(view, payload) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  state.currentView = view;

  if (view === 'list') {
    loadPosts(payload && payload.page ? payload.page : 1);
  } else if (view === 'write') {
    document.getElementById('form-write').reset();
  } else if (view === 'detail') {
    state.currentPostId = payload.id;
    loadDetail(payload.id);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- 토스트 ----------
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

// ---------- 유틸 ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail = '요청 처리 중 오류가 발생했습니다.';
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

// ---------- 글 목록 ----------
async function loadPosts(page = 1) {
  state.currentPage = page;
  const listEl = document.getElementById('post-list');
  listEl.innerHTML = `<div class="empty-state">불러오는 중...</div>`;

  try {
    const data = await apiFetch(`/posts?page=${page}&page_size=${PAGE_SIZE}`);
    renderList(data);
  } catch (e) {
    listEl.innerHTML = `<div class="empty-state">목록을 불러오지 못했습니다.<br>${escapeHtml(e.message)}</div>`;
  }
}

function renderList(data) {
  const listEl = document.getElementById('post-list');
  const { items, total, page, page_size } = data;

  if (!items || items.length === 0) {
    listEl.innerHTML = `<div class="empty-state">아직 등록된 글이 없습니다.<br>첫 글을 작성해보세요! ✍️</div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  listEl.innerHTML = items.map(post => `
    <div class="post-card" onclick="navigate('detail', {id: ${post.id}})">
      <div class="post-card-top">
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <span class="badge">👁 ${post.view_count}</span>
      </div>
      <div class="post-meta">
        <span>✍️ ${escapeHtml(post.author || '익명')}</span>
        <span>🕒 ${formatDate(post.created_at)}</span>
      </div>
    </div>
  `).join('');

  renderPagination(total, page, page_size);
}

function renderPagination(total, page, pageSize) {
  const pagEl = document.getElementById('pagination');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  let html = '';
  html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="loadPosts(${page - 1})">‹</button>`;

  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);

  if (start > 1) html += `<button class="page-btn" onclick="loadPosts(1)">1</button>`;
  if (start > 2) html += `<span class="page-btn" style="border:none;background:none;">…</span>`;

  for (let p = start; p <= end; p++) {
    html += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="loadPosts(${p})">${p}</button>`;
  }

  if (end < totalPages - 1) html += `<span class="page-btn" style="border:none;background:none;">…</span>`;
  if (end < totalPages) html += `<button class="page-btn" onclick="loadPosts(${totalPages})">${totalPages}</button>`;

  html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="loadPosts(${page + 1})">›</button>`;

  pagEl.innerHTML = html;
}

// ---------- 글쓰기 ----------
document.getElementById('form-write').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('write-title').value.trim();
  const author = document.getElementById('write-author').value.trim() || '익명';
  const content = document.getElementById('write-content').value.trim();

  if (!title || !content) {
    showToast('제목과 내용을 입력해주세요.');
    return;
  }

  try {
    const post = await apiFetch('/posts', {
      method: 'POST',
      body: JSON.stringify({ title, author, content }),
    });
    showToast('글이 등록되었습니다.');
    navigate('list', { page: 1 });
  } catch (e) {
    showToast(e.message);
  }
});

// ---------- 상세 보기 ----------
async function loadDetail(id) {
  const detailEl = document.getElementById('post-detail');
  const commentListEl = document.getElementById('comment-list');
  detailEl.innerHTML = `<div class="empty-state">불러오는 중...</div>`;
  commentListEl.innerHTML = '';

  try {
    const post = await apiFetch(`/posts/${id}`);
    renderDetail(post);
  } catch (e) {
    detailEl.innerHTML = `<div class="empty-state">글을 불러오지 못했습니다.<br>${escapeHtml(e.message)}</div>`;
  }
}

function renderDetail(post) {
  const detailEl = document.getElementById('post-detail');
  detailEl.innerHTML = `
    <h2>${escapeHtml(post.title)}</h2>
    <div class="post-meta">
      <span>✍️ ${escapeHtml(post.author || '익명')}</span>
      <span>🕒 ${formatDate(post.created_at)}</span>
      <span>👁 조회 ${post.view_count}</span>
    </div>
    <div class="post-body">${escapeHtml(post.content)}</div>
  `;

  renderComments(post.comments || []);
}

function renderComments(comments) {
  document.getElementById('comment-count').textContent = `(${comments.length})`;
  const listEl = document.getElementById('comment-list');

  if (comments.length === 0) {
    listEl.innerHTML = `<div class="no-comments">첫 댓글을 남겨보세요.</div>`;
    return;
  }

  listEl.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="comment-item-top">
        <span class="comment-author">${escapeHtml(c.author || '익명')}</span>
        <span>${formatDate(c.created_at)}</span>
      </div>
      <div class="comment-content">${escapeHtml(c.content)}</div>
    </div>
  `).join('');
}

// ---------- 댓글 등록 ----------
document.getElementById('form-comment').addEventListener('submit', async (e) => {
  e.preventDefault();
  const author = document.getElementById('comment-author').value.trim() || '익명';
  const content = document.getElementById('comment-content').value.trim();

  if (!content) {
    showToast('댓글 내용을 입력해주세요.');
    return;
  }
  if (!state.currentPostId) return;

  try {
    await apiFetch(`/posts/${state.currentPostId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ author, content }),
    });
    document.getElementById('comment-author').value = '';
    document.getElementById('comment-content').value = '';
    showToast('댓글이 등록되었습니다.');
    // 상세를 다시 불러오면 조회수가 또 올라가므로, 댓글만 다시 받아오는 대신 목록만 갱신
    const post = await apiFetch(`/posts/${state.currentPostId}`);
    // 조회수 중복 증가 방지가 필요하면 백엔드에 /posts/{id}/detail-nohit 같은 별도 엔드포인트를 추가하세요.
    renderDetail(post);
  } catch (e) {
    showToast(e.message);
  }
});

// ---------- 초기 진입 ----------
document.addEventListener('DOMContentLoaded', () => {
  navigate('list');
});
