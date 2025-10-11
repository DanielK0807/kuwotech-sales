/**
 * 테마 매니저 - KUWOTECH 영업관리 시스템
 * 로그인, 영업담당, 관리자 테마 색상 관리
 */

import logger from './23_logger.js';

class ThemeManager {
    constructor() {
        this.themes = {
            // 🔐 로그인 테마
            login: {
                name: '로그인',
                icon: '🔐',
                colors: {
                    '--primary-color': '#1A237E',      // 짙은 네이비
                    '--primary-text': '#FFFFFF',       // 밝은 흰색
                    '--secondary-color': '#B0BEC5',    // 소프트 그레이
                    '--secondary-text': '#212121',     // 진한 차콜
                    '--bg-color': '#F5F5F5',           // 오프 화이트
                    '--bg-text': '#212121',            // 진한 차콜
                    '--accent-color': '#FFC107',       // 머스타드 옐로우
                    '--accent-text': '#212121',        // 진한 차콜
                    
                    // 그라데이션
                    '--gradient-primary': 'linear-gradient(135deg, #1A237E 0%, #283593 100%)',
                    '--gradient-accent': 'linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)',
                    
                    // 글래스모피즘
                    '--glass-bg': 'rgba(26, 35, 126, 0.08)',
                    '--glass-border': 'rgba(26, 35, 126, 0.2)',
                    '--glass-shadow': '0 8px 32px rgba(26, 35, 126, 0.4)',
                    
                    // 텍스트
                    '--text-primary': '#212121',
                    '--text-secondary': '#757575',
                    '--text-disabled': '#BDBDBD',
                    '--text-on-primary': '#FFFFFF',
                    '--text-on-secondary': '#FFFFFF',
                    '--text-on-accent': '#212121'
                }
            },

            // 💼 영업담당 테마 (그린 계열 - 5단계)
            sales: {
                name: '영업담당',
                icon: '💼',
                colors: {
                    // ----- 5단계 레이어 색상 -----
                    '--layer-1': '#0F2A1D',            // Deep Forest
                    '--layer-2': '#375534',            // Dark Olive
                    '--layer-3': '#6B9071',            // Medium Sage
                    '--layer-4': '#AEC3B0',            // Light Sage
                    '--layer-5': '#E3EED4',            // Pale Mint
                    
                    // ----- 레이어별 텍스트 색상 -----
                    '--text-on-layer-1': '#FFFFFF',
                    '--text-on-layer-2': '#FFFFFF',
                    '--text-on-layer-3': '#FFFFFF',
                    '--text-on-layer-4': '#37474F',
                    '--text-on-layer-5': '#37474F',
                    
                    // ----- 주요 색상 -----
                    '--primary-color': '#375534',      // Layer 2 - Dark Olive
                    '--primary-light': '#6B9071',      // Layer 3 - Medium Sage
                    '--primary-dark': '#0F2A1D',       // Layer 1 - Deep Forest
                    '--primary-text': '#FFFFFF',
                    
                    '--secondary-color': '#AEC3B0',    // Layer 4 - Light Sage
                    '--secondary-light': '#E3EED4',    // Layer 5 - Pale Mint
                    '--secondary-dark': '#6B9071',     // Layer 3 - Medium Sage
                    '--secondary-text': '#37474F',
                    
                    '--bg-color': '#FFFFFF',           // 클린 화이트
                    '--bg-dark': '#F5F5F5',
                    '--bg-text': '#37474F',            // 다크 차콜
                    
                    '--accent-color': '#FF7043',       // Vivid Orange
                    '--accent-light': '#FF8A65',
                    '--accent-dark': '#FF5722',
                    '--accent-text': '#37474F',
                    
                    // ----- 상태 색상 -----
                    '--success-color': '#66BB6A',
                    '--success-text': '#FFFFFF',
                    '--warning-color': '#FFC107',
                    '--warning-text': '#37474F',
                    '--danger-color': '#EF5350',
                    '--danger-text': '#FFFFFF',
                    '--info-color': '#26A69A',
                    '--info-text': '#FFFFFF',
                    
                    // ----- 그라데이션 -----
                    '--gradient-primary': 'linear-gradient(135deg, #0F2A1D 0%, #375534 100%)',
                    '--gradient-accent': 'linear-gradient(135deg, #6B9071 0%, #AEC3B0 100%)',
                    '--gradient-highlight': 'linear-gradient(135deg, #AEC3B0 0%, #E3EED4 100%)',
                    
                    // ----- 글래스모피즘 -----
                    '--glass-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glass-bg-light': 'rgba(255, 255, 255, 0.08)',
                    '--glass-bg-heavy': 'rgba(255, 255, 255, 0.15)',
                    '--glass-border': 'rgba(255, 255, 255, 0.2)',
                    '--glass-border-light': 'rgba(255, 255, 255, 0.15)',
                    '--glass-border-heavy': 'rgba(255, 255, 255, 0.3)',
                    '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)',
                    '--glass-shadow-hover': '0 12px 48px rgba(0, 0, 0, 0.4)',
                    '--glass-blur': 'blur(20px)',
                    
                    // ----- 텍스트 -----
                    '--text-primary': '#37474F',
                    '--text-secondary': '#607D8B',
                    '--text-disabled': '#B0BEC5',
                    '--text-on-primary': '#FFFFFF',
                    '--text-on-secondary': '#37474F',
                    '--text-on-accent': '#37474F'
                }
            },

            // 👨‍💼 관리자 테마 (블루 계열 - 5단계)
            admin: {
                name: '관리자',
                icon: '👨‍💼',
                colors: {
                    // ----- 5단계 레이어 색상 -----
                    '--layer-1': '#021024',            // Deep Navy
                    '--layer-2': '#052659',            // Dark Blue
                    '--layer-3': '#5A7FA0',            // Medium Blue
                    '--layer-4': '#7DA0CA',            // Light Blue
                    '--layer-5': '#C1E8FF',            // Pale Blue
                    
                    // ----- 레이어별 텍스트 색상 -----
                    '--text-on-layer-1': '#FFFFFF',
                    '--text-on-layer-2': '#FFFFFF',
                    '--text-on-layer-3': '#FFFFFF',
                    '--text-on-layer-4': '#212121',
                    '--text-on-layer-5': '#212121',
                    
                    // ----- 주요 색상 -----
                    '--primary-color': '#052659',      // Layer 2 - Dark Blue
                    '--primary-light': '#5A7FA0',      // Layer 3 - Medium Blue
                    '--primary-dark': '#021024',       // Layer 1 - Deep Navy
                    '--primary-text': '#FFFFFF',
                    
                    '--secondary-color': '#7DA0CA',    // Layer 4 - Light Blue
                    '--secondary-light': '#C1E8FF',    // Layer 5 - Pale Blue
                    '--secondary-dark': '#5A7FA0',     // Layer 3 - Medium Blue
                    '--secondary-text': '#212121',
                    
                    '--bg-color': '#FAFAFA',           // 아이보리
                    '--bg-dark': '#F5F5F5',
                    '--bg-text': '#212121',            // 진한 차콜
                    
                    '--accent-color': '#00E676',       // Neon Mint
                    '--accent-light': '#69F0AE',
                    '--accent-dark': '#00C853',
                    '--accent-text': '#212121',
                    
                    // ----- 상태 색상 -----
                    '--success-color': '#4CAF50',
                    '--success-text': '#FFFFFF',
                    '--warning-color': '#FF9800',
                    '--warning-text': '#212121',
                    '--danger-color': '#F44336',
                    '--danger-text': '#FFFFFF',
                    '--info-color': '#2196F3',
                    '--info-text': '#FFFFFF',
                    
                    // ----- 그라데이션 -----
                    '--gradient-primary': 'linear-gradient(135deg, #021024 0%, #052659 100%)',
                    '--gradient-accent': 'linear-gradient(135deg, #5A7FA0 0%, #7DA0CA 100%)',
                    '--gradient-highlight': 'linear-gradient(135deg, #7DA0CA 0%, #C1E8FF 100%)',
                    
                    // ----- 글래스모피즘 -----
                    '--glass-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glass-bg-light': 'rgba(255, 255, 255, 0.08)',
                    '--glass-bg-heavy': 'rgba(255, 255, 255, 0.15)',
                    '--glass-border': 'rgba(255, 255, 255, 0.2)',
                    '--glass-border-light': 'rgba(255, 255, 255, 0.15)',
                    '--glass-border-heavy': 'rgba(255, 255, 255, 0.3)',
                    '--glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)',
                    '--glass-shadow-hover': '0 12px 48px rgba(0, 0, 0, 0.4)',
                    '--glass-blur': 'blur(20px)',
                    
                    // ----- 텍스트 -----
                    '--text-primary': '#212121',
                    '--text-secondary': '#757575',
                    '--text-disabled': '#BDBDBD',
                    '--text-on-primary': '#FFFFFF',
                    '--text-on-secondary': '#212121',
                    '--text-on-accent': '#212121'
                }
            }
        };

        this.currentTheme = null;
        this.initialized = false;
    }

    /**
     * 테마 초기화
     */
    init() {
        if (this.initialized) return;
        
        // ✅ FIXED: HTML에 이미 설정된 테마 우선 사용
        // body의 class와 data-mode 속성에서 현재 테마 확인
        const bodyClasses = document.body.classList;
        let currentThemeFromHTML = null;
        
        // class="theme-admin" 형태로 설정된 테마 찾기
        bodyClasses.forEach(cls => {
            if (cls.startsWith('theme-')) {
                currentThemeFromHTML = cls.replace('theme-', '');
            }
        });
        
        // data-mode 속성도 확인
        const dataMode = document.body.getAttribute('data-mode');
        if (dataMode && !currentThemeFromHTML) {
            currentThemeFromHTML = dataMode;
        }
        
        // HTML에 이미 테마가 설정되어 있으면 그것을 사용
        if (currentThemeFromHTML && this.themes[currentThemeFromHTML]) {
            this.currentTheme = currentThemeFromHTML;
            // localStorage에 저장 (다음 방문 시 유지)
            localStorage.setItem('kuwotech_theme', currentThemeFromHTML);
        } else {
            // HTML에 테마가 없으면 저장된 테마 또는 역할별 테마 사용
            const savedTheme = localStorage.getItem('kuwotech_theme');
            const userRole = sessionStorage.getItem('userRole');
            
            if (savedTheme && this.themes[savedTheme]) {
                this.applyTheme(savedTheme);
            } else if (userRole) {
                this.setThemeByRole(userRole);
            } else {
                this.applyTheme('login');
            }
        }
        
        this.initialized = true;
    }

    /**
     * 테마 적용
     */
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) {
            logger.error(`테마를 찾을 수 없습니다: ${themeName}`);
            return false;
        }

        // ✅ FIXED: CSS 변수를 inline으로 적용하지 않음
        // 대신 body class와 data-mode만 변경하여 CSS 파일의 스타일 적용
        // CSS 파일(07_theme_colors.css)에 정의된 변수들이 자동으로 적용됨

        // body 클래스 업데이트
        // 기존 theme-* 클래스 제거
        const classesToRemove = [];
        document.body.classList.forEach(cls => {
            if (cls.startsWith('theme-')) {
                classesToRemove.push(cls);
            }
        });
        classesToRemove.forEach(cls => document.body.classList.remove(cls));
        
        // 새 테마 클래스 추가
        document.body.classList.add(`theme-${themeName}`);
        
        // data-mode 속성 업데이트 (body만 - CSS 선택자와 일치)
        document.body.setAttribute('data-mode', themeName);
        
        // ✅ inline style 완전히 제거
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        
        // ✅ documentElement의 inline CSS 변수도 모두 제거
        Object.keys(theme.colors).forEach(key => {
            document.documentElement.style.removeProperty(key);
        });
        
        
        // 현재 테마 저장
        this.currentTheme = themeName;
        localStorage.setItem('kuwotech_theme', themeName);
        
        // 이벤트 발생
        this.dispatchThemeChange(themeName);
        
        return true;
    }

    /**
     * 역할별 테마 설정
     */
    setThemeByRole(role) {
        const themeMap = {
            'admin': 'admin',
            '관리자': 'admin',
            'sales': 'sales',
            '영업담당': 'sales',
            'login': 'login'
        };
        
        const themeName = themeMap[role] || 'login';
        this.applyTheme(themeName);
    }

    /**
     * 현재 테마 가져오기
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 테마 정보 가져오기
     */
    getThemeInfo(themeName) {
        return this.themes[themeName] || null;
    }

    /**
     * 사용 가능한 테마 목록
     */
    getThemeList() {
        return Object.keys(this.themes);
    }

    /**
     * 테마 순환 전환
     */
    cycleTheme() {
        const themes = this.getThemeList();
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.applyTheme(themes[nextIndex]);
    }

    /**
     * 테마 변경 이벤트 발생
     */
    dispatchThemeChange(themeName) {
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: {
                theme: themeName,
                info: this.themes[themeName]
            }
        }));
    }

    /**
     * 트랜지션 설정
     */
    setTransition(enable) {
        if (enable) {
            document.documentElement.style.transition = 'all 0.3s ease';
        } else {
            document.documentElement.style.transition = 'none';
        }
    }
}

// 싱글톤 인스턴스
const themeManager = new ThemeManager();

// 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => themeManager.init());
} else {
    themeManager.init();
}

// 전역 노출
window.themeManager = themeManager;

export { themeManager };
export default themeManager;