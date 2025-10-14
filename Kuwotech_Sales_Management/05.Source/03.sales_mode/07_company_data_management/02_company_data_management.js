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
const user = JSON.parse(sessionStorage.getItem('user') || '{}');
let completenessData = null;
let currentField = null;
let incompleteCompanies = [];
let regions = []; // 지역 목록

console.log('📝 [거래처 데이터관리] v1.0 로드됨');
console.log('[거래처 데이터관리] 로그인 사용자:', user.name || '미확인');

/**
 * 필드 정의
 */
const FIELD_DEFINITIONS = [
  {
    key: 'finalCompanyName',
    dbColumn: 'finalCompanyName',
    icon: '🏢',
    name: '최종거래처명',
    inputType: 'text',
    maxLength: 200
  },
  {
    key: 'isClosed',
    dbColumn: 'isClosed',
    icon: '🚫',
    name: '폐업여부',
    inputType: 'select',
    options: ['Y', 'N']
  },
  {
    key: 'ceoOrDentist',
    dbColumn: 'ceoOrDentist',
    icon: '👤',
    name: '대표이사/치과의사',
    inputType: 'text',
    maxLength: 100
  },
  {
    key: 'businessRegistrationNumber',
    dbColumn: 'businessRegistrationNumber',
    icon: '📋',
    name: '사업자등록번호',
    inputType: 'text',
    maxLength: 12
  },
  {
    key: 'phoneNumber',
    dbColumn: 'phoneNumber',
    icon: '📞',
    name: '전화번호',
    inputType: 'tel',
    maxLength: 20
  },
  {
    key: 'detailedAddress',
    dbColumn: 'detailedAddress',
    icon: '📍',
    name: '상세주소',
    inputType: 'text',
    maxLength: 200
  },
  {
    key: 'customerRegion',
    dbColumn: 'customerRegion',
    icon: '🌏',
    name: '고객사지역',
    inputType: 'text',
    maxLength: 100
  },
  {
    key: 'region_id',
    dbColumn: 'region_id',
    icon: '🗺️',
    name: '시/도 지역',
    inputType: 'select',
    relatedColumn: 'region_district'
  },
  {
    key: 'region_district',
    dbColumn: 'region_district',
    icon: '📌',
    name: '구/군 정보',
    inputType: 'text',
    maxLength: 50
  },
  {
    key: 'businessStatus',
    dbColumn: 'businessStatus',
    icon: '📊',
    name: '거래상태',
    inputType: 'text',
    maxLength: 50
  },
  {
    key: 'department',
    dbColumn: 'department',
    icon: '🏬',
    name: '담당부서',
    inputType: 'text',
    maxLength: 100
  },
  {
    key: 'internalManager',
    dbColumn: 'internalManager',
    icon: '👔',
    name: '내부담당자',
    inputType: 'text',
    maxLength: 100
  },
  {
    key: 'jcwContribution',
    dbColumn: 'jcwContribution',
    icon: '⭐',
    name: '정철웅기여',
    inputType: 'select',
    options: ['상', '중', '하']
  },
  {
    key: 'companyContribution',
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

    // 영업담당 모드: 로그인한 사용자의 이름을 manager 파라미터로 전달
    const params = {};

    if (user && user.name) {
      params.manager = user.name;
      logger.info(`[거래처 데이터관리] ✅ 담당자 필터링 적용: ${user.name}`);
    } else {
      logger.warn('[거래처 데이터관리] ⚠️ 담당자 필터링 없음 - user 객체 또는 user.name이 없습니다');
    }

    const response = await apiManager.get('/companies/data-completeness', params);

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
 * 데이터 완성도 카드 렌더링 - 3열 구조
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

  // 카드 생성 - 세로 배치 구조 (1열 4개)
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
        <!-- 아이콘 -->
        <span class="card-field-icon">${field.icon}</span>

        <!-- 필드명 -->
        <div class="card-field-name">
          <span>${field.name}</span>
        </div>

        <!-- 미작성/전체 -->
        <div class="card-count-section">
          <div class="card-count-label">미작성 / 전체</div>
          <div class="card-count">
            <span class="incomplete">${stats.incomplete}</span>
            <span class="separator">/</span>
            <span class="total">${stats.total}</span>
          </div>
        </div>

        <!-- 미완성율 -->
        <div class="card-percentage-section">
          <div class="card-percentage-label">미완성율</div>
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
    // 영업담당 모드: 로그인한 사용자의 담당 거래처만
    const params = {
      field: currentField.dbColumn
    };

    if (user && user.name) {
      params.manager = user.name;
      logger.info(`[거래처 데이터관리] 담당자 필터링: ${user.name}`);
    }

    // 미완성 데이터 조회
    const apiManager = ApiManager.getInstance();
    const response = await apiManager.get('/companies/incomplete', params);

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
 * 상세주소 → customerRegion → region_id, region_district
 */
const autoSetRegion = async (companyId, address) => {
  try {
    logger.info(`[거래처 데이터관리] 자동 지역 설정 시작: ${address}`);

    // 주소에서 시/도, 구/군 추출
    const regionPattern = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[특별시|광역시|특별자치시|도]*\s*([가-힣]+[시군구])/;
    const match = address.match(regionPattern);

    if (!match) {
      logger.warn('[거래처 데이터관리] 주소에서 지역을 추출할 수 없음');
      return;
    }

    const province = match[1];
    const district = match[2];

    // customerRegion 생성 (예: "서울 강남구", "경기 수원시")
    const customerRegion = `${province} ${district}`;

    logger.info(`[거래처 데이터관리] 추출된 지역 정보: ${customerRegion}`);

    // 지역 목록에서 매칭되는 지역 찾기
    const matchedRegion = regions.find((r) => {
      // district 필드로 매칭 (예: "강남구", "수원시")
      const rDistrict = r.district || '';
      return rDistrict.includes(district) || district.includes(rDistrict);
    });

    if (matchedRegion) {
      logger.info(`[거래처 데이터관리] 지역 매칭 성공: ID ${matchedRegion.id}, ${matchedRegion.district}`);
      showToast(`✅ ${customerRegion} 지역이 자동으로 설정되었습니다.`, 'info');

      // 백엔드에 지역 정보 업데이트 (customerRegion, region_id, region_district)
      const apiManager = ApiManager.getInstance();
      await apiManager.request(`/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          customerRegion: customerRegion,
          region_id: matchedRegion.id,
          region_district: matchedRegion.district
        })
      });

      logger.info(`[거래처 데이터관리] 지역 정보 업데이트 완료: ${companyId}`);
    } else {
      logger.warn(`[거래처 데이터관리] 매칭되는 지역을 찾을 수 없음: ${customerRegion}`);

      // 매칭 실패해도 customerRegion은 저장
      const apiManager = ApiManager.getInstance();
      await apiManager.request(`/companies/${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          customerRegion: customerRegion
        })
      });
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
