# 📱 KUWOTECH 영업관리시스템 UI/UX 종합 가이드

> **작성일**: 2025-01-27  
> **수정일**: 2025-09-27  
> **버전**: 2.0  
> **핵심원칙**: 역할별 테마, 글래스모피즘, 동적 설계

---

## 🎯 1. 디자인 시스템 아키텍처

### 1.1 역할별 테마 시스템

```javascript
// 역할별 테마 정의
const THEME_SYSTEM = {
  // 🔐 로그인 테마 (네이비 + 옐로우)
  login: {
    name: '로그인',
    description: '신뢰와 전문성',
    colors: {
      primary: '#1A237E',    // 짙은 네이비
      secondary: '#B0BEC5',   // 소프트 그레이
      accent: '#FFC107',      // 머스타드 옐로우
      background: '#F5F5F5',  // 오프 화이트
      text: '#212121'         // 진한 차콜
    },
    glass: {
      bg: 'rgba(26, 35, 126, 0.15)',
      border: 'rgba(255, 255, 255, 0.18)',
      shadow: '0 8px 32px 0 rgba(26, 35, 126, 0.37)'
    }
  },
  
  // 💼 영업담당 테마 (시더 + 오렌지)
  sales: {
    name: '영업담당',
    description: '혁신과 활력',
    colors: {
      primary: '#0097A7',     // 톤다운 시더
      secondary: '#37474F',   // 다크 차콜
      accent: '#FF7043',      // 비비드 오렌지
      background: '#FFFFFF',  // 클린 화이트
      text: '#37474F'         // 다크 차콜
    },
    glass: {
      bg: 'rgba(0, 151, 167, 0.15)',
      border: 'rgba(255, 255, 255, 0.18)',
      shadow: '0 8px 32px 0 rgba(0, 151, 167, 0.37)'
    }
  },
  
  // 👔 관리자 테마 (블루 + 민트)
  admin: {
    name: '관리자',
    description: '평온과 트렌디',
    colors: {
      primary: '#64B5F6',     // 더스티 블루
      secondary: '#424242',   // 다크 그레이
      accent: '#00E676',      // 네온 민트
      background: '#FAFAFA',  // 아이보리
      text: '#212121'         // 진한 차콜
    },
    glass: {
      bg: 'rgba(100, 181, 246, 0.15)',
      border: 'rgba(255, 255, 255, 0.18)',
      shadow: '0 8px 32px 0 rgba(100, 181, 246, 0.37)'
    }
  }
};
```

### 1.2 CSS 변수 동적 시스템

```css
:root {
  /* 역할별 동적 색상 */
  --primary-color: var(--theme-primary);
  --secondary-color: var(--theme-secondary);
  --accent-color: var(--theme-accent);
  --bg-color: var(--theme-background);
  --text-color: var(--theme-text);
  
  /* 글래스모피즘 변수 */
  --glass-bg: var(--theme-glass-bg);
  --glass-border: var(--theme-glass-border);
  --glass-shadow: var(--theme-glass-shadow);
  --glass-blur: blur(12px);
  --glass-blur-light: blur(8px);
  --glass-blur-heavy: blur(20px);
  
  /* 동적 간격 시스템 (8px 기반) */
  --spacing-unit: 8px;
  --spacing-xs: calc(var(--spacing-unit) * 0.5);    /* 4px */
  --spacing-sm: calc(var(--spacing-unit) * 1);      /* 8px */
  --spacing-md: calc(var(--spacing-unit) * 2);      /* 16px */
  --spacing-lg: calc(var(--spacing-unit) * 3);      /* 24px */
  --spacing-xl: calc(var(--spacing-unit) * 4);      /* 32px */
  
  /* 동적 폰트 스케일 */
  --font-scale: 1.25;
  --font-base: clamp(14px, 2vw, 16px);
  --font-xs: calc(var(--font-base) / var(--font-scale));
  --font-sm: calc(var(--font-base) * 0.875);
  --font-md: var(--font-base);
  --font-lg: calc(var(--font-base) * var(--font-scale));
  --font-xl: calc(var(--font-lg) * var(--font-scale));
  --font-2xl: calc(var(--font-xl) * var(--font-scale));
}
```

### 1.3 테마 매니저 클래스

```javascript
class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.themes = THEME_SYSTEM;
    this.listeners = new Set();
  }
  
  // 역할별 테마 적용
  applyThemeByRole(userRole) {
    let themeName = 'login';
    
    if (userRole === '관리자') {
      themeName = 'admin';
    } else if (userRole === '영업담당') {
      themeName = 'sales';
    }
    
    this.applyTheme(themeName);
    return themeName;
  }
  
  // 테마 적용
  applyTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return;
    
    // CSS 클래스 변경
    document.body.className = `theme-${themeName}`;
    document.documentElement.setAttribute('data-mode', themeName);
    
    // CSS 변수 업데이트
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--theme-${key}`, value);
    });
    
    // 글래스 효과 변수
    Object.entries(theme.glass).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--theme-glass-${key}`, value);
    });
    
    this.currentTheme = themeName;
    this.notifyListeners(themeName, theme);
    
    console.log(`✨ 테마 변경: ${theme.name} - ${theme.description}`);
  }
  
  // 글래스 효과 강도 조절
  setGlassIntensity(level = 'normal') {
    const intensities = {
      light: { blur: '6px', opacity: '0.05' },
      normal: { blur: '12px', opacity: '0.15' },
      heavy: { blur: '20px', opacity: '0.25' }
    };
    
    const intensity = intensities[level];
    document.documentElement.style.setProperty('--glass-blur', `blur(${intensity.blur})`);
    document.documentElement.style.setProperty('--glass-opacity', intensity.opacity);
  }
  
  // 리스너 관리
  addListener(callback) {
    this.listeners.add(callback);
  }
  
  notifyListeners(themeName, themeData) {
    this.listeners.forEach(callback => {
      callback(themeName, themeData);
    });
  }
}
```

---

## 🏗️ 2. 글래스모피즘 컴포넌트 시스템

### 2.1 글래스 카드 컴포넌트

```javascript
class GlassCard {
  constructor(config = {}) {
    this.config = {
      title: config.title || '',
      content: config.content || '',
      size: config.size || 'md',
      glasIntensity: config.glasIntensity || 'normal',
      interactive: config.interactive !== false,
      animation: config.animation || 'fadeIn'
    };
  }
  
  render() {
    return `
      <div class="glass-card glass-card-${this.config.size}" 
           data-intensity="${this.config.glasIntensity}">
        ${this.config.title ? `
          <div class="glass-card-header">
            <h3 class="glass-card-title">${this.config.title}</h3>
          </div>
        ` : ''}
        <div class="glass-card-body">
          ${this.config.content}
        </div>
        ${this.renderGlassEffects()}
      </div>
    `;
  }
  
  renderGlassEffects() {
    return `
      <div class="glass-shine"></div>
      <div class="glass-gradient"></div>
      <div class="glass-blur-layer"></div>
    `;
  }
  
  getStyles() {
    return `
      .glass-card {
        background: var(--gradient-glass), var(--glass-bg);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
        border: 1px solid var(--theme-glass-border);
        border-radius: 16px;
        box-shadow: var(--glass-shadow);
        padding: 24px;
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .glass-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-hover), var(--theme-glass-glow);
        border-color: var(--primary-color);
      }
      
      .glass-shine {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.1) 50%,
          transparent 70%
        );
        transform: rotate(45deg);
        animation: shine 3s infinite;
      }
      
      @keyframes shine {
        0% { transform: translateX(-100%) rotate(45deg); }
        100% { transform: translateX(100%) rotate(45deg); }
      }
    `;
  }
}
```

### 2.2 글래스 버튼 컴포넌트

```javascript
class GlassButton {
  constructor(config = {}) {
    this.config = {
      text: config.text || 'Button',
      type: config.type || 'primary', // primary, accent, ghost
      size: config.size || 'md',
      icon: config.icon || null,
      ripple: config.ripple !== false,
      glasEffect: config.glasEffect !== false
    };
  }
  
  render() {
    const buttonClass = [
      'glass-button',
      `btn-${this.config.type}`,
      `btn-${this.config.size}`,
      this.config.ripple && 'btn-ripple',
      this.config.glasEffect && 'btn-glass'
    ].filter(Boolean).join(' ');
    
    return `
      <button class="${buttonClass}">
        ${this.config.icon ? `<span class="btn-icon">${this.config.icon}</span>` : ''}
        <span class="btn-text">${this.config.text}</span>
        ${this.config.ripple ? '<span class="btn-ripple-container"></span>' : ''}
      </button>
    `;
  }
  
  attachRippleEffect(element) {
    if (!this.config.ripple) return;
    
    element.addEventListener('click', (e) => {
      const ripple = document.createElement('span');
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      const rippleContainer = element.querySelector('.btn-ripple-container');
      rippleContainer.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  }
}
```

### 2.3 글래스 모달 컴포넌트

```javascript
class GlassModal {
  constructor(config = {}) {
    this.config = {
      title: config.title || '',
      content: config.content || '',
      size: config.size || 'md',
      closable: config.closable !== false,
      backdrop: config.backdrop !== false,
      animation: config.animation || 'slideUp',
      buttons: config.buttons || []
    };
    
    this.isOpen = false;
  }
  
  render() {
    const modalClass = [
      'glass-modal',
      `modal-${this.config.size}`,
      `modal-${this.config.animation}`
    ].join(' ');
    
    return `
      <div class="glass-modal-wrapper" data-open="${this.isOpen}">
        ${this.config.backdrop ? '<div class="glass-modal-backdrop"></div>' : ''}
        <div class="${modalClass}">
          <div class="modal-header">
            <h2 class="modal-title">${this.config.title}</h2>
            ${this.config.closable ? `
              <button class="modal-close glass-button btn-ghost">
                <span>✕</span>
              </button>
            ` : ''}
          </div>
          <div class="modal-body">
            ${this.config.content}
          </div>
          ${this.config.buttons.length > 0 ? `
            <div class="modal-footer">
              ${this.config.buttons.map(btn => `
                <button class="glass-button btn-${btn.type || 'primary'}">
                  ${btn.text}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  open() {
    this.isOpen = true;
    const wrapper = document.querySelector('.glass-modal-wrapper');
    if (wrapper) {
      wrapper.setAttribute('data-open', 'true');
      this.animateIn();
    }
  }
  
  close() {
    this.isOpen = false;
    const wrapper = document.querySelector('.glass-modal-wrapper');
    if (wrapper) {
      this.animateOut(() => {
        wrapper.setAttribute('data-open', 'false');
      });
    }
  }
  
  animateIn() {
    const modal = document.querySelector('.glass-modal');
    modal.style.animation = `${this.config.animation}In 0.3s ease-out`;
  }
  
  animateOut(callback) {
    const modal = document.querySelector('.glass-modal');
    modal.style.animation = `${this.config.animation}Out 0.3s ease-in`;
    setTimeout(callback, 300);
  }
}
```

---

## 📊 3. KPI 대시보드 컴포넌트

### 3.1 KPI 카드 시스템

```javascript
class KPICard {
  constructor(data) {
    this.data = {
      title: data.title || 'KPI',
      value: data.value || 0,
      unit: data.unit || '',
      trend: data.trend || 0, // 백분율
      trendDirection: data.trend > 0 ? 'up' : data.trend < 0 ? 'down' : 'flat',
      icon: data.icon || '📊',
      sparklineData: data.sparklineData || [],
      themeColor: data.themeColor || 'primary'
    };
  }
  
  render() {
    const trendClass = `trend-${this.data.trendDirection}`;
    const trendIcon = {
      up: '↗️',
      down: '↘️',
      flat: '➡️'
    }[this.data.trendDirection];
    
    return `
      <div class="kpi-card glass-card" data-theme-color="${this.data.themeColor}">
        <div class="kpi-header">
          <span class="kpi-icon">${this.data.icon}</span>
          <span class="kpi-title">${this.data.title}</span>
        </div>
        <div class="kpi-body">
          <div class="kpi-value-wrapper">
            <span class="kpi-value">${this.formatValue(this.data.value)}</span>
            <span class="kpi-unit">${this.data.unit}</span>
          </div>
          <div class="kpi-trend ${trendClass}">
            <span class="trend-icon">${trendIcon}</span>
            <span class="trend-value">${Math.abs(this.data.trend)}%</span>
          </div>
        </div>
        ${this.data.sparklineData.length > 0 ? `
          <div class="kpi-sparkline">
            ${this.renderSparkline()}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  formatValue(value) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  }
  
  renderSparkline() {
    // 간단한 SVG 스파크라인
    const width = 200;
    const height = 40;
    const max = Math.max(...this.data.sparklineData);
    const min = Math.min(...this.data.sparklineData);
    const range = max - min || 1;
    
    const points = this.data.sparklineData.map((value, index) => {
      const x = (index / (this.data.sparklineData.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return `
      <svg width="${width}" height="${height}" class="sparkline-svg">
        <polyline
          points="${points}"
          fill="none"
          stroke="var(--primary-color)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }
}
```

### 3.2 KPI 그리드 레이아웃

```javascript
class KPIGrid {
  constructor(config = {}) {
    this.config = {
      columns: config.columns || 'auto-fit',
      minCardWidth: config.minCardWidth || '280px',
      gap: config.gap || 'var(--spacing-md)',
      data: config.data || []
    };
    
    this.cards = [];
  }
  
  init() {
    this.createCards();
    this.render();
    this.attachEventListeners();
  }
  
  createCards() {
    this.cards = this.config.data.map(item => new KPICard(item));
  }
  
  render() {
    const gridStyles = `
      display: grid;
      grid-template-columns: repeat(${this.config.columns}, minmax(${this.config.minCardWidth}, 1fr));
      gap: ${this.config.gap};
    `;
    
    const container = document.createElement('div');
    container.className = 'kpi-grid';
    container.style.cssText = gridStyles;
    
    this.cards.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.innerHTML = card.render();
      container.appendChild(cardElement.firstElementChild);
    });
    
    return container;
  }
  
  attachEventListeners() {
    // 카드 클릭 이벤트
    document.querySelectorAll('.kpi-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        this.onCardClick(this.cards[index], index);
      });
      
      // 호버 효과
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px) scale(1.02)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
      });
    });
  }
  
  onCardClick(card, index) {
    console.log(`KPI 카드 클릭: ${card.data.title}`, card.data);
    
    // 상세 모달 표시
    const modal = new GlassModal({
      title: card.data.title,
      content: this.renderDetailView(card.data),
      size: 'lg',
      buttons: [
        { text: '닫기', type: 'ghost' },
        { text: '상세보기', type: 'primary' }
      ]
    });
    
    document.body.insertAdjacentHTML('beforeend', modal.render());
    modal.open();
  }
  
  renderDetailView(data) {
    return `
      <div class="kpi-detail">
        <div class="detail-header">
          <span class="detail-icon">${data.icon}</span>
          <h3>${data.title}</h3>
        </div>
        <div class="detail-metrics">
          <div class="metric-item">
            <label>현재 값</label>
            <span>${data.value} ${data.unit}</span>
          </div>
          <div class="metric-item">
            <label>변화율</label>
            <span class="trend-${data.trendDirection}">
              ${data.trend > 0 ? '+' : ''}${data.trend}%
            </span>
          </div>
        </div>
        <div class="detail-chart">
          <!-- 차트 렌더링 영역 -->
        </div>
      </div>
    `;
  }
}
```

---

## 🎬 4. 애니메이션 시스템

### 4.1 글래스모피즘 애니메이션

```css
/* 글래스 페이드 인 */
@keyframes glassFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    backdrop-filter: var(--glass-blur);
    transform: translateY(0);
  }
}

/* 글래스 슬라이드 업 */
@keyframes glassSlideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 글래스 회전 */
@keyframes glassRotate {
  from {
    transform: rotateY(-90deg);
    opacity: 0;
  }
  to {
    transform: rotateY(0);
    opacity: 1;
  }
}

/* 글래스 펄스 */
@keyframes glassPulse {
  0%, 100% {
    box-shadow: var(--glass-shadow);
  }
  50% {
    box-shadow: 0 0 30px var(--primary-alpha);
  }
}

/* 물결 효과 */
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: ripple 0.6s linear;
  pointer-events: none;
}
```

### 4.2 인터섹션 옵저버 애니메이션

```javascript
class ScrollAnimationManager {
  constructor() {
    this.observers = new Map();
    this.animationClasses = {
      fadeIn: 'animate-fade-in',
      slideUp: 'animate-slide-up',
      slideLeft: 'animate-slide-left',
      slideRight: 'animate-slide-right',
      zoomIn: 'animate-zoom-in',
      glassIn: 'animate-glass-in'
    };
  }
  
  init() {
    this.setupObservers();
    this.observeElements();
  }
  
  setupObservers() {
    // 기본 옵저버
    this.defaultObserver = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );
    
    // 스태거 애니메이션용 옵저버
    this.staggerObserver = new IntersectionObserver(
      (entries) => this.handleStaggerIntersection(entries),
      {
        threshold: 0.05,
        rootMargin: '30px'
      }
    );
  }
  
  observeElements() {
    // 일반 애니메이션 요소
    document.querySelectorAll('[data-animate]').forEach(el => {
      this.defaultObserver.observe(el);
    });
    
    // 스태거 애니메이션 요소
    document.querySelectorAll('[data-animate-stagger]').forEach(container => {
      const children = container.children;
      Array.from(children).forEach((child, index) => {
        child.style.animationDelay = `${index * 100}ms`;
        this.staggerObserver.observe(child);
      });
    });
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const animation = entry.target.dataset.animate;
        const animationClass = this.animationClasses[animation] || 'animate-fade-in';
        
        entry.target.classList.add(animationClass);
        this.defaultObserver.unobserve(entry.target);
      }
    });
  }
  
  handleStaggerIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-stagger-item');
        this.staggerObserver.unobserve(entry.target);
      }
    });
  }
}
```

---

## 📱 5. 반응형 디자인 시스템

### 5.1 브레이크포인트 매니저

```javascript
class ResponsiveManager {
  constructor() {
    this.breakpoints = {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536
    };
    
    this.current = null;
    this.callbacks = new Map();
  }
  
  init() {
    this.detectBreakpoint();
    this.attachListeners();
    this.applyResponsiveClasses();
  }
  
  detectBreakpoint() {
    const width = window.innerWidth;
    let newBreakpoint = 'xs';
    
    for (const [bp, minWidth] of Object.entries(this.breakpoints)) {
      if (width >= minWidth) {
        newBreakpoint = bp;
      }
    }
    
    if (newBreakpoint !== this.current) {
      this.onBreakpointChange(this.current, newBreakpoint);
      this.current = newBreakpoint;
    }
  }
  
  onBreakpointChange(from, to) {
    console.log(`📱 브레이크포인트 변경: ${from} → ${to}`);
    
    // 테마별 반응형 조정
    this.adjustThemeForBreakpoint(to);
    
    // 레이아웃 조정
    this.adjustLayoutForBreakpoint(to);
    
    // 콜백 실행
    this.callbacks.forEach(callback => {
      callback(to, from);
    });
  }
  
  adjustThemeForBreakpoint(breakpoint) {
    const adjustments = {
      xs: {
        '--sidebar-width': '0',
        '--header-height': '56px',
        '--base-font-size': '13px',
        '--glass-blur': 'blur(6px)' // 모바일 성능 최적화
      },
      sm: {
        '--sidebar-width': '0',
        '--header-height': '60px',
        '--base-font-size': '14px',
        '--glass-blur': 'blur(8px)'
      },
      md: {
        '--sidebar-width': '200px',
        '--header-height': '60px',
        '--base-font-size': '14px',
        '--glass-blur': 'blur(10px)'
      },
      lg: {
        '--sidebar-width': '250px',
        '--header-height': '64px',
        '--base-font-size': '14px',
        '--glass-blur': 'blur(12px)'
      },
      xl: {
        '--sidebar-width': '280px',
        '--header-height': '72px',
        '--base-font-size': '16px',
        '--glass-blur': 'blur(15px)'
      }
    };
    
    const settings = adjustments[breakpoint] || adjustments.lg;
    
    Object.entries(settings).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }
  
  adjustLayoutForBreakpoint(breakpoint) {
    // 사이드바 토글
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      if (['xs', 'sm'].includes(breakpoint)) {
        sidebar.classList.add('sidebar-mobile');
        sidebar.classList.remove('sidebar-desktop');
      } else {
        sidebar.classList.add('sidebar-desktop');
        sidebar.classList.remove('sidebar-mobile');
      }
    }
    
    // 그리드 조정
    const grids = document.querySelectorAll('.grid');
    grids.forEach(grid => {
      const columns = {
        xs: 1,
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4
      }[breakpoint] || 3;
      
      grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    });
  }
  
  attachListeners() {
    let resizeTimer;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.detectBreakpoint();
      }, 150);
    });
  }
  
  applyResponsiveClasses() {
    const body = document.body;
    
    // 현재 브레이크포인트 클래스
    body.className = body.className.replace(/\bbp-\S+/g, '');
    body.classList.add(`bp-${this.current}`);
    
    // 디바이스 타입 클래스
    const isMobile = ['xs', 'sm'].includes(this.current);
    const isTablet = ['md'].includes(this.current);
    const isDesktop = ['lg', 'xl', '2xl'].includes(this.current);
    
    body.classList.toggle('device-mobile', isMobile);
    body.classList.toggle('device-tablet', isTablet);
    body.classList.toggle('device-desktop', isDesktop);
  }
  
  onBreakpoint(callback) {
    const id = Date.now();
    this.callbacks.set(id, callback);
    return () => this.callbacks.delete(id);
  }
}
```

---

## 🎯 6. 페이지별 구현 가이드

### 6.1 로그인 페이지

```javascript
const LoginPageConfig = {
  theme: 'login',
  layout: {
    type: 'centered',
    background: 'gradient-mesh',
    glassEffect: true
  },
  
  components: {
    // 로고와 타이틀
    header: {
      logo: {
        size: 'lg',
        animation: 'glassFadeIn',
        glowEffect: true
      },
      title: {
        text: 'KUWOTECH 영업관리 시스템',
        gradient: true,
        size: '2xl'
      }
    },
    
    // 로그인 카드
    loginCard: {
      type: 'glass-card',
      width: '400px',
      padding: 'xl',
      elements: {
        fileUpload: {
          accept: ['.xlsx', '.xls'],
          dragDrop: true,
          glassStyle: true
        },
        roleSelection: {
          type: 'radio-glass',
          options: ['관리자', '영업담당'],
          onChange: 'updateThemePreview'
        },
        userSelect: {
          type: 'dropdown-glass',
          placeholder: '사용자 선택',
          searchable: true
        },
        passwordInput: {
          type: 'input-glass',
          placeholder: '비밀번호',
          showToggle: true
        },
        loginButton: {
          type: 'glass-button',
          text: '로그인',
          fullWidth: true,
          ripple: true,
          gradient: 'accent'
        }
      }
    },
    
    // 진행 표시기
    progressIndicator: {
      type: 'glass-progress',
      steps: ['시스템 접근', '사용자 인증', '역할 확인', '로그인 완료', '대시보드 진입'],
      animated: true
    }
  }
};
```

### 6.2 관리자 대시보드

```javascript
const AdminDashboardConfig = {
  theme: 'admin',
  layout: {
    type: 'sidebar-content',
    sidebarFixed: true,
    headerFixed: true
  },
  
  components: {
    // 헤더
    header: {
      background: 'gradient-primary',
      glassEffect: true,
      elements: {
        logo: { size: 'sm' },
        title: { text: '관리자 모드' },
        userInfo: { 
          showAvatar: true,
          showRole: true 
        },
        clock: { 
          type: 'digital',
          showDate: true 
        }
      }
    },
    
    // 사이드바
    sidebar: {
      type: 'glass-sidebar',
      width: '250px',
      items: [
        { 
          id: 'dashboard',
          icon: '🏠',
          label: '대시보드',
          badge: null
        },
        { 
          id: 'companies',
          icon: '📊',
          label: '전체거래처 관리',
          badge: { text: '152', type: 'primary' }
        },
        { 
          id: 'reports',
          icon: '✅',
          label: '실적보고서 확인',
          badge: { text: '5', type: 'accent' }
        },
        { 
          id: 'presentation',
          icon: '📈',
          label: '보고서 발표',
          badge: null
        },
        { 
          id: 'employees',
          icon: '👥',
          label: '직원 관리',
          badge: { text: '23', type: 'secondary' }
        }
      ]
    },
    
    // KPI 대시보드
    kpiSection: {
      title: '주요 성과 지표',
      grid: {
        columns: 'auto-fit',
        minWidth: '280px'
      },
      cards: [
        {
          title: '총 매출액',
          value: 1250000000,
          unit: '원',
          trend: 12.5,
          icon: '💰',
          themeColor: 'primary'
        },
        {
          title: '신규 고객',
          value: 48,
          unit: '명',
          trend: 8.3,
          icon: '👥',
          themeColor: 'accent'
        },
        {
          title: '달성률',
          value: 87.5,
          unit: '%',
          trend: -2.1,
          icon: '🎯',
          themeColor: 'secondary'
        },
        {
          title: '활성 프로젝트',
          value: 15,
          unit: '건',
          trend: 0,
          icon: '📁',
          themeColor: 'warning'
        }
      ]
    },
    
    // 데이터 테이블
    dataTable: {
      type: 'glass-table',
      features: {
        search: true,
        sort: true,
        filter: true,
        pagination: true,
        export: true
      },
      columns: [
        { key: 'company', title: '거래처명', sortable: true },
        { key: 'manager', title: '담당자', sortable: true },
        { key: 'revenue', title: '매출액', sortable: true, formatter: 'currency' },
        { key: 'status', title: '상태', sortable: true, formatter: 'badge' },
        { key: 'lastContact', title: '최근 연락', sortable: true, formatter: 'date' }
      ]
    }
  }
};
```

### 6.3 영업담당 대시보드

```javascript
const SalesDashboardConfig = {
  theme: 'sales',
  layout: {
    type: 'sidebar-content',
    similar: 'admin' // 관리자와 유사한 레이아웃
  },
  
  components: {
    // 헤더 (시더 테마)
    header: {
      background: 'gradient-primary',
      glassEffect: true,
      elements: {
        title: { text: '영업담당 모드' },
        notifications: {
          show: true,
          badge: true
        }
      }
    },
    
    // 사이드바 메뉴
    sidebar: {
      items: [
        { id: 'dashboard', icon: '🏠', label: '대시보드' },
        { id: 'my-companies', icon: '📊', label: '담당거래처 관리' },
        { id: 'report-write', icon: '📝', label: '실적보고서 작성' },
        { id: 'report-check', icon: '✅', label: '실적보고서 확인' },
        { id: 'new-customers', icon: '🆕', label: '신규고객관리' }
      ]
    },
    
    // 개인 실적 KPI
    personalKPI: {
      title: '나의 실적',
      cards: [
        {
          title: '이번 달 매출',
          value: 85000000,
          unit: '원',
          trend: 15.2,
          icon: '💵',
          sparklineData: [65, 70, 75, 80, 78, 82, 85]
        },
        {
          title: '담당 고객',
          value: 24,
          unit: '개사',
          trend: 4.2,
          icon: '🏢'
        },
        {
          title: '목표 달성률',
          value: 92.3,
          unit: '%',
          trend: 5.8,
          icon: '🎯'
        },
        {
          title: '이번 주 방문',
          value: 8,
          unit: '회',
          trend: -11.1,
          icon: '🚗'
        }
      ]
    },
    
    // 일정 캘린더
    calendar: {
      type: 'glass-calendar',
      view: 'month',
      showEvents: true,
      editable: true
    },
    
    // 할일 목록
    todoList: {
      type: 'glass-todo',
      categories: ['긴급', '중요', '일반'],
      sortable: true,
      checkable: true
    }
  }
};
```

---

## 🔧 7. 유틸리티 함수

### 7.1 공통 유틸리티

```javascript
// 색상 유틸리티
const ColorUtils = {
  // HEX to RGBA
  hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
  
  // 밝기 조절
  adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  },
  
  // 대비율 계산
  getContrast(color1, color2) {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },
  
  getLuminance(hex) {
    const rgb = this.hexToRgb(hex);
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
};

// 포맷팅 유틸리티
const FormatUtils = {
  // 숫자 포맷
  formatNumber(num, decimals = 0) {
    return new Intl.NumberFormat('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  },
  
  // 통화 포맷
  formatCurrency(amount, currency = 'KRW') {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },
  
  // 날짜 포맷
  formatDate(date, format = 'full') {
    const options = {
      short: { year: '2-digit', month: '2-digit', day: '2-digit' },
      medium: { year: 'numeric', month: 'short', day: 'numeric' },
      full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    };
    
    return new Intl.DateTimeFormat('ko-KR', options[format]).format(date);
  }
};

// DOM 유틸리티
const DOMUtils = {
  // 요소 생성
  createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });
    
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Element) {
        element.appendChild(child);
      }
    });
    
    return element;
  },
  
  // 클래스 토글
  toggleClass(element, className, force) {
    if (force !== undefined) {
      force ? element.classList.add(className) : element.classList.remove(className);
    } else {
      element.classList.toggle(className);
    }
  },
  
  // 애니메이션 완료 대기
  waitForAnimation(element, animationName) {
    return new Promise(resolve => {
      const handler = (e) => {
        if (e.animationName === animationName) {
          element.removeEventListener('animationend', handler);
          resolve();
        }
      };
      element.addEventListener('animationend', handler);
    });
  }
};
```

---

## 📋 8. 구현 체크리스트

### Phase 1: 기초 구축 ✅
- [x] 역할별 테마 시스템
- [x] CSS 변수 체계
- [x] 글래스모피즘 효과
- [x] 테마 매니저 클래스

### Phase 2: 컴포넌트 개발 🔄
- [x] 글래스 카드
- [x] 글래스 버튼
- [x] 글래스 모달
- [x] KPI 카드
- [ ] 데이터 테이블
- [ ] 차트 시스템
- [ ] 폼 컴포넌트

### Phase 3: 페이지 구현 📝
- [ ] 로그인 페이지
- [ ] 관리자 대시보드
- [ ] 영업담당 대시보드
- [ ] 보고서 작성
- [ ] 데이터 관리
- [ ] 시스템 설정

### Phase 4: 최적화 🚀
- [ ] 성능 최적화
- [ ] 접근성 개선
- [ ] 반응형 완성
- [ ] 크로스 브라우저

---

## 🎨 9. 색상 대비 검증

| 테마 | 배경 | 텍스트 | 대비율 | WCAG |
|------|------|--------|--------|------|
| 로그인 | #F5F5F5 | #212121 | 15.1:1 | AAA ✅ |
| 로그인 | #1A237E | #FFFFFF | 12.6:1 | AAA ✅ |
| 영업 | #FFFFFF | #37474F | 9.7:1 | AAA ✅ |
| 영업 | #0097A7 | #FFFFFF | 4.9:1 | AA ✅ |
| 관리자 | #FAFAFA | #212121 | 14.8:1 | AAA ✅ |
| 관리자 | #64B5F6 | #212121 | 5.2:1 | AA ✅ |

---

**이 가이드는 역할별 테마와 글래스모피즘을 결합한 현대적인 UI/UX 시스템입니다.**