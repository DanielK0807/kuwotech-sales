/**
 * ============================================
 * 웹사용기록 페이지
 * v1.0 - 접속 로그 조회 및 통계
 * ============================================
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { showToast } from '../../01.common/14_toast.js';

// 전역 변수
let accessLogs = [];
let accessStats = null;
let startDate = null;
let endDate = null;

console.log('📊 [웹사용기록] v1.0 로드됨');

/**
 * 페이지 초기화
 */
const init = async () => {
  console.log('[웹사용기록] 페이지 초기화 시작');

  // 기본 날짜 설정 (최근 30일)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  endDate = formatDate(today);
  startDate = formatDate(thirtyDaysAgo);

  // 날짜 입력 필드에 기본값 설정
  document.getElementById('start-date').value = startDate;
  document.getElementById('end-date').value = endDate;

  // 이벤트 리스너 등록
  setupEventListeners();

  // 접속 로그 및 통계 로드
  await Promise.all([loadAccessLogs(), loadAccessStats()]);
};

/**
 * 이벤트 리스너 설정
 */
const setupEventListeners = () => {
  // 조회 버튼
  const filterBtn = document.getElementById('filter-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', async () => {
      const startDateInput = document.getElementById('start-date').value;
      const endDateInput = document.getElementById('end-date').value;

      if (!startDateInput || !endDateInput) {
        showToast('시작일과 종료일을 모두 선택하세요.', 'warning');
        return;
      }

      startDate = startDateInput;
      endDate = endDateInput;

      console.log(`📅 [웹사용기록] 기간 조회: ${startDate} ~ ${endDate}`);
      await Promise.all([loadAccessLogs(), loadAccessStats()]);
    });
  }

  // 초기화 버튼
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      endDate = formatDate(today);
      startDate = formatDate(thirtyDaysAgo);

      document.getElementById('start-date').value = startDate;
      document.getElementById('end-date').value = endDate;

      console.log('🔄 [웹사용기록] 필터 초기화');
      await Promise.all([loadAccessLogs(), loadAccessStats()]);
    });
  }

  // 새로고침 버튼
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      console.log('🔄 [웹사용기록] ===== 새로고침 버튼 클릭됨 =====');

      refreshBtn.disabled = true;
      refreshBtn.classList.add('loading');

      try {
        await Promise.all([loadAccessLogs(), loadAccessStats()]);
        console.log('✅ [웹사용기록] 새로고침 성공!');
        showToast('✅ 접속 기록을 새로고침했습니다.', 'success');
      } catch (error) {
        console.error('❌ [웹사용기록] 새로고침 실패:', error);
        showToast('❌ 새로고침에 실패했습니다.', 'error');
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
        console.log('🏁 [웹사용기록] ===== 새로고침 완료 =====');
      }
    });
  }

  // 모달 닫기
  document.getElementById('close-modal')?.addEventListener('click', () => {
    closeModal();
  });

  // 모달 배경 클릭 시 닫기
  document.getElementById('access-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'access-detail-modal') {
      closeModal();
    }
  });
};

/**
 * 접속 로그 로드
 */
const loadAccessLogs = async () => {
  try {
    console.log('[웹사용기록] 접속 로그 조회 시작');

    const apiManager = ApiManager.getInstance();
    const params = {
      limit: 100,
      offset: 0
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiManager.get('/access-logs', params);

    console.log('[웹사용기록] API 응답:', response);

    if (response && response.success !== false) {
      const data = response.data || response;
      accessLogs = data.logs || [];
      const total = data.total || accessLogs.length;

      console.log(`[웹사용기록] ${accessLogs.length}건의 접속 기록 로드 완료 (전체: ${total}건)`);

      // 테이블 렌더링
      renderAccessTable();
    } else {
      throw new Error('접속 로그 조회 실패');
    }
  } catch (error) {
    console.error('[웹사용기록] 접속 로그 로드 실패:', error);
    showToast('접속 기록을 불러오는데 실패했습니다.', 'error');

    const tbody = document.getElementById('access-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="no-logs">접속 기록을 불러올 수 없습니다.</td>
        </tr>
      `;
    }

    throw error;
  }
};

/**
 * 접속 통계 로드
 */
const loadAccessStats = async () => {
  try {
    console.log('[웹사용기록] 접속 통계 조회 시작');

    const apiManager = ApiManager.getInstance();
    const params = {};

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await apiManager.get('/access-logs/stats', params);

    console.log('[웹사용기록] 통계 API 응답:', response);

    if (response && response.success !== false) {
      const data = response.data || response;
      accessStats = data.overall || {};

      console.log('[웹사용기록] 통계 로드 완료:', accessStats);

      // 통계 업데이트
      updateStats();
    } else {
      throw new Error('접속 통계 조회 실패');
    }
  } catch (error) {
    console.error('[웹사용기록] 통계 로드 실패:', error);
    // 통계 로드 실패는 에러 토스트 표시하지 않음 (선택적 기능)
  }
};

/**
 * 통계 업데이트
 */
const updateStats = () => {
  // 활성 세션 개수 (logoutTime이 null인 것)
  const activeSessionsCount = accessLogs.filter(log => !log.logoutTime).length;

  // 고유 사용자 수
  const uniqueUsersCount = new Set(accessLogs.map(log => log.userName)).size;

  // 평균 세션 시간 (분 단위)
  let avgSessionMinutes = 0;
  if (accessStats && accessStats.avgSessionDuration) {
    avgSessionMinutes = Math.round(accessStats.avgSessionDuration / 60);
  }

  // 통계 표시
  const totalElement = document.getElementById('total-accesses');
  const activeSessionsElement = document.getElementById('active-sessions');
  const uniqueUsersElement = document.getElementById('unique-users');
  const avgSessionElement = document.getElementById('avg-session');

  if (totalElement) {
    totalElement.textContent = (accessStats?.totalAccesses || accessLogs.length).toLocaleString();
  }

  if (activeSessionsElement) {
    activeSessionsElement.textContent = activeSessionsCount.toLocaleString();
  }

  if (uniqueUsersElement) {
    uniqueUsersElement.textContent = uniqueUsersCount.toLocaleString();
  }

  if (avgSessionElement) {
    avgSessionElement.textContent = `${avgSessionMinutes}분`;
  }
};

/**
 * 접속 로그 테이블 렌더링
 */
const renderAccessTable = () => {
  const tbody = document.getElementById('access-table-body');
  if (!tbody) return;

  tbody.style.transition = 'opacity 0.3s ease';
  tbody.style.opacity = '0.3';

  if (accessLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="no-logs">📭 선택한 기간에 접속 기록이 없습니다.</td>
      </tr>
    `;
  } else {
    tbody.innerHTML = accessLogs
      .map((log, index) => {
        const loginTime = formatTimestamp(log.loginTime);
        const logoutTime = log.logoutTime ? formatTimestamp(log.logoutTime) : '-';
        const sessionDuration = formatSessionDuration(log.sessionDuration);

        // 상태 배지
        const statusBadge = log.logoutTime
          ? '<span class="session-badge ended">종료</span>'
          : '<span class="session-badge active">활성</span>';

        // IP 주소 표시
        const ipAddress = log.ipAddress || '-';

        return `
          <tr>
            <td>${accessLogs.length - index}</td>
            <td>${statusBadge}</td>
            <td>${escapeHtml(log.userName)}</td>
            <td>${escapeHtml(log.userRole)}</td>
            <td class="access-timestamp">${loginTime}</td>
            <td class="access-timestamp">${logoutTime}</td>
            <td>${sessionDuration}</td>
            <td style="cursor: pointer;" onclick="showAccessDetail(${log.id})" title="클릭하여 상세정보 보기">${ipAddress}</td>
            <td>
              <button class="btn-delete" onclick="confirmDelete(${log.id})">삭제</button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  setTimeout(() => {
    tbody.style.opacity = '1';
  }, 100);

  console.log(`✅ [웹사용기록] 테이블 렌더링 완료 - ${accessLogs.length}건 표시`);
};

/**
 * 접속 상세 정보 표시
 */
window.showAccessDetail = (logId) => {
  const log = accessLogs.find((l) => l.id === logId);
  if (!log) return;

  const detailBody = document.getElementById('access-detail-body');
  if (!detailBody) return;

  const loginTime = formatTimestamp(log.loginTime);
  const logoutTime = log.logoutTime ? formatTimestamp(log.logoutTime) : '아직 로그아웃하지 않음 (활성 세션)';
  const sessionDuration = formatSessionDuration(log.sessionDuration);

  detailBody.innerHTML = `
    <div class="access-detail-section">
      <div class="access-detail-label">사용자 정보</div>
      <div class="access-detail-value">
        <strong>이름:</strong> ${escapeHtml(log.userName)}<br>
        <strong>역할:</strong> ${escapeHtml(log.userRole)}<br>
        <strong>사용자 ID:</strong> ${escapeHtml(log.userId)}
      </div>
    </div>
    <div class="access-detail-section">
      <div class="access-detail-label">로그인 시간</div>
      <div class="access-detail-value">${loginTime}</div>
    </div>
    <div class="access-detail-section">
      <div class="access-detail-label">로그아웃 시간</div>
      <div class="access-detail-value">${logoutTime}</div>
    </div>
    <div class="access-detail-section">
      <div class="access-detail-label">세션 시간</div>
      <div class="access-detail-value">${sessionDuration}</div>
    </div>
    <div class="access-detail-section">
      <div class="access-detail-label">IP 주소</div>
      <div class="access-detail-value">${log.ipAddress || '-'}</div>
    </div>
    <div class="access-detail-section">
      <div class="access-detail-label">브라우저 정보</div>
      <div class="access-detail-value">${escapeHtml(log.userAgent) || '-'}</div>
    </div>
  `;

  openModal();
};

/**
 * 삭제 확인 다이얼로그
 */
window.confirmDelete = async (logId) => {
  const log = accessLogs.find((l) => l.id === logId);
  if (!log) return;

  const confirmed = confirm(
    `정말로 이 접속 로그를 삭제하시겠습니까?\n\n` +
    `사용자: ${log.userName}\n` +
    `로그인 시간: ${formatTimestamp(log.loginTime)}\n\n` +
    `이 작업은 되돌릴 수 없습니다.`
  );

  if (confirmed) {
    await deleteAccessLog(logId);
  }
};

/**
 * 접속 로그 삭제 실행
 */
const deleteAccessLog = async (logId) => {
  try {
    const apiManager = ApiManager.getInstance();
    const response = await apiManager.request(`/access-logs/${logId}`, {
      method: 'DELETE'
    });

    console.log('[웹사용기록] 삭제 완료:', response);

    showToast('🗑️ 접속 로그가 삭제되었습니다.', 'success');

    // 목록 및 통계 새로고침
    await Promise.all([loadAccessLogs(), loadAccessStats()]);

  } catch (error) {
    console.error('[웹사용기록] 삭제 실패:', error);
    showToast('❌ 삭제 중 오류가 발생했습니다.', 'error');
  }
};

/**
 * 모달 열기
 */
const openModal = () => {
  const modal = document.getElementById('access-detail-modal');
  if (modal) {
    modal.classList.add('active');
  }
};

/**
 * 모달 닫기
 */
const closeModal = () => {
  const modal = document.getElementById('access-detail-modal');
  if (modal) {
    modal.classList.remove('active');
  }
};

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
 * 세션 시간 포맷팅
 */
const formatSessionDuration = (duration) => {
  if (!duration || duration === null) return '-';

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  } else {
    return `${seconds}초`;
  }
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

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// SPA 환경을 위한 pageLoaded 이벤트 리스닝
window.addEventListener('pageLoaded', (event) => {
  if (event.detail.page === 'access-logs') {
    console.log('🔄 [웹사용기록] pageLoaded 이벤트로 재초기화');
    init();
  }
});
