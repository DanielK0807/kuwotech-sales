/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 공통 레이아웃 함수
 * 파일: 18_layout_common.js
 * Created by: Daniel.K
 * Date: 2025-10-09
 * 설명: sales_layout.js와 admin_layout.js의 중복 코드 추출
 * ============================================
 */

import logger from './23_logger.js';

// ============================================
// [SECTION: 글래스모핀 모달 생성]
// ============================================

/**
 * 글래스모핀 스타일 모달 생성 (로그아웃 등에 사용)
 * @param {string} title - 모달 제목
 * @param {string} message - 모달 메시지
 * @param {Function} onConfirm - 확인 버튼 콜백
 * @param {Function} onCancel - 취소 버튼 콜백
 * @returns {HTMLElement} - 모달 오버레이 요소
 */
export function createGlassModal(title, message, onConfirm, onCancel) {
    // 모달 오버레이 (CSS 클래스로 스타일 적용)
    const overlay = document.createElement('div');
    overlay.className = 'logout-modal-overlay';

    // 모달 컨테이너 (CSS 클래스로 스타일 적용)
    const modal = document.createElement('div');
    modal.className = 'logout-modal glass-card';

    // 아이콘 (CSS 클래스로 스타일 적용)
    const icon = document.createElement('div');
    icon.className = 'modal-icon';
    icon.textContent = '🚪';

    // 제목 (CSS 클래스로 스타일 적용)
    const titleEl = document.createElement('h2');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;

    // 메시지 (CSS 클래스로 스타일 적용)
    const messageEl = document.createElement('p');
    messageEl.className = 'modal-message';
    messageEl.textContent = message;

    // 버튼 컨테이너 (CSS 클래스로 스타일 적용)
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'modal-button-container';

    // 취소 버튼 (CSS 클래스로 스타일 적용, hover는 CSS에서 처리)
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-glass';
    cancelBtn.textContent = '취소';
    cancelBtn.onclick = () => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            overlay.remove();
            if (onCancel) onCancel();
        }, 300);
    };

    // 확인 버튼 (CSS 클래스로 스타일 적용, hover는 CSS에서 처리)
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = '로그아웃';
    confirmBtn.onclick = () => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            overlay.remove();
            if (onConfirm) onConfirm();
        }, 300);
    };

    // 요소 조립
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);

    modal.appendChild(icon);
    modal.appendChild(titleEl);
    modal.appendChild(messageEl);
    modal.appendChild(buttonContainer);

    overlay.appendChild(modal);

    // ESC 키로 닫기
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            cancelBtn.click();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);

    // 오버레이 클릭으로 닫기
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            cancelBtn.click();
        }
    };

    return overlay;
}

// ============================================
// [SECTION: 공통 유틸리티 함수]
// ============================================

/**
 * 메뉴 활성화
 * @param {string} page - 페이지 이름
 */
export function activateMenu(page) {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * 저장되지 않은 작업 확인
 * @returns {boolean} - 저장되지 않은 작업이 있으면 true
 */
export function checkUnsavedWork() {
    const unsavedIndicators = [
        document.querySelector('form[data-unsaved="true"]'),
        document.querySelector('input[data-changed="true"]'),
        document.querySelector('textarea[data-changed="true"]')
    ];

    return unsavedIndicators.some(el => el !== null);
}

/**
 * 에러 페이지 표시 (CSS 클래스 사용)
 * @param {string} message - 에러 메시지
 */
export function showErrorPage(message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-container glass-card">
                <h2>
                    ⚠️ 페이지 로드 오류
                </h2>
                <p>
                    ${message}
                </p>
                <div class="button-group">
                    <button class="btn btn-glass" onclick="location.reload()">
                        새로고침
                    </button>
                    <button class="btn btn-glass" onclick="history.back()">
                        이전 페이지
                    </button>
                </div>
            </div>
        `;
    }
}

// ============================================
// [SECTION: 글로벌 이벤트 설정]
// ============================================

/**
 * 글로벌 이벤트 설정
 * @param {Function} loadPageFn - 페이지 로드 함수
 * @param {Object} isInitializedRef - 초기화 상태 참조 객체 { value: boolean }
 * @param {Object} options - 추가 옵션 { isAdmin: boolean, user: Object }
 */
export function setupGlobalEvents(loadPageFn, isInitializedRef, options = {}) {
    const { isAdmin = false, user = null } = options;

    // 브라우저 뒤로가기 처리
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page) {
            // 메뉴 활성화 상태 업데이트
            activateMenu(e.state.page);

            // 페이지 로드
            loadPageFn(e.state.page);
        }
    });

    // 새로고침 시 확인
    window.addEventListener('beforeunload', (e) => {
        if (isInitializedRef.value) {
            // 작업 중인 내용 확인
            const hasUnsavedWork = checkUnsavedWork();
            if (hasUnsavedWork) {
                e.preventDefault();
                e.returnValue = '작업 중인 내용이 저장되지 않을 수 있습니다.';
            }
        }
    });

    // 네트워크 상태 감지
    window.addEventListener('online', () => {
        if (typeof showToast === 'function') {
            showToast('네트워크가 연결되었습니다.', 'success');
        }
    });

    window.addEventListener('offline', () => {
        if (typeof showToast === 'function') {
            showToast('네트워크 연결이 끊어졌습니다.', 'warning');
        }
    });

    // 에러 처리
    window.addEventListener('error', (e) => {
        logger.error('[전역 에러]:', e.error);

        // 관리자에게 상세 에러 표시
        if (isAdmin && user && user.role === '관리자') {
            logger.error('[에러 상세]', {
                message: e.error?.message,
                stack: e.error?.stack,
                file: e.filename,
                line: e.lineno,
                column: e.colno
            });
        }

        if (!e.error?.message?.includes('Failed to fetch')) {
            if (typeof showToast === 'function') {
                showToast('예기치 않은 오류가 발생했습니다.', 'error');
            }
        }
    });

    window.addEventListener('unhandledrejection', (e) => {
        logger.error('[Promise 거부]:', e.reason);
        if (!e.reason?.message?.includes('Failed to fetch')) {
            if (typeof showToast === 'function') {
                showToast('비동기 처리 중 오류가 발생했습니다.', 'error');
            }
        }
    });
}

// ============================================
// [SECTION: 로그아웃 버튼 설정]
// ============================================

/**
 * 로그아웃 버튼 이벤트 설정
 * @param {Function} handleLogoutFn - 로그아웃 처리 함수
 * @param {Function} showToastFn - 토스트 표시 함수
 * @param {Object} user - 사용자 정보
 */
export function setupLogoutButton(handleLogoutFn, showToastFn, user) {
    const logoutBtn = document.getElementById('logout-btn');


    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {

            // 로그 기록
            if (user) {
            }

            // 간단한 confirm 사용
            const confirmed = confirm('정말 로그아웃 하시겠습니까?');


            if (confirmed) {
                showToastFn('로그아웃 중...', 'info');

                setTimeout(async () => {
                    await handleLogoutFn(); // 세션 매니저의 로그아웃 처리 (비동기)
                }, 500);
            }
        });

    } else {
        logger.error('[로그아웃 버튼] 버튼 요소를 찾을 수 없습니다!');
    }
}

// ============================================
// [SECTION: 메뉴 이벤트 설정]
// ============================================

/**
 * 메뉴 클릭 이벤트 설정
 * @param {Function} loadPageFn - 페이지 로드 함수
 * @param {Object} currentPageRef - 현재 페이지 참조 객체 { value: string }
 */
export function setupMenuEvents(loadPageFn, currentPageRef) {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();

            const page = item.dataset.page;

            // 이미 활성화된 메뉴면 무시
            if (item.classList.contains('active') && currentPageRef.value === page) {
                return;
            }

            // 활성 메뉴 변경
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            // 페이지 로드
            await loadPageFn(page);
        });

        // 키보드 접근성
        item.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
}
