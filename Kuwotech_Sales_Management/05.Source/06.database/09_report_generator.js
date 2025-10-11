/**
 * KUWOTECH 영업관리 시스템 - 보고서 생성 모듈 (Railway MySQL)
 * Created by: Daniel.K
 * Date: 2025-09-27
 * Description: 보고서 생성, 편집, PDF 출력 기능
 *
 * Railway MySQL REST API를 사용하여 보고서 관리
 */

// ============================================
// [섹션: Import]
// ============================================

import { getDB } from './01_database_manager.js';
import { formatDate, formatCurrency, formatNumber } from '../01.common/03_format.js';
import { showToast, showModal, showLoading, hideLoading } from '../01.common/10_index.js';
import GlobalConfig from '../01.common/00_global_config.js';
import logger from '../01.common/23_logger.js';

// ============================================
// [섹션: 보고서 템플릿]
// ============================================

const REPORT_TEMPLATES = {
    visit: {
        name: '방문보고서',
        icon: 'fas fa-user-tie',
        fields: [
            { key: 'visitDate', label: '방문일자', type: 'date', required: true },
            { key: 'visitTime', label: '방문시간', type: 'time', required: true },
            { key: 'companyName', label: '거래처명', type: 'text', required: true },
            { key: 'visitor', label: '방문자', type: 'text', required: true },
            { key: 'interviewee', label: '면담자', type: 'text', required: true },
            { key: 'visitPurpose', label: '방문목적', type: 'select', options: ['정기방문', '신규개척', '클레임처리', '계약협의', '기타'], required: true },
            { key: 'interviewContent', label: '면담내용', type: 'textarea', required: true },
            { key: 'followUpAction', label: '후속조치', type: 'textarea' },
            { key: 'expectedSales', label: '예상매출', type: 'number' },
            { key: 'expectedDate', label: '예상시기', type: 'date' }
        ]
    },
    
    monthly: {
        name: '월간보고서',
        icon: 'fas fa-calendar-alt',
        fields: [
            { key: 'reportMonth', label: '보고월', type: 'month', required: true },
            { key: 'totalVisits', label: '총 방문횟수', type: 'number', readonly: true },
            { key: 'newCompanies', label: '신규거래처', type: 'number', readonly: true },
            { key: 'monthlySales', label: '월매출', type: 'number', readonly: true },
            { key: 'monthlyCollection', label: '월수금', type: 'number', readonly: true },
            { key: 'achievement', label: '목표달성률', type: 'percent', readonly: true },
            { key: 'mainActivities', label: '주요활동', type: 'textarea', required: true },
            { key: 'nextMonthPlan', label: '차월계획', type: 'textarea', required: true }
        ]
    }
};

// ============================================
// [섹션: 보고서 생성]
// ============================================
/**
 * [기능: 보고서 생성 모달]
 */
export async function showReportGeneratorModal(type = 'visit') {
    const template = REPORT_TEMPLATES[type];
    
    if (!template) {
        showToast('잘못된 보고서 유형입니다', 'error');
        return;
    }
    
    const modalContent = `
        <div class="report-generator">
            <h2 class="modal-title">
                <i class="${template.icon}"></i> ${template.name} 작성
            </h2>
            
            <form id="reportForm" class="report-form">
                ${template.fields.map(field => createFormField(field)).join('')}
            </form>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" id="btnCancel">
                    <i class="fas fa-times"></i> 취소
                </button>
                <button type="button" class="btn btn-info" id="btnPreview">
                    <i class="fas fa-eye"></i> 미리보기
                </button>
                <button type="submit" class="btn btn-primary" id="btnSave">
                    <i class="fas fa-save"></i> 저장
                </button>
            </div>
        </div>
    `;
    
    const modal = await showModal({
        title: template.name,
        content: modalContent,
        width: '700px',
        showClose: true
    });
    
    setupReportFormHandlers(modal, type);
}

/**
 * [기능: 폼 필드 생성]
 */
function createFormField(field) {
    const required = field.required ? 'required' : '';
    const readonly = field.readonly ? 'readonly' : '';
    
    switch (field.type) {
        case 'text':
        case 'date':
        case 'time':
        case 'month':
        case 'number':
            return `
                <div class="form-group">
                    <label for="${field.key}">${field.label}</label>
                    <input type="${field.type}" 
                           id="${field.key}" 
                           name="${field.key}"
                           class="form-control" 
                           ${required} 
                           ${readonly}>
                </div>
            `;
            
        case 'textarea':
            return `
                <div class="form-group">
                    <label for="${field.key}">${field.label}</label>
                    <textarea id="${field.key}" 
                              name="${field.key}"
                              class="form-control" 
                              rows="4"
                              ${required}
                              ${readonly}></textarea>
                </div>
            `;
            
        case 'select':
            return `
                <div class="form-group">
                    <label for="${field.key}">${field.label}</label>
                    <select id="${field.key}" 
                            name="${field.key}"
                            class="form-control" 
                            ${required}>
                        <option value="">선택하세요</option>
                        ${field.options.map(opt => 
                            `<option value="${opt}">${opt}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
            
        case 'percent':
            return `
                <div class="form-group">
                    <label for="${field.key}">${field.label}</label>
                    <div class="input-group">
                        <input type="number" 
                               id="${field.key}" 
                               name="${field.key}"
                               class="form-control" 
                               ${readonly}>
                        <span class="input-addon">%</span>
                    </div>
                </div>
            `;
            
        default:
            return '';
    }
}

/**
 * [기능: 보고서 폼 이벤트 핸들러]
 */
function setupReportFormHandlers(modal, type) {
    const form = document.getElementById('reportForm');
    const btnCancel = document.getElementById('btnCancel');
    const btnPreview = document.getElementById('btnPreview');
    const btnSave = document.getElementById('btnSave');
    
    // 취소
    btnCancel.onclick = () => modal.close();
    
    // 미리보기
    btnPreview.onclick = async () => {
        const formData = new FormData(form);
        const reportData = Object.fromEntries(formData);
        
        await showReportPreview(reportData, type);
    };
    
    // 저장
    btnSave.onclick = async (e) => {
        e.preventDefault();
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const reportData = Object.fromEntries(formData);
        
        await saveReport(reportData, type);
        modal.close();
    };
}

// ============================================
// [섹션: 보고서 저장]
// ============================================

/**
 * [기능: 보고서 저장]
 * Railway MySQL REST API를 사용하여 보고서 저장
 */
async function saveReport(data, type) {
    showLoading('보고서 저장 중...');

    try {
        const db = await getDB();

        const report = {
            ...data,
            type: type,
            reportId: generateReportId(),
            createdAt: new Date().toISOString(),
            createdBy: getCurrentUser(),
            status: 'draft'
        };

        // REST API를 통해 보고서 생성
        await db.createReport(report);

        showToast('보고서가 저장되었습니다', 'success');

        // 목록 새로고침
        if (typeof window.loadReportList === 'function') {
            window.loadReportList();
        }

    } catch (error) {
        logger.error('[보고서 저장 실패]:', error);
        showToast('보고서 저장 실패: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// [섹션: 보고서 미리보기]
// ============================================

/**
 * [기능: 보고서 미리보기]
 */
async function showReportPreview(data, type) {
    const template = REPORT_TEMPLATES[type];
    
    const previewContent = `
        <div class="report-preview">
            <div class="report-header">
                <img src="../../02.Fonts_Logos/logo.png" alt="KUWOTECH" class="report-logo">
                <h1>${template.name}</h1>
                <p class="report-date">작성일: ${formatDate(new Date())}</p>
            </div>
            
            <div class="report-body">
                ${template.fields.map(field => `
                    <div class="report-field">
                        <label>${field.label}:</label>
                        <span>${formatReportValue(data[field.key], field.type)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="report-footer">
                <p>작성자: ${getCurrentUser()}</p>
                <p>KUWOTECH 영업관리 시스템</p>
            </div>
        </div>
    `;
    
    const modal = await showModal({
        title: '보고서 미리보기',
        content: previewContent,
        width: '800px',
        buttons: [
            {
                text: 'PDF 다운로드',
                class: 'btn-primary',
                action: () => generatePDF(data, type)
            },
            {
                text: '닫기',
                class: 'btn-secondary',
                action: 'close'
            }
        ]
    });
}

// ============================================
// [섹션: PDF 생성]
// ============================================

/**
 * [기능: PDF 생성]
 */
async function generatePDF(data, type) {
    showLoading('PDF 생성 중...');
    
    try {
        // jsPDF 라이브러리 사용
        const { jsPDF } = window.jspdf;
        
        const doc = new jsPDF();
        const template = REPORT_TEMPLATES[type];
        
        // 헤더
        doc.setFontSize(20);
        doc.text(template.name, 105, 20, { align: 'center' });
        
        // 내용
        let yPos = 40;
        doc.setFontSize(12);
        
        template.fields.forEach(field => {
            const value = formatReportValue(data[field.key], field.type);
            doc.text(`${field.label}: ${value}`, 20, yPos);
            yPos += 10;
            
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });
        
        // 푸터
        doc.setFontSize(10);
        doc.text('KUWOTECH 영업관리 시스템', 105, 280, { align: 'center' });
        
        // 저장
        const fileName = `${template.name}_${formatDate(new Date(), 'YYYYMMDD')}.pdf`;
        doc.save(fileName);
        
        showToast('PDF가 생성되었습니다', 'success');
        
    } catch (error) {
        logger.error('[PDF 생성 실패]:', error);
        showToast('PDF 생성 실패', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// [섹션: 유틸리티 함수]
// ============================================

/**
 * [기능: 보고서 ID 생성]
 */
function generateReportId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `RPT_${timestamp}_${random}`.toUpperCase();
}

/**
 * [기능: 현재 사용자 정보]
 */
function getCurrentUser() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.userName || 'SYSTEM';
}

/**
 * [기능: 보고서 값 포맷]
 */
function formatReportValue(value, type) {
    if (!value) return '-';
    
    switch (type) {
        case 'number':
            return formatNumber(value);
        case 'percent':
            return `${value}%`;
        case 'date':
            return formatDate(value);
        default:
            return value;
    }
}

// ============================================
// [섹션: 초기화]
// ============================================

/**
 * [기능: 보고서 생성기 초기화]
 */
export function initReportGenerator() {
    
    // 전역 함수 등록
    window.KUWOTECH_REPORT = {
        showGenerator: showReportGeneratorModal,
        generatePDF: generatePDF,
        templates: REPORT_TEMPLATES
    };
}

// 자동 초기화
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initReportGenerator);
}

export default {
    showReportGeneratorModal,
    generatePDF,
    initReportGenerator,
    REPORT_TEMPLATES
};
