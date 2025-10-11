/**
 * ============================================
 * AmountFormatter Component
 * ============================================
 * 금액 입력 필드의 자동 포맷팅 기능을 제공하는 유틸리티 컴포넌트
 *
 * 기능:
 * - 숫자 입력 시 자동으로 천 단위 쉼표 추가
 * - 커서 위치 유지 (쉼표 추가/제거 시에도 자연스러운 입력 경험)
 * - 포커스 시 자동 포맷팅 적용
 *
 * 사용법:
 * ```javascript
 * import { bindAmountFormatting } from '../../08.components/09_amount_formatter.js';
 *
 * const inputElement = document.getElementById('amountInput');
 * bindAmountFormatting(inputElement);
 * ```
 */

/**
 * 숫자 문자열을 천 단위 쉼표 형식으로 변환
 * @param {string|number} value - 포맷팅할 값
 * @returns {string} 쉼표가 추가된 숫자 문자열
 * @example
 * formatWithCommas('1000') // '1,000'
 * formatWithCommas('1234567') // '1,234,567'
 */
export function formatWithCommas(value) {
    const numericValue = String(value).replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 금액 입력 필드에 자동 포맷팅 이벤트 바인딩
 * @param {HTMLInputElement} inputElement - 포맷팅을 적용할 입력 필드
 * @returns {void}
 *
 * @description
 * - input 이벤트: 입력 시 실시간 포맷팅 및 커서 위치 유지
 * - focus 이벤트: 포커스 시 기존 값 재포맷팅
 *
 * @example
 * const amountInput = document.getElementById('amount');
 * bindAmountFormatting(amountInput);
 */
export function bindAmountFormatting(inputElement) {
    if (!inputElement) {
        console.warn('[AmountFormatter] 유효하지 않은 입력 요소입니다');
        return;
    }

    // input 이벤트: 실시간 포맷팅
    inputElement.addEventListener('input', (e) => {
        const cursorPosition = e.target.selectionStart;
        const oldValue = e.target.value;
        const oldLength = oldValue.length;

        // 포맷팅 적용
        const formattedValue = formatWithCommas(oldValue);
        e.target.value = formattedValue;

        // 커서 위치 조정 (쉼표 추가/제거 시 커서 위치 유지)
        const newLength = formattedValue.length;
        const diff = newLength - oldLength;
        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
    });

    // focus 이벤트: 포커스 시 기존 값 포맷팅
    inputElement.addEventListener('focus', (e) => {
        if (e.target.value) {
            e.target.value = formatWithCommas(e.target.value);
        }
    });
}

/**
 * 포맷된 금액 문자열을 숫자로 변환
 * @param {string} formattedValue - 쉼표가 포함된 금액 문자열
 * @returns {number} 숫자로 변환된 값
 * @example
 * parseAmount('1,234,567') // 1234567
 * parseAmount('') // 0
 */
export function parseAmount(formattedValue) {
    const numericValue = String(formattedValue).replace(/[^\d]/g, '');
    return parseFloat(numericValue) || 0;
}

/**
 * AmountFormatter를 전역 객체로 노출 (window.AmountFormatter)
 * ES6 모듈을 지원하지 않는 환경에서 사용 가능
 */
if (typeof window !== 'undefined') {
    window.AmountFormatter = {
        bind: bindAmountFormatting,
        format: formatWithCommas,
        parse: parseAmount
    };
}
