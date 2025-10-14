/**
 * ============================================
 * 거래처 데이터관리 페이지
 * v1.0 - 데이터 완성도 조회 및 편집
 * ============================================
 */

import ApiManager from '../../01.common/13_api_manager.js';
import { showToast } from '../../01.common/14_toast.js';
import logger from '../../01.common/23_logger.js';

// 전역 변수
let completenessData = null;
let currentField = null;
let incompleteCompanies = [];
let regions = []; // 지역 목록

console.log('📝 [거래처 데이터관리] v1.0 로드됨');

/**
 * 필드 정의
 */
const FIELD_DEFINITIONS = [
  {
    key: '사업자등록번호',
    dbColumn: '사업자등록번호',
    icon: '🏢',
    name: '사업자등록번호',
    inputType: 'text',
    maxLength: 12
  },
  {
    key: '상세주소',
    dbColumn: '상세주소',
    icon: '📍',
    name: '상세주소',
    inputType: 'text',
    maxLength: 200
  },
  {
    key: '전화번호',
    dbColumn: '전화번호',
    icon: '📞',
    name: '전화번호',
    inputType: 'tel',
    maxLength: 20
  },
  {
    key: '소개경로',
    dbColumn: '소개경로',
    icon: '🔍',
    name: '소개경로',
    inputType: 'text',
    maxLength: 100
  },
  {
    key: '지역정보',
    dbColumn: 'region_id',
    icon: '🗺️',
    name: '지역정보',
    inputType: 'select',
    relatedColumn: 'region_district'
  },
  {
    key: '정철웅기여',
    dbColumn: 'jcwContribution',
    icon: '⭐',
    name: '정철웅기여',
    inputType: 'select',
    options: ['상', '중', '하']
  },
  {
    key: '회사기여',
    dbColumn: 'companyContribution',
    icon: '🏆',
    name: '회사기여',
    inputType: 'select',
    options: ['상', '중', '하']
  }
];

/**
 * 페이지 초기화
 */
const init = async () => {
  logger.info('[거래처 데이터관리] 페이지 초기화 시작');

  // 이벤트 리스너 등록
  setupEventListeners();

  // 지역 목록 로드
  await loadRegions();

  // 데이터 완성도 로드
  await loadCompletenessData();
};

/**
 * 이벤트 리스너 설정
 */
const setupEventListeners = () => {
  // 모달 닫기 버튼
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  // 모달 배경 클릭 시 닫기
  document.getElementById('edit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
      closeModal();
    }
  });

  // 저장 버튼
  document.getElementById('modal-save')?.addEventListener('click', handleSave);
};

/**
 * 지역 목록 로드
 */
const loadRegions = async () => {
  try {
    logger.info('[거래처 데이터관리] 지역 목록 조회 시작');
    const apiManager = ApiManager.getInstance();
    const response = await apiManager.get('/regions');

    if (response && response.success !== false) {
      regions = response.data || response || [];
      logger.info(`[거래처 데이터관리] ${regions.length}개 지역 로드 완료`);
    }
  } catch (error) {
    logger.error('[거래처 데이터관리] 지역 목록 로드 실패:', error);
    showToast('⚠️ 지역 정보를 불러오는데 실패했습니다.', 'warning');
  }
};

/**
 * 데이터 완성도 로드
 */
const loadCompletenessData = async () => {
  try {
    logger.info('[거래처 데이터관리] 데이터 완성도 조회 시작');

    const apiManager = ApiManager.getInstance();
    const response = await apiManager.get('/companies/data-completeness');

    logger.info('[거래처 데이터관리] API 응답:', response);

    if (response && response.success !== false) {
      completenessData = response.data || response;
      logger.info('[거래처 데이터관리] 데이터 완성도 로드 완료');

      // 카드 렌더링
      renderCompletenessCards();
    } else {
      throw new Error('데이터 완성도 조회 실패');
    }
  } catch (error) {
    logger.error('[거래처 데이터관리] 데이터 완성도 로드 실패:', error);
    showToast('❌ 데이터 완성도를 불러오는데 실패했습니다.', 'error');

    const grid = document.getElementById('completeness-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="empty-message">
          📭 데이터 완성도를 불러올 수 없습니다.<br>
          새로고침 후 다시 시도해주세요.
        </div>
      `;
    }
  }
};

/**
 * 데이터 완성도 카드 렌더링
 */
const renderCompletenessCards = () => {
  const grid = document.getElementById('completeness-grid');
  if (!grid || !completenessData) return;

  grid.style.transition = 'opacity 0.3s ease';
  grid.style.opacity = '0';

  if (!completenessData || Object.keys(completenessData).length === 0) {
    grid.innerHTML = `
      <div class="empty-message">
        📭 데이터가 없습니다.
      </div>
    `;
    setTimeout(() => {
      grid.style.opacity = '1';
    }, 100);
    return;
  }

  // 카드 생성
  const cards = FIELD_DEFINITIONS.map((field) => {
    const stats = completenessData[field.key] || {
      incomplete: 0,
      total: 0,
      percentage: 0
    };

    const percentage = stats.percentage || 0;
    let percentageClass = 'low';
    if (percentage > 50) percentageClass = 'high';
    else if (percentage > 20) percentageClass = 'medium';

    return `
      <div class="completeness-card" onclick="openEditModal('${field.key}')">
        <div class="card-field-name">
          <span class="card-field-icon">${field.icon}</span>
          <span>${field.name}</span>
        </div>
        <div class="card-stats-row">
          <div class="card-count">
            <span class="incomplete">${stats.incomplete}</span>
            <span> / </span>
            <span class="total">${stats.total}</span>
          </div>
          <div class="card-percentage ${percentageClass}">
            ${percentage.toFixed(2)}%
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = cards;

  setTimeout(() => {
    grid.style.opacity = '1';
  }, 100);

  logger.info('✅ [거래처 데이터관리] 카드 렌더링 완료');
};

/**
 * 편집 모달 열기
 */
window.openEditModal = async (fieldKey) => {
  logger.info(`[거래처 데이터관리] 모달 열기: ${fieldKey}`);

  currentField = FIELD_DEFINITIONS.find((f) => f.key === fieldKey);
  if (!currentField) {
    logger.error('[거래처 데이터관리] 필드를 찾을 수 없음:', fieldKey);
    return;
  }

  try {
    // 미완성 데이터 조회
    const apiManager = ApiManager.getInstance();
    const response = await apiManager.get('/companies/incomplete', {
      field: currentField.dbColumn
    });

    if (response && response.success !== false) {
      incompleteCompanies = response.data || response || [];
      logger.info(`[거래처 데이터관리] ${incompleteCompanies.length}개 미완성 데이터 로드`);

      if (incompleteCompanies.length === 0) {
        showToast('✅ 모든 데이터가 완성되었습니다!', 'success');
        return;
      }

      // 모달 제목 설정
      document.getElementById('modal-title').textContent = `${currentField.name} 데이터 입력`;

      // 테이블 렌더링
      renderModalTable();

      // 모달 열기
      document.getElementById('edit-modal').classList.add('active');
    } else {
      throw new Error('미완성 데이터 조회 실패');
    }
  } catch (error) {
    logger.error('[거래처 데이터관리] 미완성 데이터 로드 실패:', error);
    showToast('❌ 데이터를 불러오는데 실패했습니다.', 'error');
  }
};

/**
 * 모달 테이블 렌더링
 */
const renderModalTable = () => {
  const tbody = document.getElementById('modal-table-body');
  if (!tbody || !currentField) return;

  tbody.innerHTML = incompleteCompanies
    .map((company, index) => {
      const currentValue = company[currentField.dbColumn] || '-';
      const inputId = `input-${index}`;

      let inputHtml = '';

      if (currentField.inputType === 'select') {
        if (currentField.key === '지역정보') {
          // 지역 선택 - 구 선택 드롭다운
          const regionOptions = regions
            .map((r) => `<option value="${r.id}">${r.district}</option>`)
            .join('');
          inputHtml = `
            <select id="${inputId}" data-company-id="${company.keyValue}">
              <option value="">선택하세요</option>
              ${regionOptions}
            </select>
          `;
        } else {
          // 기여도 선택
          const options = currentField.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join('');
          inputHtml = `
            <select id="${inputId}" data-company-id="${company.keyValue}">
              <option value="">선택하세요</option>
              ${options}
            </select>
          `;
        }
      } else {
        // 텍스트 입력
        inputHtml = `
          <input
            type="${currentField.inputType}"
            id="${inputId}"
            data-company-id="${company.keyValue}"
            maxlength="${currentField.maxLength || 200}"
            placeholder="${currentField.name} 입력"
          />
        `;
      }

      return `
        <tr>
          <td>${escapeHtml(company.finalCompanyName || company.erpCompanyName)}</td>
          <td>${escapeHtml(currentValue)}</td>
          <td>${inputHtml}</td>
        </tr>
      `;
    })
    .join('');

  // 주소 입력 시 자동 지역 설정 이벤트 추가
  if (currentField.key === '상세주소') {
    incompleteCompanies.forEach((company, index) => {
      const input = document.getElementById(`input-${index}`);
      if (input) {
        input.addEventListener('blur', async () => {
          const address = input.value.trim();
          if (address) {
            await autoSetRegion(company.keyValue, address);
          }
        });
      }
    });
  }
};

/**
 * 주소 기반 자동 지역 설정
 */
const autoSetRegion = async (companyId, address) => {
  try {
    logger.info(`[거래처 데이터관리] 자동 지역 설정 시작: ${address}`);

    // 주소에서 시/구 추출 (간단한 로직)
    const match = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주).*?(시|군|구)/);

    if (!match) {
      logger.warn('[거래처 데이터관리] 주소에서 지역을 추출할 수 없음');
      return;
    }

    const province = match[1];
    const districtPart = match[2];

    // 지역 목록에서 매칭되는 지역 찾기
    const matchedRegion = regions.find((r) =>
      r.province.includes(province) || r.district.includes(districtPart)
    );

    if (matchedRegion) {
      logger.info(`[거래처 데이터관리] 지역 매칭 성공: ${matchedRegion.district}`);
      showToast(`✅ ${matchedRegion.district} 지역이 자동으로 설정되었습니다.`, 'info');

      // 백엔드에 지역 정보 업데이트
      const apiManager = ApiManager.getInstance();
      await apiManager.request(`/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          region_id: matchedRegion.id,
          region_district: matchedRegion.district
        })
      });
    } else {
      logger.warn('[거래처 데이터관리] 매칭되는 지역을 찾을 수 없음');
    }
  } catch (error) {
    logger.error('[거래처 데이터관리] 자동 지역 설정 실패:', error);
  }
};

/**
 * 저장 처리
 */
const handleSave = async () => {
  try {
    logger.info('[거래처 데이터관리] 저장 시작');

    const updates = [];

    // 모든 입력 필드에서 변경된 값 수집
    incompleteCompanies.forEach((company, index) => {
      const input = document.getElementById(`input-${index}`);
      if (!input) return;

      const value = input.value.trim();
      if (!value) return;

      updates.push({
        companyId: company.keyValue,
        field: currentField.dbColumn,
        value: value,
        relatedField: currentField.relatedColumn // region_district 등
      });
    });

    if (updates.length === 0) {
      showToast('⚠️ 입력된 값이 없습니다.', 'warning');
      return;
    }

    logger.info(`[거래처 데이터관리] ${updates.length}개 업데이트 요청`);

    // 백엔드에 업데이트 요청
    const apiManager = ApiManager.getInstance();
    const response = await apiManager.request('/companies/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });

    if (response && response.success !== false) {
      logger.info('[거래처 데이터관리] 업데이트 성공');
      showToast('✅ 데이터가 성공적으로 저장되었습니다!', 'success');

      // 모달 닫기
      closeModal();

      // 데이터 완성도 새로고침
      await loadCompletenessData();
    } else {
      throw new Error('데이터 업데이트 실패');
    }
  } catch (error) {
    logger.error('[거래처 데이터관리] 저장 실패:', error);
    showToast('❌ 저장 중 오류가 발생했습니다.', 'error');
  }
};

/**
 * 모달 닫기
 */
const closeModal = () => {
  document.getElementById('edit-modal').classList.remove('active');
  currentField = null;
  incompleteCompanies = [];
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
  if (event.detail.page === 'company-data-management') {
    logger.info('🔄 [거래처 데이터관리] pageLoaded 이벤트로 재초기화');
    init();
  }
});
