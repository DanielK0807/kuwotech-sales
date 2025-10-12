/**
 * ============================================
 * 오류사항 확인 페이지
 * v1.1 - 새로고침 시각적 피드백 강화
 * ============================================
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { showToast } from '../../01.common/14_toast.js';

// 전역 변수
let errorLogs = [];
let lastRefreshTime = null;

console.log('🔍 [오류사항 페이지] v1.1 로드됨 - 새로고침 기능 강화');

/**
 * 페이지 초기화
 */
const init = async () => {
  console.log('[오류사항] 페이지 초기화 시작');

  // 이벤트 리스너 등록
  setupEventListeners();

  // 에러 로그 로드
  await loadErrorLogs();
};

/**
 * 이벤트 리스너 설정
 */
const setupEventListeners = () => {
  // 새로고침 버튼
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      console.log('🔄 [오류사항] ===== 새로고침 버튼 클릭됨 =====');

      // 버튼 비활성화 및 로딩 효과
      refreshBtn.disabled = true;
      refreshBtn.classList.add('loading');
      const originalText = refreshBtn.textContent;
      refreshBtn.textContent = '새로고침 중...';

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
        refreshBtn.textContent = originalText;
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
    console.log('[오류사항] 에러 로그 조회 시작');

    const apiManager = ApiManager.getInstance();
    const response = await apiManager.get('/errors', {
      limit: 100,
      offset: 0
    });

    console.log('[오류사항] API 응답:', response);

    // API 응답 형식 확인 (success 필드가 있는 경우와 없는 경우 모두 처리)
    if (response && (response.success !== false)) {
      // response.data가 있으면 사용, 없으면 response 자체를 사용
      const data = response.data || response;
      errorLogs = data.errors || [];
      const total = data.total || errorLogs.length;

      console.log(`[오류사항] ${errorLogs.length}건의 오류 내역 로드 완료 (전체: ${total}건)`);

      // 통계 업데이트
      updateStats(total);

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
          <td colspan="6" class="no-errors">오류 내역을 불러올 수 없습니다.</td>
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
const updateStats = (total) => {
  const totalElement = document.getElementById('total-errors');
  if (totalElement) {
    totalElement.textContent = total.toLocaleString();

    // 카운트가 변경되면 깜빡이는 효과 추가
    totalElement.style.transition = 'all 0.3s ease';
    totalElement.style.transform = 'scale(1.2)';
    totalElement.style.color = '#4CAF50';

    setTimeout(() => {
      totalElement.style.transform = 'scale(1)';
      totalElement.style.color = '';
    }, 300);
  }

  // 마지막 새로고침 시간 업데이트
  lastRefreshTime = new Date();
  updateLastRefreshTime();
};

/**
 * 마지막 새로고침 시간 표시
 */
const updateLastRefreshTime = () => {
  let refreshTimeElement = document.getElementById('last-refresh-time');

  if (!refreshTimeElement) {
    // 요소가 없으면 생성
    const statsDiv = document.querySelector('.error-stats');
    if (statsDiv) {
      const timeCard = document.createElement('div');
      timeCard.className = 'stat-card';
      timeCard.innerHTML = `
        <div class="stat-label">마지막 새로고침</div>
        <div class="stat-value" id="last-refresh-time" style="font-size: 16px;">-</div>
      `;
      statsDiv.appendChild(timeCard);
      refreshTimeElement = document.getElementById('last-refresh-time');
    }
  }

  if (refreshTimeElement && lastRefreshTime) {
    const timeStr = formatTimestamp(lastRefreshTime);
    refreshTimeElement.textContent = timeStr;

    // 시간 표시를 깜빡이게
    refreshTimeElement.style.transition = 'all 0.3s ease';
    refreshTimeElement.style.color = '#2196F3';

    setTimeout(() => {
      refreshTimeElement.style.color = '';
    }, 1000);
  }
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
        <td colspan="6" class="no-errors">✅ 오류 내역이 없습니다.</td>
      </tr>
    `;
  } else {
    tbody.innerHTML = errorLogs
      .map((error, index) => {
        const timestamp = formatTimestamp(error.timestamp);
        const pageUrl = error.pageUrl ? new URL(error.pageUrl).pathname : '-';

        return `
          <tr>
            <td>${errorLogs.length - index}</td>
            <td class="error-timestamp">${timestamp}</td>
            <td>${error.userName || '-'}</td>
            <td>${error.userRole || '-'}</td>
            <td>
              <div class="error-message" onclick="showErrorDetail(${error.id})">
                ${escapeHtml(error.errorMessage)}
              </div>
            </td>
            <td>${pageUrl}</td>
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
  `;

  // 모달 열기
  openModal();
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

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
