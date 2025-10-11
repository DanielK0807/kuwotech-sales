/* ============================================
   테마 초기화 모듈
   파일: 01.common/17_theme_init.js
   작성일: 2025-09-27
   설명: 페이지 로드 시 역할별 테마 자동 적용
============================================ */

import { themeManager } from './11_theme_manager.js';

/**
 * 역할별 테마 초기화
 */
export function initializeTheme() {
    // 사용자 정보 가져오기
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userRole = sessionStorage.getItem('userRole');
    
    // 로그인 상태 확인
    if (isLoggedIn === 'true' && userRole) {
        // 역할에 따른 테마 설정
        themeManager.setThemeByRole(userRole);
    } else {
        // 로그인 페이지 테마
        themeManager.applyTheme('login');
    }
    
    // 테마 변경 리스너 등록
    themeManager.addListener((themeName, themeInfo) => {
        
        // 테마 변경 시 추가 처리
        updateUIComponents(themeName);
    });
}

/**
 * UI 컴포넌트 업데이트
 * @param {string} themeName - 테마 이름
 */
function updateUIComponents(themeName) {
    // 로고 업데이트
    const logos = document.querySelectorAll('.logo-img');
    logos.forEach(logo => {
        if (themeName === 'admin') {
            logo.style.filter = 'hue-rotate(180deg)'; // 관리자 모드 색상 조정
        } else if (themeName === 'sales') {
            logo.style.filter = 'hue-rotate(90deg)'; // 영업 모드 색상 조정
        } else {
            logo.style.filter = 'none'; // 로그인 모드 원본
        }
    });
    
    // 아이콘 색상 업데이트
    const icons = document.querySelectorAll('.icon');
    icons.forEach(icon => {
        icon.style.color = 'var(--primary-color)';
    });
    
    // 버튼 스타일 업데이트
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        if (btn.classList.contains('btn-primary')) {
            btn.style.background = 'var(--gradient-primary)';
            btn.style.color = 'var(--text-on-primary)';
        } else if (btn.classList.contains('btn-accent')) {
            btn.style.background = 'var(--gradient-accent)';
            btn.style.color = themeName === 'admin' ? 'var(--text-primary)' : 'var(--text-on-primary)';
        }
    });
    
    // 글래스 효과 재적용
    applyGlassEffects();
}

/**
 * 글래스모피즘 효과 적용
 */
function applyGlassEffects() {
    // 카드에 글래스 효과
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (!card.classList.contains('glass-card')) {
            card.classList.add('glass-card');
        }
    });
    
    // 모달에 글래스 효과
    const modals = document.querySelectorAll('.modal-content');
    modals.forEach(modal => {
        if (!modal.classList.contains('glass-modal')) {
            modal.classList.add('glass-modal');
        }
    });
    
    // 네비게이션에 글래스 효과
    const navs = document.querySelectorAll('.nav, .sidebar');
    navs.forEach(nav => {
        if (!nav.classList.contains('glass-nav')) {
            nav.classList.add('glass-nav');
        }
    });
    
    // 테이블에 글래스 효과
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        if (!table.classList.contains('glass-table')) {
            table.classList.add('glass-table');
        }
    });
}

/**
 * 테마 전환 버튼 생성
 */
export function createThemeToggle() {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle glass-button';
    toggleBtn.innerHTML = `
        <span class="theme-toggle-icon">🎨</span>
        <span class="theme-toggle-text">테마</span>
    `;
    toggleBtn.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 9999;
        padding: 12px 20px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    
    // 클릭 이벤트
    toggleBtn.addEventListener('click', () => {
        const themes = themeManager.getThemeList();
        const current = themeManager.getCurrentTheme();
        const currentIndex = themes.indexOf(current);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        // 테마 변경
        themeManager.applyTheme(nextTheme);
        
        // 토스트 메시지
        if (window.toastManager) {
            const themeNames = {
                login: '로그인',
                sales: '영업담당',
                admin: '관리자'
            };
            window.toastManager.info(`테마 변경: ${themeNames[nextTheme]}`);
        }
    });
    
    // 호버 효과
    toggleBtn.addEventListener('mouseenter', () => {
        toggleBtn.style.transform = 'translateY(-2px)';
        toggleBtn.style.boxShadow = 'var(--shadow-hover)';
    });
    
    toggleBtn.addEventListener('mouseleave', () => {
        toggleBtn.style.transform = 'translateY(0)';
        toggleBtn.style.boxShadow = 'var(--shadow-primary)';
    });
    
    document.body.appendChild(toggleBtn);
    return toggleBtn;
}

/**
 * 테마 기반 환영 메시지
 */
export function showThemeWelcome() {
    const themeName = themeManager.getCurrentTheme();
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName') || '사용자';
    
    let message = '';
    let icon = '';
    
    switch (themeName) {
        case 'login':
            message = 'KUWOTECH 영업관리 시스템에 오신 것을 환영합니다';
            icon = '🔐';
            break;
        case 'sales':
            message = `${userName}님, 영업 활동 화이팅!`;
            icon = '💼';
            break;
        case 'admin':
            message = `${userName} 관리자님, 오늘도 좋은 하루 되세요`;
            icon = '👔';
            break;
        default:
            message = '환영합니다';
            icon = '👋';
    }
    
    // 환영 메시지 표시
    if (window.toastManager) {
        setTimeout(() => {
            window.toastManager.success(`${icon} ${message}`);
        }, 500);
    }
}

/**
 * 테마 관련 이벤트 리스너 등록
 */
export function registerThemeEvents() {
    // 키보드 단축키 (Alt + T)
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 't') {
            themeManager.cycleTheme();
        }
    });
    
    // 시스템 색상 스키마 변경 감지
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addListener((e) => {
            
            // 필요시 테마 조정
            if (e.matches) {
                // 다크모드 대응
                themeManager.setGlassIntensity('heavy');
            } else {
                // 라이트모드 대응
                themeManager.setGlassIntensity('normal');
            }
        });
    }
}

/**
 * 자동 테마 설정 (세션 기반)
 */
export function autoSetTheme() {
    const userRole = sessionStorage.getItem('userRole');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (isLoggedIn === 'true' && userRole) {
        return themeManager.setThemeByRole(userRole);
    } else {
        return themeManager.applyTheme('login');
    }
}

/**
 * 테마 프리셋 적용
 * @param {string} preset - 프리셋 이름
 */
export function applyThemePreset(preset) {
    const presets = {
        high_contrast: {
            '--text-primary': '#000000',
            '--text-secondary': '#333333',
            '--bg-color': '#FFFFFF',
            '--glass-blur': 'blur(4px)'
        },
        low_vision: {
            '--base-font-size': '18px',
            '--glass-blur': 'none',
            '--glass-bg': 'rgba(255, 255, 255, 0.95)'
        },
        reduced_motion: {
            '--transition-fast': '0s',
            '--transition-normal': '0s',
            '--transition-slow': '0s'
        }
    };
    
    if (presets[preset]) {
        themeManager.overrideColors(presets[preset]);
    }
}

// 모듈 내보내기
export {
    updateUIComponents,
    applyGlassEffects,
    themeManager
};

// 기본 내보내기
export default {
    initializeTheme,
    createThemeToggle,
    showThemeWelcome,
    registerThemeEvents,
    autoSetTheme,
    applyThemePreset,
    updateUIComponents,
    applyGlassEffects,
    themeManager
};