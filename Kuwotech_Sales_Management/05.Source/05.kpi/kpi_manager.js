/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI 통합 관리자
 * 파일: kpi_manager.js
 * Created by: GitHub Copilot
 * Date: 2025-10-15
 *
 * [역할]
 * - 시스템 전체의 KPI 재계산 요청을 중앙에서 처리합니다.
 * - 데이터 변경이 발생했을 때 호출되어, 모든 관련 KPI를 다시 계산하고 캐시를 갱신합니다.
 * - 계산 과정의 시작과 끝을 로깅하여 추적성을 제공합니다.
 *
 * [주요 함수]
 * - triggerKpiRecalculation(): 외부에서 호출하는 유일한 공개 함수. KPI 재계산 프로세스를 시작합니다.
 * ============================================
 */

import logger from "../01.common/23_logger.js";
import { showToast } from "../01.common/14_toast.js";
import { calculateAllKpis } from "./01_kpi_calculator.js";
import { getCache, setCache } from "./05_cache.js";

class KpiManager {
  constructor() {
    this.isRecalculating = false; // 중복 실행 방지 플래그
  }

  /**
   * KPI 재계산 프로세스를 시작하는 유일한 진입점입니다.
   * 데이터가 변경되는 모든 곳에서 이 함수를 호출해야 합니다.
   * @param {object} options - 재계산 옵션 (예: { quiet: true }는 토스트 메시지를 띄우지 않음)
   */
  async triggerKpiRecalculation(options = {}) {
    if (this.isRecalculating) {
      logger.warn(
        "[KpiManager] 이미 KPI 재계산이 진행 중입니다. 이번 요청은 건너뜁니다."
      );
      if (!options.quiet) {
        showToast("이미 데이터 동기화가 진행 중입니다.", "info");
      }
      return;
    }

    this.isRecalculating = true;
    logger.log("🚀 [KpiManager] KPI 재계산 프로세스를 시작합니다...");
    if (!options.quiet) {
      showToast("데이터 변경이 감지되어 KPI를 동기화합니다...", "info", 3000);
    }

    try {
      // 1. 모든 KPI 데이터 계산 (영업, 관리자 등)
      const newKpiData = await calculateAllKpis();

      if (!newKpiData) {
        throw new Error("KPI 계산 결과가 유효하지 않습니다.");
      }

      // 2. 계산된 최신 데이터를 캐시에 저장
      // 'allKpiData' 라는 키로 전체 KPI 데이터를 저장한다고 가정합니다.
      await setCache("allKpiData", newKpiData);

      logger.log(
        "✅ [KpiManager] KPI 재계산 및 캐시 저장이 성공적으로 완료되었습니다."
      );
      if (!options.quiet) {
        showToast("KPI 동기화가 완료되었습니다!", "success");
      }
    } catch (error) {
      logger.error(
        "❌ [KpiManager] KPI 재계산 중 심각한 오류가 발생했습니다:",
        error
      );
      if (!options.quiet) {
        showToast("오류: KPI를 동기화하지 못했습니다.", "error");
      }
    } finally {
      this.isRecalculating = false; // 프로세스 종료 후 플래그 해제
    }
  }
}

// 싱글턴 인스턴스로 내보내어 시스템 전체에서 동일한 인스턴스를 사용하도록 합니다.
const kpiManager = new KpiManager();
export default kpiManager;
