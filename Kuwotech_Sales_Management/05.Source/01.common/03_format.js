/**
 * 포맷팅 시스템 - KUWOTECH 영업관리 시스템
 * 숫자, 날짜, 전화번호 등 한국식 포맷 지원
 */

class FormatManager {
    constructor() {
        this.locale = 'ko-KR';
        this.currency = 'KRW';
        this.timezone = 'Asia/Seoul';
    }

    // ==================== 숫자 포맷팅 ====================
    
    /**
     * 천단위 구분 기호가 있는 숫자 포맷
     * @param {number} value - 포맷할 숫자
     * @param {boolean} useParentheses - 음수를 괄호로 표시 (회계 기준)
     * @returns {string|object} - "1,234,567" 또는 { text: "(1,234)", isNegative: true }
     */
    formatNumber(value, useParentheses = false) {
        if (value == null || isNaN(value)) return '0';

        const isNegative = value < 0;
        const absValue = Math.abs(value);
        const formatted = new Intl.NumberFormat(this.locale).format(absValue);

        if (useParentheses && isNegative) {
            return {
                text: `(${formatted})`,
                isNegative: true,
                className: 'text-negative'
            };
        }

        return isNegative ? `-${formatted}` : formatted;
    }

    /**
     * 통화 포맷
     * @param {number} value - 포맷할 금액
     * @param {boolean} useParentheses - 음수를 괄호로 표시 (회계 기준)
     * @returns {string|object} - "₩1,234,567" 또는 { text: "(₩1,234)", isNegative: true }
     */
    formatCurrency(value, useParentheses = false) {
        if (value == null || isNaN(value)) return '₩0';

        const isNegative = value < 0;
        const absValue = Math.abs(value);
        const formatted = new Intl.NumberFormat(this.locale, {
            style: 'currency',
            currency: this.currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(absValue);

        if (useParentheses && isNegative) {
            return {
                text: `(${formatted})`,
                isNegative: true,
                className: 'text-negative'
            };
        }

        return isNegative ? `-${formatted}` : formatted;
    }

    /**
     * 백분율 포맷
     * @param {number} value - 포맷할 비율 (0.85 = 85%)
     * @param {number} decimals - 소수점 자릿수
     * @param {boolean} useParentheses - 음수를 괄호로 표시 (회계 기준)
     * @returns {string|object} - "85.23%" 또는 { text: "(25.23%)", isNegative: true }
     */
    formatPercent(value, decimals = 2, useParentheses = false) {
        if (value == null || isNaN(value)) return '0%';

        const isNegative = value < 0;
        const absValue = Math.abs(value);
        const formatted = new Intl.NumberFormat(this.locale, {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(absValue);

        if (useParentheses && isNegative) {
            return {
                text: `(${formatted})`,
                isNegative: true,
                className: 'text-negative'
            };
        }

        return isNegative ? `-${formatted}` : formatted;
    }

    /**
     * 숫자를 한글로 변환
     * @param {number} value - 변환할 숫자
     * @returns {string} - "일천이백삼십사만오천육백칠십팔"
     */
    formatNumberKorean(value) {
        if (value == null || isNaN(value)) return '영';
        
        const units = ['', '만', '억', '조'];
        const nums = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
        const positions = ['', '십', '백', '천'];
        
        let result = '';
        let unitIndex = 0;
        
        while (value > 0) {
            const part = value % 10000;
            if (part > 0) {
                let partStr = '';
                let partValue = part;
                let posIndex = 0;
                
                while (partValue > 0) {
                    const digit = partValue % 10;
                    if (digit > 0) {
                        if (digit === 1 && posIndex > 0) {
                            partStr = positions[posIndex] + partStr;
                        } else {
                            partStr = nums[digit] + positions[posIndex] + partStr;
                        }
                    }
                    partValue = Math.floor(partValue / 10);
                    posIndex++;
                }
                
                result = partStr + units[unitIndex] + result;
            }
            
            value = Math.floor(value / 10000);
            unitIndex++;
        }
        
        return result || '영';
    }

    /**
     * 금액을 읽기 쉬운 형태로 변환
     * @param {number} value - 포맷할 금액
     * @param {boolean} useParentheses - 음수를 괄호로 표시 (회계 기준)
     * @returns {string|object} - "1,234만원" 또는 { text: "(12.3억원)", isNegative: true }
     */
    formatCompactCurrency(value, useParentheses = false) {
        if (value == null || isNaN(value)) return '0원';

        const isNegative = value < 0;
        const absValue = Math.abs(value);
        let formatted;

        if (absValue >= 100000000) { // 1억 이상
            formatted = (absValue / 100000000).toFixed(1).replace(/\.0$/, '') + '억원';
        } else if (absValue >= 10000) { // 1만 이상
            formatted = Math.floor(absValue / 10000).toLocaleString() + '만원';
        } else {
            const currencyResult = this.formatCurrency(absValue, false);
            formatted = typeof currencyResult === 'object' ? currencyResult.text : currencyResult;
        }

        if (useParentheses && isNegative) {
            return {
                text: `(${formatted})`,
                isNegative: true,
                className: 'text-negative'
            };
        }

        return isNegative ? `-${formatted}` : formatted;
    }

    // ==================== 날짜 포맷팅 ====================
    
    /**
     * 날짜 기본 포맷 (YYYY-MM-DD)
     * @param {Date|string} date - 포맷할 날짜
     * @returns {string} - "2025-01-27"
     */
    formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * 한국식 날짜 포맷
     * @param {Date|string} date - 포맷할 날짜
     * @returns {string} - "2025년 1월 27일"
     */
    formatDateKorean(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        return new Intl.DateTimeFormat(this.locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(d);
    }

    /**
     * 날짜와 시간 포맷
     * @param {Date|string} date - 포맷할 날짜
     * @returns {string} - "2025-01-27 14:30:45"
     */
    formatDateTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        return `${this.formatDate(d)} ${this.formatTime(d)}`;
    }

    /**
     * 시간 포맷
     * @param {Date|string} date - 포맷할 날짜
     * @returns {string} - "14:30:45"
     */
    formatTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * 상대 시간 포맷
     * @param {Date|string} date - 포맷할 날짜
     * @returns {string} - "3일 전", "2시간 전", "방금"
     */
    formatRelativeTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        
        const now = new Date();
        const diff = now - d;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);
        
        if (years > 0) return `${years}년 전`;
        if (months > 0) return `${months}개월 전`;
        if (days > 0) return `${days}일 전`;
        if (hours > 0) return `${hours}시간 전`;
        if (minutes > 0) return `${minutes}분 전`;
        if (seconds > 10) return `${seconds}초 전`;
        return '방금';
    }

    /**
     * 날짜 범위 포맷
     * @param {Date|string} startDate - 시작 날짜
     * @param {Date|string} endDate - 종료 날짜
     * @returns {string} - "2025년 1월 1일 ~ 1월 31일"
     */
    formatDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
        
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        const startMonth = start.getMonth() + 1;
        const endMonth = end.getMonth() + 1;
        const startDay = start.getDate();
        const endDay = end.getDate();
        
        if (startYear === endYear && startMonth === endMonth) {
            return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endDay}일`;
        } else if (startYear === endYear) {
            return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
        } else {
            return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endYear}년 ${endMonth}월 ${endDay}일`;
        }
    }

    // ==================== 문자열 포맷팅 ====================
    
    /**
     * 전화번호 포맷
     * @param {string} phone - 포맷할 전화번호
     * @returns {string} - "010-1234-5678"
     */
    formatPhone(phone) {
        if (!phone) return '-';
        
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 11) { // 010-1234-5678
            return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (cleaned.length === 10) {
            if (cleaned.startsWith('02')) { // 02-1234-5678
                return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
            } else { // 031-123-4567
                return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
            }
        } else if (cleaned.length === 9) { // 02-123-4567
            return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        
        return phone;
    }

    /**
     * 사업자번호 포맷
     * @param {string} businessNumber - 포맷할 사업자번호
     * @returns {string} - "123-45-67890"
     */
    formatBusinessNumber(businessNumber) {
        if (!businessNumber) return '-';
        
        const cleaned = businessNumber.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
        }
        
        return businessNumber;
    }

    /**
     * 우편번호 포맷
     * @param {string} zipCode - 포맷할 우편번호
     * @returns {string} - "12345"
     */
    formatZipCode(zipCode) {
        if (!zipCode) return '-';
        
        const cleaned = zipCode.replace(/\D/g, '');
        
        if (cleaned.length === 5) {
            return cleaned;
        } else if (cleaned.length === 6) { // 구 우편번호
            return cleaned.replace(/(\d{3})(\d{3})/, '$1-$2');
        }
        
        return zipCode;
    }

    /**
     * 이름 마스킹
     * @param {string} name - 마스킹할 이름
     * @returns {string} - "홍*동"
     */
    maskName(name) {
        if (!name || name.length < 2) return name;
        
        if (name.length === 2) {
            return name[0] + '*';
        } else {
            const first = name[0];
            const last = name[name.length - 1];
            const middle = '*'.repeat(name.length - 2);
            return first + middle + last;
        }
    }

    /**
     * 전화번호 마스킹
     * @param {string} phone - 마스킹할 전화번호
     * @returns {string} - "010-****-5678"
     */
    maskPhone(phone) {
        const formatted = this.formatPhone(phone);
        if (formatted === '-') return '-';
        
        return formatted.replace(/(\d{2,3})-(\d{3,4})-(\d{4})/, '$1-****-$3');
    }

    /**
     * 이메일 마스킹
     * @param {string} email - 마스킹할 이메일
     * @returns {string} - "h****@example.com"
     */
    maskEmail(email) {
        if (!email || !email.includes('@')) return email;
        
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 2) {
            return localPart + '@' + domain;
        }
        
        const first = localPart[0];
        const masked = '****';
        return first + masked + '@' + domain;
    }

    // ==================== 파일 포맷팅 ====================
    
    /**
     * 파일 크기 포맷
     * @param {number} bytes - 바이트 크기
     * @returns {string} - "1.23 MB"
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ==================== 유틸리티 ====================
    
    /**
     * 빈 값 처리
     * @param {any} value - 확인할 값
     * @param {string} defaultValue - 기본값
     * @returns {string}
     */
    formatEmpty(value, defaultValue = '-') {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        return value;
    }

    /**
     * 부울 값 포맷
     * @param {boolean} value - 포맷할 부울 값
     * @returns {string} - "예" 또는 "아니오"
     */
    formatBoolean(value) {
        return value ? '예' : '아니오';
    }

    /**
     * 상태 포맷
     * @param {string} status - 상태 값
     * @returns {string} - 한글 상태
     */
    formatStatus(status) {
        const statusMap = {
            'active': '활성',
            'inactive': '비활성',
            'pending': '대기중',
            'completed': '완료',
            'cancelled': '취소',
            'approved': '승인',
            'rejected': '거절',
            'draft': '임시저장',
            'published': '게시됨'
        };
        
        return statusMap[status] || status;
    }

    /**
     * 성별 포맷
     * @param {string} gender - 성별 (M/F)
     * @returns {string} - "남성" 또는 "여성"
     */
    formatGender(gender) {
        const genderMap = {
            'M': '남성',
            'F': '여성',
            'male': '남성',
            'female': '여성',
            '남': '남성',
            '여': '여성'
        };
        
        return genderMap[gender] || gender;
    }

    // ==================== 날짜 검증 ====================
    
    /**
     * 날짜 값 유효성 검사 (엑셀 날짜 포함)
     * @param {any} dateValue - 검사할 날짜 값
     * @returns {boolean} - 유효한 날짜인지 여부
     */
    isValidDateValue(dateValue) {
        if (!dateValue) return true; // 빈 값은 허용
        
        // 1. 숫자 타입 (엑셀 시리얼 날짜)
        if (typeof dateValue === 'number') {
            // 엑셀 시리얼 날짜는 1~100000 범위
            return dateValue > 0 && dateValue < 100000;
        }
        
        // 2. Date 객체
        if (dateValue instanceof Date) {
            return !isNaN(dateValue.getTime());
        }
        
        // 3. 문자열
        const str = String(dateValue).trim();
        if (!str) return true; // 빈 문자열 허용
        
        // JavaScript Date로 파싱 시도
        const testDate = new Date(str);
        if (!isNaN(testDate.getTime())) {
            return true;
        }
        
        // 다양한 날짜 패턴 매칭
        const patterns = [
            /^\d{4}-\d{1,2}-\d{1,2}$/,       // YYYY-MM-DD, YYYY-M-D
            /^\d{4}\/\d{1,2}\/\d{1,2}$/,     // YYYY/MM/DD, YYYY/M/D
            /^\d{4}\.\d{1,2}\.\d{1,2}$/,     // YYYY.MM.DD, YYYY.M.D
            /^\d{1,2}-\d{1,2}-\d{4}$/,       // MM-DD-YYYY, M-D-YYYY
            /^\d{1,2}\/\d{1,2}\/\d{4}$/,     // MM/DD/YYYY, M/D/YYYY
            /^\d{8}$/,                       // YYYYMMDD
            /^\d{4}$/,                       // YYYY
            /^\d{4}-\d{2}$/,                 // YYYY-MM
        ];
        
        // 패턴 매칭 확인
        if (patterns.some(pattern => pattern.test(str))) {
            return true;
        }
        
        // 한글 날짜 형식 (예: 2023년 12월 31일)
        if (/\d{4}년/.test(str) || /\d+월/.test(str) || /\d+일/.test(str)) {
            return true;
        }
        
        // 그 외의 경우는 경고로 처리 (오류가 아님)
        return false;
    }
    
    /**
     * 문자열 날짜 형식 검사
     * @param {string} dateStr - 검사할 날짜 문자열
     * @returns {boolean} - 유효한 날짜 형식인지 여부
     */
    isValidDateString(dateStr) {
        if (!dateStr) return true; // 빈 값은 허용
        
        return this.isValidDateValue(dateStr);
    }
}

// 싱글톤 인스턴스
const formatManager = new FormatManager();

// 개별 함수 export (편의성)
export const formatNumber = (value, useParentheses) => formatManager.formatNumber(value, useParentheses);
export const formatCurrency = (value, useParentheses) => formatManager.formatCurrency(value, useParentheses);
export const formatPercent = (value, decimals, useParentheses) => formatManager.formatPercent(value, decimals, useParentheses);
export const formatNumberKorean = (value) => formatManager.formatNumberKorean(value);
export const formatCompactCurrency = (value, useParentheses) => formatManager.formatCompactCurrency(value, useParentheses);
export const formatDate = (date) => formatManager.formatDate(date);
export const formatDateKorean = (date) => formatManager.formatDateKorean(date);
export const formatDateTime = (date) => formatManager.formatDateTime(date);
export const formatTime = (date) => formatManager.formatTime(date);
export const formatRelativeTime = (date) => formatManager.formatRelativeTime(date);
export const formatDateRange = (start, end) => formatManager.formatDateRange(start, end);
export const formatPhone = (phone) => formatManager.formatPhone(phone);
export const formatBusinessNumber = (bn) => formatManager.formatBusinessNumber(bn);
export const formatZipCode = (zip) => formatManager.formatZipCode(zip);
export const maskName = (name) => formatManager.maskName(name);
export const maskPhone = (phone) => formatManager.maskPhone(phone);
export const maskEmail = (email) => formatManager.maskEmail(email);
export const formatFileSize = (bytes) => formatManager.formatFileSize(bytes);
export const formatEmpty = (value, def) => formatManager.formatEmpty(value, def);
export const formatBoolean = (value) => formatManager.formatBoolean(value);
export const formatStatus = (status) => formatManager.formatStatus(status);
export const formatGender = (gender) => formatManager.formatGender(gender);
export const isValidDateValue = (value) => formatManager.isValidDateValue(value);
export const isValidDateString = (str) => formatManager.isValidDateString(str);

// 전역 노출
window.Format = formatManager;

export { formatManager };
export default formatManager;