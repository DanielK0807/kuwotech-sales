/**
 * ============================================
 * 오류사항 확인 페이지
 * v2.0 - 해결/미해결 상태 관리 및 필터링 기능 추가
 * ============================================
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { showToast } from '../../01.common/14_toast.js';

// 전역 변수
let errorLogs = [];
let lastRefreshTime = null;
let currentFilter = 'all'; // all, resolved, unresolved
let currentUser = null; // 현재 로그인한 사용자

console.log('🔍 [오류사항 페이지] v2.0 로드됨 - 해결/미해결 상태 관리');

/**
 * 페이지 초기화
 */
const init = async () => {
  console.log('[오류사항] 페이지 초기화 시작');

  // 현재 사용자 정보 가져오기
  const userJson = sessionStorage.getItem('user') || localStorage.getItem('user');
  if (userJson) {
    try {
      currentUser = JSON.parse(userJson);
    } catch (error) {
      console.warn('[오류사항] 사용자 정보 파싱 실패:', error);
    }
  }

  // 이벤트 리스너 등록
  setupEventListeners();

  // 에러 로그 로드 (기본: 미해결만)
  currentFilter = 'unresolved';
  await loadErrorLogs();
};

/**
 * 이벤트 리스너 설정
 */
const setupEventListeners = () => {
  // 필터 버튼들
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      // 모든 버튼에서 active 제거
      filterBtns.forEach(b => b.classList.remove('active'));

      // 클릭된 버튼에 active 추가
      btn.classList.add('active');

      // 필터 적용
      const filter = btn.dataset.filter;
      currentFilter = filter;

      console.log(`🔍 [오류사항] 필터 변경: ${filter}`);
      await loadErrorLogs();
    });
  });

  // 새로고침 버튼
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      console.log('🔄 [오류사항] ===== 새로고침 버튼 클릭됨 =====');

      // 버튼 비활성화 및 로딩 효과
      refreshBtn.disabled = true;
      refreshBtn.classList.add('loading');

      try {
        await loadErrorLogs();
        console.log('✅ [오류사항] 새로고침 성공!');
        showToast('✅ 오류 내역을 새로고침했습니다.', 'success');
      } catch (error) {
        console.error('❌ [오류사항] 새로고침 실패:', error);
        showToast('❌ 새로고침에 실패했습니다.', 'error');
      } finally {
        // 버튼 다시 활성화
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
        console.log('🏁 [오류사항] ===== 새로고침 완료 =====');
      }
    });
  } else {
    console.warn('⚠️ [오류사항] 새로고침 버튼을 찾을 수 없습니다.');
  }

  // 모달 닫기
  document.getElementById('close-modal')?.addEventListener('click', () => {
    closeModal();
  });

  // 모달 배경 클릭 시 닫기
  document.getElementById('error-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'error-detail-modal') {
      closeModal();
    }
  });
};

/**
 * 에러 로그 로드
 */
const loadErrorLogs = async () => {
  try {
    console.log('[오류사항] 에러 로그 조회 시작, 필터:', currentFilter);

    const apiManager = ApiManager.getInstance();
    const params = {
      limit: 100,
      offset: 0
    };

    // 필터에 따라 resolved 파라미터 추가
    if (currentFilter === 'unresolved') {
      params.resolved = '0';
    } else if (currentFilter === 'resolved') {
      params.resolved = '1';
    }
    // currentFilter === 'all'이면 resolved 파라미터 없음 (전체 조회)

    const response = await apiManager.get('/errors', params);

    console.log('[오류사항] API 응답:', response);

    // API 응답 형식 확인
    if (response && (response.success !== false)) {
      const data = response.data || response;
      errorLogs = data.errors || [];
      const total = data.total || errorLogs.length;

      console.log(`[오류사항] ${errorLogs.length}건의 오류 내역 로드 완료 (전체: ${total}건)`);

      // 통계 업데이트
      updateStats();

      // 테이블 렌더링
      renderErrorTable();
    } else {
      throw new Error('에러 로그 조회 실패');
    }
  } catch (error) {
    console.error('[오류사항] 에러 로그 로드 실패:', error);
    showToast('오류 내역을 불러오는데 실패했습니다.', 'error');

    // 에러 메시지 표시
    const tbody = document.getElementById('error-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="no-errors">오류 내역을 불러올 수 없습니다.</td>
        </tr>
      `;
    }

    // 에러를 다시 throw해서 호출자가 알 수 있도록
    throw error;
  }
};

/**
 * 통계 업데이트
 */
const updateStats = () => {
  // 해결/미해결 개수 계산
  const resolvedCount = errorLogs.filter(e => e.resolved === 1).length;
  const unresolvedCount = errorLogs.filter(e => e.resolved === 0).length;
  const total = errorLogs.length;

  // 통계 표시
  const totalElement = document.getElementById('total-errors');
  const resolvedElement = document.getElementById('resolved-errors');
  const unresolvedElement = document.getElementById('unresolved-errors');

  if (totalElement) {
    totalElement.textContent = total.toLocaleString();
  }

  if (resolvedElement) {
    resolvedElement.textContent = resolvedCount.toLocaleString();
  }

  if (unresolvedElement) {
    unresolvedElement.textContent = unresolvedCount.toLocaleString();
  }

  // 마지막 새로고침 시간 업데이트
  lastRefreshTime = new Date();
};

/**
 * 에러 테이블 렌더링
 */
const renderErrorTable = () => {
  const tbody = document.getElementById('error-table-body');
  if (!tbody) return;

  // 테이블 업데이트 시 깜빡이는 효과
  tbody.style.transition = 'opacity 0.3s ease';
  tbody.style.opacity = '0.3';

  if (errorLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="no-errors">✅ ${currentFilter === 'unresolved' ? '미해결 오류가 없습니다.' : '오류 내역이 없습니다.'}</td>
      </tr>
    `;
  } else {
    tbody.innerHTML = errorLogs
      .map((error, index) => {
        const timestamp = formatTimestamp(error.timestamp);
        const pageUrl = error.pageUrl ? new URL(error.pageUrl).pathname : '-';

        // 상태 배지
        const statusBadge = error.resolved === 1
          ? '<span class="status-badge resolved">✅ 해결</span>'
          : '<span class="status-badge unresolved">⚠️ 미해결</span>';

        // 해결 버튼 (미해결인 경우만)
        const resolveBtn = error.resolved === 0
          ? `<button class="btn-resolve" onclick="showResolveDialog(${error.id})">해결 처리</button>`
          : `<span style="color: #28a745; font-size: 12px;">처리 완료</span>`;

        return `
          <tr>
            <td>${errorLogs.length - index}</td>
            <td>${statusBadge}</td>
            <td class="error-timestamp">${timestamp}</td>
            <td>${error.userName || '-'}</td>
            <td>${error.userRole || '-'}</td>
            <td>
              <div class="error-message" onclick="showErrorDetail(${error.id})">
                ${escapeHtml(error.errorMessage)}
              </div>
            </td>
            <td>${pageUrl}</td>
            <td>${resolveBtn}</td>
          </tr>
        `;
      })
      .join('');
  }

  // 페이드인 효과
  setTimeout(() => {
    tbody.style.opacity = '1';
  }, 100);

  console.log(`✅ [오류사항] 테이블 렌더링 완료 - ${errorLogs.length}건 표시`);
};

/**
 * 에러 상세 정보 표시
 */
window.showErrorDetail = (errorId) => {
  const error = errorLogs.find((e) => e.id === errorId);
  if (!error) return;

  const detailBody = document.getElementById('error-detail-body');
  if (!detailBody) return;

  let resolvedInfo = '';
  if (error.resolved === 1) {
    resolvedInfo = `
      <div class="error-detail-section" style="background: #d4edda; padding: 12px; border-radius: 4px;">
        <div class="error-detail-label">✅ 해결 정보</div>
        <div style="font-size: 14px; margin-top: 8px;">
          <strong>해결자:</strong> ${error.resolvedBy || '-'}<br>
          <strong>해결 시간:</strong> ${formatTimestamp(error.resolvedAt)}<br>
          ${error.resolutionNote ? `<strong>해결 메모:</strong><br><div style="margin-top: 4px; padding: 8px; background: white; border-radius: 4px;">${escapeHtml(error.resolutionNote)}</div>` : ''}
        </div>
      </div>
    `;
  }

  detailBody.innerHTML = `
    <div class="error-detail-section">
      <div class="error-detail-label">발생 시간</div>
      <div class="error-detail-value">${formatTimestamp(error.timestamp)}</div>
    </div>
    <div class="error-detail-section">
      <div class="error-detail-label">사용자</div>
      <div class="error-detail-value">${error.userName || '-'} (${error.userRole || '-'})</div>
    </div>
    <div class="error-detail-section">
      <div class="error-detail-label">페이지 URL</div>
      <div class="error-detail-value">${error.pageUrl || '-'}</div>
    </div>
    <div class="error-detail-section">
      <div class="error-detail-label">브라우저 정보</div>
      <div class="error-detail-value">${error.browserInfo || '-'}</div>
    </div>
    <div class="error-detail-section">
      <div class="error-detail-label">오류 메시지</div>
      <div class="error-detail-value">${escapeHtml(error.errorMessage)}</div>
    </div>
    ${
      error.errorStack
        ? `
    <div class="error-detail-section">
      <div class="error-detail-label">스택 트레이스</div>
      <div class="error-stack">${escapeHtml(error.errorStack)}</div>
    </div>
    `
        : ''
    }
    ${resolvedInfo}
  `;

  // 모달 열기
  openModal();
};

/**
 * 해결 처리 다이얼로그 표시
 */
window.showResolveDialog = (errorId) => {
  const error = errorLogs.find((e) => e.id === errorId);
  if (!error) return;

  const detailBody = document.getElementById('error-detail-body');
  if (!detailBody) return;

  detailBody.innerHTML = `
    <div class="error-detail-section">
      <div class="error-detail-label">오류 메시지</div>
      <div class="error-detail-value">${escapeHtml(error.errorMessage)}</div>
    </div>
    <div class="error-detail-section">
      <div class="error-detail-label">발생 시간</div>
      <div class="error-detail-value">${formatTimestamp(error.timestamp)}</div>
    </div>
    <div class="resolve-section">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #007bff;">✅ 해결 처리</h3>
      <textarea id="resolution-note" placeholder="해결 방법이나 메모를 입력하세요... (선택사항)"></textarea>
      <div class="resolve-actions">
        <button class="btn-cancel-resolve" onclick="closeModal()">취소</button>
        <button class="btn-confirm-resolve" onclick="confirmResolve(${errorId})">해결 완료</button>
      </div>
    </div>
  `;

  openModal();
};

/**
 * 해결 처리 확인
 */
window.confirmResolve = async (errorId) => {
  try {
    const resolutionNote = document.getElementById('resolution-note')?.value || '';

    if (!currentUser || !currentUser.name) {
      showToast('사용자 정보를 확인할 수 없습니다.', 'error');
      return;
    }

    const apiManager = ApiManager.getInstance();
    const response = await apiManager.request(`/errors/${errorId}/resolve`, {
      method: 'PATCH',
      body: {
        resolvedBy: currentUser.name,
        resolutionNote: resolutionNote
      }
    });

    console.log('[오류사항] 해결 처리 완료:', response);

    showToast('✅ 오류가 해결 처리되었습니다.', 'success');

    // 모달 닫기
    closeModal();

    // 목록 새로고침
    await loadErrorLogs();

  } catch (error) {
    console.error('[오류사항] 해결 처리 실패:', error);
    showToast('❌ 해결 처리 중 오류가 발생했습니다.', 'error');
  }
};

/**
 * 모달 열기
 */
const openModal = () => {
  const modal = document.getElementById('error-detail-modal');
  if (modal) {
    modal.classList.add('active');
  }
};

/**
 * 모달 닫기
 */
const closeModal = () => {
  const modal = document.getElementById('error-detail-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

/**
 * 타임스탬프 포맷팅
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * HTML 이스케이프
 */
const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// 페이지 로드 시 초기화 (동적 로드 대응)
if (document.readyState === 'loading') {
  // 아직 로딩 중이면 이벤트 리스너 등록
  document.addEventListener('DOMContentLoaded', init);
} else {
  // 이미 로드되었으면 바로 실행 (관리자 레이아웃에서 동적 로드된 경우)
  init();
}
