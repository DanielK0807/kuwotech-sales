/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 다운로드 진행 UI
 * ============================================
 * 
 * @파일명: 13_download_progress.js
 * @작성자: System
 * @작성일: 2025-09-30
 * @버전: 1.0
 * 
 * @설명:
 * 다운로드 진행 상태를 시각적으로 표시하는 UI 컴포넌트
 * 
 * @주요기능:
 * - 진행률 바 표시
 * - 진행 단계별 상태 표시
 * - 애니메이션 효과
 * - 완료/실패 메시지
 */

// ============================================
// [섹션 1: 다운로드 진행 클래스]
// ============================================

export class DownloadProgress {
    constructor() {
        this.overlay = null;
        this.modal = null;
        this.progressBar = null;
        this.progressMessage = null;
        this.progressPercent = null;
        this.currentStep = 0;
        this.steps = ['초기화', '수집', '처리', '생성', '완료'];
        
        this.createUI();
    }
    
    /**
     * [메서드: UI 생성]
     */
    createUI() {
        // 오버레이
        this.overlay = document.createElement('div');
        this.overlay.className = 'download-progress-overlay';
        this.overlay.style.display = 'none';
        
        // 모달
        this.modal = document.createElement('div');
        this.modal.className = 'download-progress-modal glass-panel';
        
        this.modal.innerHTML = `
            <div class="modal-header">
                <h3>📥 데이터 다운로드 중...</h3>
            </div>
            
            <div class="modal-body">
                <!-- 진행 바 -->
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" id="downloadProgressBar"></div>
                </div>
                
                <!-- 진행 정보 -->
                <div class="progress-info">
                    <span class="progress-message" id="downloadProgressMessage">준비 중...</span>
                    <span class="progress-percent" id="downloadProgressPercent">0%</span>
                </div>
                
                <!-- 진행 단계 -->
                <div class="progress-steps" id="downloadProgressSteps">
                    ${this.steps.map((step, index) => `
                        <div class="step" data-step="${index}">
                            <div class="step-icon">${this.getStepIcon(index)}</div>
                            <div class="step-label">${step}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);
        
        // 참조 저장
        this.progressBar = document.getElementById('downloadProgressBar');
        this.progressMessage = document.getElementById('downloadProgressMessage');
        this.progressPercent = document.getElementById('downloadProgressPercent');
    }
    
    /**
     * [메서드: 단계별 아이콘]
     */
    getStepIcon(step) {
        const icons = ['⏳', '📊', '⚙️', '📦', '✅'];
        return icons[step] || '⏳';
    }
    
    /**
     * [메서드: 진행 상태 표시]
     */
    show() {
        this.overlay.style.display = 'flex';
        this.update(0, '다운로드를 시작합니다...');
    }
    
    /**
     * [메서드: 진행 상태 숨김]
     */
    hide() {
        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.reset();
        }, 500);
    }
    
    /**
     * [메서드: 진행률 업데이트]
     * @param {number} percent - 진행률 (0-100)
     * @param {string} message - 메시지
     */
    update(percent, message) {
        // 진행 바 업데이트
        this.progressBar.style.width = percent + '%';
        this.progressPercent.textContent = Math.round(percent) + '%';
        this.progressMessage.textContent = message;
        
        // 단계 업데이트
        let step = 0;
        if (percent >= 20 && percent < 40) step = 1;
        else if (percent >= 40 && percent < 60) step = 2;
        else if (percent >= 60 && percent < 90) step = 3;
        else if (percent >= 90) step = 4;
        
        this.updateStep(step);
    }
    
    /**
     * [메서드: 단계 업데이트]
     */
    updateStep(step) {
        if (step === this.currentStep) return;
        
        const stepElements = document.querySelectorAll('.progress-steps .step');
        
        stepElements.forEach((el, index) => {
            el.classList.remove('active', 'complete');
            
            if (index < step) {
                el.classList.add('complete');
            } else if (index === step) {
                el.classList.add('active');
            }
        });
        
        this.currentStep = step;
    }
    
    /**
     * [메서드: 초기화]
     */
    reset() {
        this.progressBar.style.width = '0%';
        this.progressPercent.textContent = '0%';
        this.progressMessage.textContent = '준비 중...';
        this.currentStep = 0;
        
        const stepElements = document.querySelectorAll('.progress-steps .step');
        stepElements.forEach(el => {
            el.classList.remove('active', 'complete');
        });
    }
    
    /**
     * [메서드: 에러 표시]
     */
    showError(message) {
        this.modal.classList.add('error');
        this.progressMessage.textContent = '❌ ' + message;
        this.progressBar.style.backgroundColor = '#f44336';
        
        setTimeout(() => {
            this.hide();
            this.modal.classList.remove('error');
            this.progressBar.style.backgroundColor = '';
        }, 3000);
    }
    
    /**
     * [메서드: 성공 표시]
     */
    showSuccess(message = '다운로드 완료!') {
        this.modal.classList.add('success');
        this.progressMessage.textContent = '✅ ' + message;
        this.update(100, message);
    }
}

// ============================================
// [섹션 2: 스타일 추가]
// ============================================

const style = document.createElement('style');
style.textContent = `
    /* 오버레이 */
    .download-progress-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    /* 모달 */
    .download-progress-modal {
        width: 90%;
        max-width: 600px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        padding: 0;
        animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
        from {
            transform: translateY(50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .download-progress-modal.error {
        border-color: #f44336;
        animation: shake 0.5s ease;
    }
    
    .download-progress-modal.success {
        border-color: #4caf50;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    /* 헤더 */
    .download-progress-modal .modal-header {
        padding: 25px 30px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    .download-progress-modal .modal-header h3 {
        margin: 0;
        font-size: 1.5em;
        font-weight: 700;
        color: var(--primary-color, #0097A7);
    }
    
    /* 바디 */
    .download-progress-modal .modal-body {
        padding: 30px;
    }
    
    /* 진행 바 컨테이너 */
    .progress-bar-container {
        width: 100%;
        height: 20px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 15px;
        position: relative;
    }
    
    /* 진행 바 */
    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, 
            var(--primary-color, #0097A7) 0%, 
            var(--accent-color, #FF7043) 100%);
        border-radius: 10px;
        transition: width 0.5s ease;
        position: relative;
        overflow: hidden;
    }
    
    .progress-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%);
        animation: shimmer 2s infinite;
    }
    
    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }
    
    /* 진행 정보 */
    .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
    }
    
    .progress-message {
        font-size: 1em;
        font-weight: 500;
        color: var(--text-primary, #212121);
    }
    
    .progress-percent {
        font-size: 1.2em;
        font-weight: 700;
        color: var(--primary-color, #0097A7);
    }
    
    /* 진행 단계 */
    .progress-steps {
        display: flex;
        justify-content: space-between;
        gap: 10px;
    }
    
    .progress-steps .step {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 15px 10px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        opacity: 0.5;
    }
    
    .progress-steps .step.active {
        opacity: 1;
        background: linear-gradient(135deg, 
            rgba(var(--primary-rgb, 0, 151, 167), 0.15) 0%,
            rgba(var(--primary-rgb, 0, 151, 167), 0.05) 100%);
        border: 2px solid var(--primary-color, #0097A7);
        transform: scale(1.05);
    }
    
    .progress-steps .step.complete {
        opacity: 1;
        background: rgba(76, 175, 80, 0.1);
        border: 2px solid #4caf50;
    }
    
    .progress-steps .step.complete .step-icon {
        color: #4caf50;
    }
    
    .step-icon {
        font-size: 2em;
        transition: transform 0.3s ease;
    }
    
    .progress-steps .step.active .step-icon {
        animation: bounce 1s infinite;
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    
    .step-label {
        font-size: 0.85em;
        font-weight: 600;
        color: var(--text-secondary, #666);
        text-align: center;
    }
    
    .progress-steps .step.active .step-label,
    .progress-steps .step.complete .step-label {
        color: var(--text-primary, #212121);
    }
    
    /* 반응형 */
    @media (max-width: 768px) {
        .download-progress-modal {
            width: 95%;
            padding: 0;
        }
        
        .download-progress-modal .modal-header {
            padding: 20px;
        }
        
        .download-progress-modal .modal-header h3 {
            font-size: 1.2em;
        }
        
        .download-progress-modal .modal-body {
            padding: 20px;
        }
        
        .progress-steps {
            gap: 5px;
        }
        
        .progress-steps .step {
            padding: 10px 5px;
        }
        
        .step-icon {
            font-size: 1.5em;
        }
        
        .step-label {
            font-size: 0.75em;
        }
    }
    
    @media (max-width: 480px) {
        .progress-steps {
            flex-wrap: wrap;
        }
        
        .progress-steps .step {
            min-width: calc(33.333% - 5px);
        }
    }
`;

document.head.appendChild(style);

// ============================================
// [섹션 3: Export]
// ============================================

export default DownloadProgress;
