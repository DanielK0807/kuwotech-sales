/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - 관리자 대시보드
 * 파일: 02_dashboard.js
 * Created by: Daniel.K
 * Date: 2025-01-28
 *
 * [NAVIGATION: 파일 개요]
 * - 관리자 KPI 카드를 표시하는 대시보드 페이지
 * - 글래스모피즘 3D 효과를 적용한 KPI 카드 컴포넌트 사용
 * - 14개 KPI를 4개 섹션으로 그룹화
 * - 순위 모달 팝업 (전체매출기여도, 주요제품매출기여도)
 * ============================================
 */

// ============================================
// [SECTION: 공통 모듈 임포트]
// ============================================

import {
  GlobalConfig,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDate,
  formatDateTime,
  formatTime,
  showToast,
  showLoading,
  hideLoading,
  translateToKorean,
} from "../../01.common/20_common_index.js";

// 글래스모피즘 매니저 추가
import {
  glassmorphism,
  applyGlassmorphism,
  createGlassCard,
  createKPICard as createGlassKPICard,
  createGlassButton,
} from "../../01.common/07_design.js";

// KPI 카드 컴포넌트 추가
import { KPICard, KPIGrid } from "../../08.components/05_kpi_card.js";

// DatabaseManager 추가
import { DatabaseManager } from "../../06.database/01_database_manager.js";

// KPI Calculator 추가
import {
  formatKPIValue,
  formatAchievementRate,
} from "../../01.common/21_kpi_calculator.js";

// Logger 임포트
import logger from "../../01.common/23_logger.js";

// ErrorHandler 임포트
import errorHandler, {
  DatabaseError,
  NotFoundError,
} from "../../01.common/24_error_handler.js";

// ============================================
// [SECTION: 전역 변수]
// ============================================

const user = JSON.parse(sessionStorage.getItem("user") || "{}");
const dbManager = new DatabaseManager();
let dashboardData = null;
let refreshTimer = null; // 자동 새로고침 타이머 ID

// ============================================
// [SECTION: 유틸리티 함수]
// ============================================

// formatTime과 formatDateTime은 03_format.js에서 import하여 사용

// ============================================
// [SECTION: 초기화]
// ============================================

// 초기화 플래그
let isInitialized = false;

async function initDashboard() {
  // 중복 초기화 방지
  if (isInitialized) {
    return;
  }

  try {
    showLoading("대시보드 데이터를 불러오는 중...");

    // 글래스모피즘 시스템 초기화
    if (glassmorphism && typeof glassmorphism.init === "function") {
      glassmorphism.init();
    }

    // 새로고침 버튼 이벤트 리스너 등록
    const btnRefresh = document.getElementById("btnRefreshKPI");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", refreshDashboard);
    }

    // KPI 재계산 완료 이벤트 리스너 등록
    document.addEventListener("kpi-recalculated", async () => {
      console.log(
        "📊 [Admin Dashboard] KPI 재계산 완료 이벤트 수신 - 대시보드를 갱신합니다."
      );
      await refreshDashboard();
    });

    // 대시보드 데이터 로드
    try {
      await loadDashboardData();
    } catch (error) {
      await errorHandler.handle(
        new DatabaseError("관리자 대시보드 데이터 로드 실패", error, {
          userMessage:
            "KPI 데이터를 불러올 수 없습니다. 빈 데이터로 표시합니다.",
          context: {
            module: "admin_dashboard",
            action: "initDashboard",
            fallback: "emptyData",
          },
          severity: "MEDIUM",
        }),
        { showToUser: false }
      );
      // 데이터 로드 실패 시 빈 객체로 초기화
      dashboardData = createEmptyKPIData();
    }

    // KPI 카드 표시 (글래스모피즘 적용) - 데이터 유무와 관계없이 표시
    displayKPICardsWithGlass();

    // 자동 새로고침 설정 (5분마다) - 타이머 ID 저장
    refreshTimer = setInterval(refreshDashboard, 300000);

    hideLoading();
    isInitialized = true;
  } catch (error) {
    await errorHandler.handle(
      new DatabaseError("관리자 대시보드 초기화 실패", error, {
        userMessage: "대시보드 로드 중 오류가 발생했습니다.",
        context: {
          module: "admin_dashboard",
          action: "initDashboard",
          user: user?.name,
        },
        severity: "HIGH",
      }),
      { showToUser: true }
    );
    hideLoading();

    // 초기화 실패해도 빈 카드는 표시
    dashboardData = createEmptyKPIData();
    displayKPICardsWithGlass();
  }
}

/**
 * 빈 KPI 데이터 생성
 */
function createEmptyKPIData() {
  return {
    totalCompanies: 0,
    activeCompanies: 0,
    activationRate: 0,
    mainProductCompanies: 0,
    companyTargetAchievementRate: 0,
    majorCustomerTargetRate: 0,
    accumulatedSales: 0,
    accumulatedCollection: 0,
    accountsReceivable: 0,
    mainProductSales: 0,
    salesConcentration: 0,
    mainProductSalesRatio: 0,
  };
}

// ============================================
// [SECTION: 대시보드 데이터 로드]
// ============================================

async function loadDashboardData() {
  try {
    // 관리자 KPI 조회
    const response = await dbManager.request("/kpi/admin");

    if (response.success) {
      dashboardData = response.data;
    } else {
      throw new Error(response.message || "KPI 데이터 로드 실패");
    }
  } catch (error) {
    const dbError = new DatabaseError("KPI 데이터 로드 실패", error, {
      userMessage: "KPI 데이터를 불러오는 중 오류가 발생했습니다.",
      context: {
        module: "admin_dashboard",
        action: "loadDashboardData",
        endpoint: "/kpi/admin",
      },
      severity: "HIGH",
    });
    await errorHandler.handle(dbError, { showToUser: true });
    throw dbError;
  }
}

// ============================================
// [SECTION: KPI 카드 표시 헬퍼]
// ============================================

// ============================================
// [SECTION: KPI 카드 표시 - 4개 섹션으로 그룹화]
// ============================================

function displayKPICardsWithGlass() {
  if (!dashboardData) {
    logger.warn("[KPI 카드] 데이터가 없습니다. 빈 데이터로 표시합니다.");
    dashboardData = createEmptyKPIData();
  }

  // 섹션 1: 전사 거래처 지표 (4개)
  const section1Config = [
    {
      title: "전체 거래처",
      value: dashboardData.totalCompanies || 0,
      unit: "개사",
      icon: "🏢",
      formula: "전체 영업담당 불용제외 거래처 종합",
      style: { color: "primary", size: "md", animated: true },
    },
    {
      title: "활성 거래처",
      value: dashboardData.activeCompanies || 0,
      unit: "개사",
      icon: "✅",
      formula: "거래상태가 활성인 거래처 총합",
      style: { color: "success", size: "md", animated: true },
    },
    {
      title: "거래처 활성화율",
      value: dashboardData.activationRate || 0,
      unit: "%",
      icon: "📊",
      formula: "활성거래처 ÷ 전체거래처 × 100",
      style: { color: "info", size: "md", animated: true },
    },
    {
      title: "주요제품 판매 거래처",
      value: dashboardData.mainProductCompanies || 0,
      unit: "개사",
      icon: "⭐",
      formula: "주요제품을 구매한 거래처 총합",
      style: {
        color: "warning",
        size: "md",
        animated: true,
        highlighted: true,
      },
    },
  ];

  // 섹션 2: 전사 목표 달성 (2개)
  const section2Config = [
    {
      title: "회사배정기준 대비 달성율",
      value: (() => {
        const val = dashboardData.companyTargetAchievementRate || 0;
        const formatted = formatPercent(Math.abs(val) / 100, 2, false);
        return val >= 0 ? `${formatted} 초과배정` : `(${formatted}) 미달배정`;
      })(),
      unit: "",
      icon: "🎯",
      formula: "((전체거래처 ÷ (80 × 영업담당자수)) - 1) × 100",
      style: {
        color:
          (dashboardData.companyTargetAchievementRate || 0) >= 0
            ? "success"
            : "danger",
        size: "md",
        animated: true,
      },
    },
    {
      title: "주요고객처 목표 달성율",
      value: (() => {
        const val = dashboardData.majorCustomerTargetRate || 0;
        const formatted = formatPercent(Math.abs(val) / 100, 2, false);
        return val >= 0 ? `${formatted} 목표 초과` : `(${formatted}) 목표 미달`;
      })(),
      unit: "",
      icon: "🏆",
      formula: "((주요제품판매거래처 ÷ (40 × 영업담당자수)) - 1) × 100",
      style: {
        color:
          (dashboardData.majorCustomerTargetRate || 0) >= 0
            ? "success"
            : "danger",
        size: "md",
        animated: true,
      },
    },
  ];

  // 섹션 3: 전사 매출 지표 (6개)
  const section3Config = [
    {
      title: "누적 매출금액",
      value: dashboardData.accumulatedSales || 0,
      unit: "원",
      icon: "💰",
      formula: "∑(전체 영업담당 누적매출)",
      style: {
        color: "primary",
        size: "lg",
        animated: true,
        highlighted: true,
      },
    },
    {
      title: "누적 수금금액",
      value: dashboardData.accumulatedCollection || 0,
      unit: "원",
      icon: "💳",
      formula: "∑(전체 영업담당 누적수금)",
      style: { color: "success", size: "md", animated: true },
    },
    {
      title: "매출채권 잔액",
      value: dashboardData.accountsReceivable || 0,
      unit: "원",
      icon: "📋",
      formula: "전사 누적매출 - 전사 누적수금",
      style: { color: "warning", size: "md", animated: true },
    },
    {
      title: "주요제품 매출액",
      value: dashboardData.mainProductSales || 0,
      unit: "원",
      icon: "💎",
      formula: "∑(전체 영업담당 주요제품매출)",
      style: { color: "info", size: "md", animated: true },
    },
    {
      title: "매출 집중도",
      value: dashboardData.salesConcentration || 0,
      unit: "원",
      icon: "📈",
      formula: "(전사 누적매출금액 ÷ 전사 담당거래처) ÷ 현재월수",
      style: {
        color: "success",
        size: "md",
        animated: true,
        highlighted: true,
      },
    },
    {
      title: "주요제품 매출비율",
      value: dashboardData.mainProductSalesRatio || 0,
      unit: "%",
      icon: "📊",
      formula: "전사 주요제품매출 ÷ 전사 누적매출 × 100",
      style: { color: "info", size: "md", animated: true },
    },
  ];

  // 섹션 4: 전사 기여도 지표 (3개)
  const section4Config = [
    {
      title: "전체매출 기여도",
      value: "상세보기",
      unit: "",
      icon: "🌟",
      description: "영업담당자별 순위 보기",
      style: { color: "primary", size: "md", animated: true, clickable: true },
      onClick: () => showRankingModal("total"),
    },
    {
      title: "주요제품매출 기여도",
      value: "상세보기",
      unit: "",
      icon: "⭐",
      description: "영업담당자별 순위 보기",
      style: { color: "success", size: "md", animated: true, clickable: true },
      onClick: () => showRankingModal("main"),
    },
    {
      title: "매출집중도 상세",
      value: "상세보기",
      unit: "",
      icon: "📊",
      description: "매출집중도 상세 데이터 보기",
      style: { color: "info", size: "md", animated: true, clickable: true },
      onClick: () => showSalesConcentrationModal(),
    },
  ];
  // ...기존 코드...

  // 각 섹션 렌더링 (이 부분이 반드시 displayKPICardsWithGlass에서 실행되어야 함)
  renderKPISection("kpiSection1", section1Config);
  renderKPISection("kpiSection2", section2Config);
  renderKPISection("kpiSection3", section3Config);
  renderKPISection("kpiSection4", section4Config);
}

// ============================================
// [SECTION: 순위 및 상세 모달 함수들]
// ============================================

async function showSalesConcentrationModal() {
    try {
      showLoading("매출집중도 데이터를 불러오는 중...");
      // API에서 매출집중도 상세 데이터 조회 (영업담당자별 순위)
      const response = await dbManager.request(
        "/kpi/admin/sales-concentration/detail"
      );
      if (!response.success)
        throw new Error(response.message || "매출집중도 데이터 로드 실패");
      const details = response.data;

      // 영업담당자별 순위 테이블 생성
      const tableRows = details
        .map((row) => {
          // 매출집중도 값 포맷팅
          const concentrationFormatted = formatCurrency(row.salesConcentration);

          // 누적매출 포맷팅 (음수 규칙 적용)
          const salesResult = formatCurrency(row.accumulatedSales, true);
          let salesFormatted, salesClass = "";
          if (typeof salesResult === "object") {
            salesFormatted = salesResult.text;
            salesClass = salesResult.isNegative ? salesResult.className : "";
          } else {
            salesFormatted = salesResult;
          }

          return `
        <tr class="rank-${row.rank}">
          <td class="rank-number">${getRankBadge(row.rank)}</td>
          <td class="employee-name">${row.employeeName}</td>
          <td class="text-right">${concentrationFormatted}</td>
          <td class="text-right">${formatNumber(row.assignedCompanies)}</td>
          <td class="sales-amount ${salesClass}">${salesFormatted}</td>
          <td class="text-right">${formatNumber(row.currentMonths)}</td>
        </tr>
      `;
        })
        .join("");

      const modalHTML = `
      <div class="ranking-modal-overlay" id="rankingModal">
        <div class="ranking-modal-content glass-modal glass-layered glass-shimmer">
          <div class="ranking-modal-header bg-layer-2">
            <h2 class="text-on-layer-2">매출집중도 순위</h2>
            <p class="text-on-layer-2" style="font-size: 14px; margin-top: 8px; opacity: 0.9;">영업담당 인원: ${details.length}명</p>
            <button class="ranking-modal-close glass-button" onclick="closeRankingModal()">✕</button>
          </div>
          <div class="ranking-modal-body">
            <table class="ranking-table glass-panel">
              <thead>
                <tr class="bg-layer-3">
                  <th class="text-on-layer-3 text-center">순위</th>
                  <th class="text-on-layer-3 text-left">영업담당</th>
                  <th class="text-on-layer-3 text-right">매출집중도</th>
                  <th class="text-on-layer-3 text-right">담당거래처</th>
                  <th class="text-on-layer-3 text-right">누적매출</th>
                  <th class="text-on-layer-3 text-right">월수</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
      const modalDiv = document.createElement("div");
      modalDiv.innerHTML = modalHTML;
      document.body.appendChild(modalDiv.firstElementChild);
      hideLoading();
    } catch (error) {
      await errorHandler.handle(
        new DatabaseError("매출집중도 모달 로드 실패", error, {
          userMessage: "매출집중도 데이터를 불러오는 중 오류가 발생했습니다.",
          context: {
            module: "admin_dashboard",
            action: "showSalesConcentrationModal",
          },
          severity: "MEDIUM",
        }),
        { showToUser: true }
      );
      hideLoading();
    }
}

/**
 * KPI 섹션 렌더링 헬퍼
 */
function renderKPISection(sectionId, kpiConfig) {
    const container = document.getElementById(sectionId);
    if (!container) {
      // UI 요소 누락은 로그만 남기고 계속 진행
      logger.warn(`[KPI 섹션] ${sectionId} 컨테이너를 찾을 수 없습니다.`);
      return;
    }

    // ✅ FIX: KPIGrid 컴포넌트 대신 KPICard를 직접 생성하여 추가하는 방식으로 변경
    try {
      container.innerHTML = "";

      kpiConfig.forEach((cardConfig) => {
        const card = new KPICard(cardConfig);
        const cardElement = card.render();

        if (cardElement instanceof HTMLElement) {
          container.appendChild(cardElement);
        } else {
          logger.warn(
            `[KPI 카드] 렌더링 실패 - 잘못된 타입: ${typeof cardElement}`
          );
        }
      });

      // 카드 렌더링 완료 - 디버깅용 로그는 제거
      // console.log(`[KPI 섹션] ${sectionId} - ${kpiConfig.length}개 카드 렌더링 완료`);
    } catch (error) {
      logger.error(`[KPI 섹션] ${sectionId} 렌더링 실패:`, error.stack);
      errorHandler.handle(
        new NotFoundError(`KPI 섹션 렌더링 실패: ${sectionId}`, error, {
          userMessage: "카드를 표시할 수 없습니다.",
          context: {
            module: "admin_dashboard",
            action: "renderKPISection",
            sectionId,
            cardCount: kpiConfig?.length,
          },
          severity: "MEDIUM",
        }),
        { showToUser: false }
      );
      container.innerHTML = '<p style="color: red;">카드 렌더링 실패</p>';
    }
}

// ============================================
// [SECTION: 순위 모달]
// ============================================

/**
 * 영업담당자별 순위 모달 표시
 * @param {string} type - 'total' (전체매출) | 'main' (주요제품매출)
 */
async function showRankingModal(type) {
    try {
      showLoading("순위 데이터를 불러오는 중...");

      // 순위 데이터 조회
      const response = await dbManager.request(`/kpi/admin/ranking/${type}`);

      if (!response.success) {
        throw new Error(response.message || "순위 데이터 로드 실패");
      }

      const rankings = response.data;

      // 모달 HTML 생성
      const title =
        type === "total" ? "전체매출기여도 순위" : "주요제품매출기여도 순위";

      // 순위 데이터 매핑 (API 응답 구조에 맞춤, 음수 규칙 적용)
      // 누적기여도 계산을 위한 running sum
      let cumulativeContribution = 0;

      const tableRows = rankings
        .map((rank) => {
          const salesAmount =
            type === "total" ? rank.accumulatedSales : rank.mainProductSales;
          const contributionRate =
            type === "total"
              ? rank.totalSalesContribution
              : rank.mainProductContribution;

          // 누적기여도 계산 (1등부터 현재 순위까지의 합산)
          cumulativeContribution += contributionRate;

          // 음수 규칙 적용 - 매출액
          const currencyResult = formatCurrency(salesAmount, true);
          let salesFormatted,
            salesClass = "";
          if (typeof currencyResult === "object") {
            salesFormatted = currencyResult.text;
            salesClass = currencyResult.isNegative
              ? currencyResult.className
              : "";
          } else {
            salesFormatted = currencyResult;
          }

          // 음수 규칙 적용 - 기여도
          const contributionResult = formatPercent(
            contributionRate / 100,
            2,
            true
          );
          let contributionFormatted,
            contributionClass = "";
          if (typeof contributionResult === "object") {
            contributionFormatted = contributionResult.text;
            contributionClass = contributionResult.isNegative
              ? contributionResult.className
              : "";
          } else {
            contributionFormatted = contributionResult;
          }

          // 음수 규칙 적용 - 누적기여도
          const cumulativeResult = formatPercent(
            cumulativeContribution / 100,
            2,
            true
          );
          let cumulativeFormatted,
            cumulativeClass = "";
          if (typeof cumulativeResult === "object") {
            cumulativeFormatted = cumulativeResult.text;
            cumulativeClass = cumulativeResult.isNegative
              ? cumulativeResult.className
              : "";
          } else {
            cumulativeFormatted = cumulativeResult;
          }

          return `
                <tr class="rank-${rank.rank}">
                    <td class="rank-number">${getRankBadge(rank.rank)}</td>
                    <td class="employee-name">${rank.employeeName}</td>
                    <td class="sales-amount ${salesClass}">${salesFormatted}</td>
                    <td class="contribution-rate ${contributionClass}">${contributionFormatted}</td>
                    <td class="cumulative-contribution ${cumulativeClass}">${cumulativeFormatted}</td>
                </tr>
            `;
        })
        .join("");

      const modalHTML = `
            <div class="ranking-modal-overlay" id="rankingModal">
                <div class="ranking-modal-content glass-modal glass-layered glass-shimmer">
                    <div class="ranking-modal-header bg-layer-2">
                        <h2 class="text-on-layer-2">${title}</h2>
                        <p class="text-on-layer-2" style="font-size: 14px; margin-top: 8px; opacity: 0.9;">영업담당 인원: ${rankings.length}명</p>
                        <button class="ranking-modal-close glass-button" onclick="closeRankingModal()">✕</button>
                    </div>
                    <div class="ranking-modal-body">
                        <table class="ranking-table glass-panel">
                            <thead>
                                <tr class="bg-layer-3">
                                    <th class="text-on-layer-3 text-center">순위</th>
                                    <th class="text-on-layer-3 text-left">영업담당</th>
                                    <th class="text-on-layer-3 text-right">매출액</th>
                                    <th class="text-on-layer-3 text-right">기여도</th>
                                    <th class="text-on-layer-3 text-right">누적기여도</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

      // 모달 DOM에 추가
      const modalDiv = document.createElement("div");
      modalDiv.innerHTML = modalHTML;
      document.body.appendChild(modalDiv.firstElementChild);

      hideLoading();
    } catch (error) {
      await errorHandler.handle(
        new DatabaseError("순위 모달 로드 실패", error, {
          userMessage: "순위 데이터를 불러오는 중 오류가 발생했습니다.",
          context: {
            module: "admin_dashboard",
            action: "showRankingModal",
            type,
            endpoint: `/kpi/admin/ranking/${type}`,
          },
          severity: "MEDIUM",
        }),
        { showToUser: true }
      );
      hideLoading();
    }
}

/**
 * 순위 배지 생성
 */
function getRankBadge(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}위`;
}

/**
 * 순위 모달 닫기
 */
function closeRankingModal() {
  const modal = document.getElementById("rankingModal");
  if (modal) {
    modal.remove();
  }
}

// ============================================
// [SECTION: 대시보드 새로고침]
// ============================================

async function refreshDashboard() {
    try {
      // DOM이 존재하는지 확인 (다른 페이지로 이동했을 수 있음)
      const section1 = document.getElementById("kpiSection1");
      if (!section1) {
        return;
      }

      showLoading("데이터를 새로고침하는 중...");
      await loadDashboardData();
      displayKPICardsWithGlass();
      hideLoading();
      showToast("데이터가 새로고침되었습니다.", "success");
    } catch (error) {
      await errorHandler.handle(
        new DatabaseError("대시보드 새로고침 실패", error, {
          userMessage: "새로고침 중 오류가 발생했습니다.",
          context: {
            module: "admin_dashboard",
            action: "refreshDashboard",
          },
          severity: "LOW",
        }),
        { showToUser: true }
      );
      hideLoading();
    }
}

// 타이머 정리 함수
function cleanupDashboard() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  isInitialized = false;
}

// ============================================
// [SECTION: 전역 노출 (클릭 이벤트용)]
// ============================================

window.showRankingModal = showRankingModal;
window.closeRankingModal = closeRankingModal;
window.showSalesConcentrationModal = showSalesConcentrationModal;

// ============================================
// [SECTION: 이벤트 리스너]
// ============================================

// 페이지 로드 이벤트 리스닝 (admin_layout.js에서 발생)
window.addEventListener("pageLoaded", (e) => {
  if (e.detail && e.detail.page === "dashboard") {
    // 페이지 재진입 시 항상 정리 후 재초기화
    cleanupDashboard();
    initDashboard();
  }
});

// DOM이 이미 로드되었고 pageLoaded 이벤트가 발생하지 않은 경우에만 직접 초기화
if (document.readyState !== "loading") {
  // 100ms 대기 후 초기화되지 않았으면 실행
  setTimeout(() => {
    if (!isInitialized) {
      initDashboard();
    }
  }, 100);
}

// ============================================
// [SECTION: 전역 노출 (필요시 사용)]
// ============================================

// 전역으로 노출 (디버깅 및 외부 접근용)
window.dashboardModule = {
  initDashboard,
  refreshDashboard,
  cleanupDashboard,
  getDashboardData: () => dashboardData,
};

// 페이지 언로드 시 타이머 정리 (다른 페이지로 이동할 때)
window.addEventListener("beforePageChange", cleanupDashboard);

window.addEventListener("beforeunload", cleanupDashboard);
