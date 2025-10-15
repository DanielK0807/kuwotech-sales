/**
 * ============================================
 * KPI 테이블 컬럼명을 한글에서 영문으로 변경
 * 파일: backend/migrations/rename_kpi_columns_to_english.js
 * Created: 2025-10-15
 *
 * [목적]
 * - kpi_sales 테이블의 한글 컬럼명을 영문으로 변경
 * - kpi_admin 테이블의 한글 컬럼명을 영문으로 변경
 * - 코드와 DB 스키마의 일관성 확보
 * ============================================
 */

import { getDB } from "../config/database.js";

export async function renamekpiColumnsToEnglish() {
  let connection;

  try {
    connection = await getDB();
    console.log("\n🔄 [Migration] KPI 테이블 컬럼명 영문 변경 시작...\n");

    // ==========================================
    // 1. kpi_sales 테이블 컬럼명 변경
    // ==========================================
    console.log("📊 kpi_sales 테이블 컬럼명 변경 중...");

    const salesColumnRenames = [
      { old: "담당거래처", new: "assignedCompanies" },
      { old: "활성거래처", new: "activeCompanies" },
      { old: "활성화율", new: "activationRate" },
      { old: "주요제품판매거래처", new: "mainProductCompanies" },
      { old: "회사배정기준대비달성율", new: "companyTargetAchievementRate" },
      { old: "주요고객처목표달성율", new: "majorCustomerTargetRate" },
      { old: "누적매출금액", new: "accumulatedSales" },
      { old: "주요제품매출액", new: "mainProductSales" },
      { old: "매출집중도", new: "salesConcentration" },
      { old: "누적수금금액", new: "accumulatedCollection" },
      { old: "매출채권잔액", new: "accountsReceivable" },
      { old: "주요제품매출비율", new: "mainProductSalesRatio" },
      { old: "전체매출기여도", new: "totalSalesContribution" },
      { old: "주요매출기여도", new: "mainProductContribution" },
      { old: "전체매출누적기여도", new: "cumulativeTotalContribution" },
      { old: "주요매출누적기여도", new: "cumulativeMainContribution" },
      { old: "현재월수", new: "currentMonths" },
    ];

    for (const { old, new: newName } of salesColumnRenames) {
      try {
        await connection.execute(
          `ALTER TABLE kpi_sales CHANGE COLUMN \`${old}\` ${newName} DECIMAL(15,2) DEFAULT 0`
        );
        console.log(`   ✅ ${old} → ${newName}`);
      } catch (error) {
        if (error.code === "ER_BAD_FIELD_ERROR") {
          console.log(`   ⏭️  ${old} 컬럼이 이미 없거나 ${newName}으로 변경됨`);
        } else {
          throw error;
        }
      }
    }

    // ==========================================
    // 2. kpi_admin 테이블 컬럼명 변경
    // ==========================================
    console.log("\n📊 kpi_admin 테이블 컬럼명 변경 중...");

    const adminColumnRenames = [
      { old: "전체거래처", new: "totalCompanies" },
      { old: "활성거래처", new: "activeCompanies" },
      { old: "활성화율", new: "activationRate" },
      { old: "주요제품판매거래처", new: "mainProductCompanies" },
      { old: "회사배정기준대비달성율", new: "companyTargetAchievementRate" },
      { old: "주요고객처목표달성율", new: "majorCustomerTargetRate" },
      { old: "누적매출금액", new: "accumulatedSales" },
      { old: "누적수금금액", new: "accumulatedCollection" },
      { old: "매출채권잔액", new: "accountsReceivable" },
      { old: "주요제품매출액", new: "mainProductSales" },
      { old: "매출집중도", new: "salesConcentration" },
      { old: "주요제품매출비율", new: "mainProductSalesRatio" },
      { old: "영업담당자수", new: "salesRepCount" },
      { old: "현재월수", new: "currentMonths" },
    ];

    for (const { old, new: newName } of adminColumnRenames) {
      try {
        await connection.execute(
          `ALTER TABLE kpi_admin CHANGE COLUMN \`${old}\` ${newName} DECIMAL(15,2) DEFAULT 0`
        );
        console.log(`   ✅ ${old} → ${newName}`);
      } catch (error) {
        if (error.code === "ER_BAD_FIELD_ERROR") {
          console.log(`   ⏭️  ${old} 컬럼이 이미 없거나 ${newName}으로 변경됨`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n✅ [Migration] KPI 테이블 컬럼명 영문 변경 완료\n");
    return { success: true };
  } catch (error) {
    console.error("❌ [Migration] KPI 테이블 컬럼명 변경 실패:", error);
    throw error;
  }
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  renamekpiColumnsToEnglish()
    .then(() => {
      console.log("마이그레이션 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("마이그레이션 실패:", error);
      process.exit(1);
    });
}
