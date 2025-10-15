/**
 * ============================================
 * KUWOTECH 영업관리 시스템 - KPI 자동 계산 스케줄러
 * 파일: backend/services/kpi.scheduler.js
 * Created by: GitHub Copilot
 * Date: 2025-10-15
 *
 * [기능]
 * - 매일 자정(00:00)에 자동으로 모든 KPI를 재계산
 * - cron 표현식: '0 0 * * *' (매일 자정)
 * ============================================
 */

import cron from "node-cron";
import { refreshAllSalesKPI, refreshAdminKPI } from "./kpi.service.js";

/**
 * KPI 자동 계산 스케줄러 시작
 */
export function startKpiScheduler() {
  console.log("[KPI Scheduler] 스케줄러 초기화 중...");

  // 매일 자정(00:00)에 실행
  // cron 표현식: 분(0) 시(0) 일(*) 월(*) 요일(*)
  const schedule = cron.schedule(
    "0 0 * * *",
    async () => {
      console.log(
        "[KPI Scheduler] 자동 KPI 계산 시작 - " + new Date().toISOString()
      );

      try {
        // 1. 모든 영업담당자 KPI 재계산
        const salesResult = await refreshAllSalesKPI();
        console.log(
          `[KPI Scheduler] 영업담당 KPI 재계산 완료 - ${salesResult.count}명`
        );

        // 2. 전사 KPI 재계산
        const adminResult = await refreshAdminKPI();
        console.log("[KPI Scheduler] 전사 KPI 재계산 완료");

        console.log(
          "[KPI Scheduler] 자동 KPI 계산 성공 완료 - " +
            new Date().toISOString()
        );
      } catch (error) {
        console.error("[KPI Scheduler] 자동 KPI 계산 실패:", error);
      }
    },
    {
      timezone: "Asia/Seoul", // 한국 시간대 (KST)
    }
  );

  console.log(
    "[KPI Scheduler] 스케줄러 시작됨 - 매일 자정(00:00 KST)에 KPI 자동 계산"
  );

  return schedule;
}

/**
 * 스케줄러 중지
 */
export function stopKpiScheduler(schedule) {
  if (schedule) {
    schedule.stop();
    console.log("[KPI Scheduler] 스케줄러 중지됨");
  }
}
