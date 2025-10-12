/**
 * ============================================
 * 오류사항 확인 페이지
 * ============================================
 */

import API from '../../01.common/01_api_config.js';
import { showToast } from '../../01.common/14_toast.js';

// 전역 변수
let errorLogs = [];

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
  document.getElementById('refresh-btn')?.addEventListener('click', async () => {
    await loadErrorLogs();
    showToast('오류 내역을 새로고침했습니다.', 'success');
  });

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

    const response = await API.get('/errors', {
      params: {
        limit: 100,
        offset: 0
      }
    });

    if (response.success && response.data) {
      errorLogs = response.data.errors || [];
      console.log(`[오류사항] ${errorLogs.length}건의 오류 내역 로드 완료`);

      // 통계 업데이트
      updateStats(response.data.total);

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
  }
};

/**
 * 통계 업데이트
 */
const updateStats = (total) => {
  const totalElement = document.getElementById('total-errors');
  if (totalElement) {
    totalElement.textContent = total.toLocaleString();
  }
};

/**
 * 에러 테이블 렌더링
 */
const renderErrorTable = () => {
  const tbody = document.getElementById('error-table-body');
  if (!tbody) return;

  if (errorLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="no-errors">✅ 오류 내역이 없습니다.</td>
      </tr>
    `;
    return;
  }

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
