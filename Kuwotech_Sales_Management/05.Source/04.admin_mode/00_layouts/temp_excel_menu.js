// [SECTION: 강정환 관리자 전용 메뉴 추가]
// ============================================

/**
 * 강정환 관리자 전용 엑셀 업로드 메뉴 표시
 */
function showExcelUploadMenu() {
    console.log('[메뉴 표시] 강정환 관리자 전용 엑셀 업로드 메뉴 표시');
    
    const excelMenu = document.getElementById('excel-upload-menu');
    if (!excelMenu) {
        console.error('[메뉴 표시] excel-upload-menu 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 메뉴 표시
    excelMenu.style.display = 'flex';
    
    console.log('[메뉴 표시] 엑셀 업로드 메뉴 표시 완료');
}
