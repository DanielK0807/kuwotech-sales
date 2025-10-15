// ============================================
// KUWOTECH 영업관리 시스템 - Express 서버
// ============================================
// 네비게이션:
// 1. 의존성 로드
// 2. 미들웨어 설정
// 3. MySQL 연결
// 4. 라우트 정의
// 5. 에러 핸들링
// 6. 서버 시작
// ============================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readdirSync } from "fs";
import { connectDB } from "./config/database.js";
import { initializeDatabase } from "./config/db-initializer.js";
import { ensureAllSchemas } from "./utils/ensure_db_schema.js";

// 라우트 임포트
import authRoutes from "./routes/auth.routes.js";
import employeesRoutes from "./routes/employees.routes.js";
import companiesRoutes from "./routes/companies.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import goalsRoutes from "./routes/goals.routes.js";
import kpiRoutes from "./routes/kpi.routes.js"; // ✅ FIX: 이 파일이 실제로는 없었음. 새로 생성 후 연결
import uploadRoutes from "./routes/upload.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import migrationRoutes from "./routes/migration.routes.js";
import simpleMigrationRoutes from "./routes/simple-migration.routes.js";
import fixDatesRoutes from "./routes/fix-dates.routes.js";
import masterRoutes from "./routes/master.routes.js";
import productsRoutes from "./routes/products.routes.js";
import debugRoutes from "./routes/debug.routes.js";
import errorsRoutes from "./routes/errors.routes.js";
import accessLogsRoutes from "./routes/access-logs.routes.js";
import regionsRoutes from "./routes/regions.routes.js";

// KPI 스케줄러 임포트
import { startKpiScheduler } from "./services/kpi.scheduler.js";

// ============================================
// 환경 변수 로드
// ============================================
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 미들웨어 설정
// ============================================

// CORS 설정
const allowedOrigins = [
  "http://localhost:5500", // Live Server (로컬 개발)
  "http://127.0.0.1:5500", // Live Server (IP)
  "http://localhost:3000", // 로컬 백엔드 서버
  "http://127.0.0.1:3000", // 로컬 백엔드 서버 (IP)
  process.env.FRONTEND_URL, // 환경 변수
  "https://kuwotech-sales-production.up.railway.app", // Railway 프로덕션
].filter(Boolean); // null이나 undefined 제거

app.use(
  cors({
    origin: (origin, callback) => {
      // 같은 서버에서 제공되는 경우 (origin이 없음) - 항상 허용
      if (!origin) {
        callback(null, true);
        return;
      }

      // Railway 도메인 - 항상 허용
      if (origin.includes("railway.app")) {
        callback(null, true);
        return;
      }

      // 허용된 origin 목록에 있는 경우
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // 로컬 개발 환경 (localhost, 127.0.0.1) - 개발 중에는 허용
      if (process.env.NODE_ENV !== "production") {
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
          callback(null, true);
          return;
        }
      }

      // 그 외의 경우 차단
      console.warn(`❌ CORS 차단된 origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// JSON 파싱
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 요청 로깅
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// 정적 파일 서빙 (프론트엔드)
// ============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 05.Source 디렉토리를 정적 파일로 서빙
// Railway (Docker): 프로젝트 전체가 /app에 배포되고 server.js는 /app/backend/server.js
// 로컬: backend 디렉토리에서 실행
const frontendPath = path.join(__dirname, "..", "05.Source");

// 디버깅 정보 출력
console.log("📂 경로 디버깅 정보:");
console.log(`  - __dirname: ${__dirname}`);
console.log(`  - process.cwd(): ${process.cwd()}`);
console.log(`  - frontendPath: ${frontendPath}`);
console.log(`  - 환경: ${process.env.NODE_ENV || "development"}`);

// 프론트엔드 경로가 실제로 존재하는지 확인
if (existsSync(frontendPath)) {
  console.log(`✅ 프론트엔드 디렉토리 존재 확인`);
  const contents = readdirSync(frontendPath);
  console.log(`  - 디렉토리 내용 (최대 5개):`, contents.slice(0, 5));
} else {
  console.error(`❌ 프론트엔드 디렉토리를 찾을 수 없음: ${frontendPath}`);
}

app.use(express.static(frontendPath));

// 폰트/로고 파일 서빙 (02.Fonts_Logos)
const fontsLogosPath = path.join(__dirname, "..", "02.Fonts_Logos");
app.use("/02.Fonts_Logos", express.static(fontsLogosPath));
if (existsSync(fontsLogosPath)) {
  console.log(`✅ 폰트/로고 디렉토리 설정 완료: /02.Fonts_Logos`);
} else {
  console.warn(`⚠️  폰트/로고 디렉토리 없음: ${fontsLogosPath}`);
}

console.log(`📁 프론트엔드 경로: ${frontendPath}`);

// ============================================
// API 라우트 연결
// ============================================

// 인증 라우트
app.use("/api/auth", authRoutes);

// 직원 라우트
app.use("/api/employees", employeesRoutes);

// 거래처 라우트
app.use("/api/companies", companiesRoutes);

// 지역 라우트
app.use("/api/regions", regionsRoutes);

// 보고서 라우트
app.use("/api/reports", reportsRoutes);

// 목표/실적 라우트
app.use("/api/goals", goalsRoutes);

// KPI 라우트
app.use("/api/kpi", kpiRoutes);

// 엑셀 업로드 라우트
app.use("/api/upload", uploadRoutes);

// 관리자 라우트
app.use("/api/admin", adminRoutes);

// 마이그레이션 라우트 (임시 - 개발용)
app.use("/api/migration", migrationRoutes);
app.use("/api/simple-migration", simpleMigrationRoutes);
app.use("/api/fix", fixDatesRoutes);

// 마스터 데이터 라우트 (제품, 지역)
app.use("/api/master", masterRoutes);

// 제품 라우트
app.use("/api/products", productsRoutes);

// 에러 로그 라우트
app.use("/api/errors", errorsRoutes);

// 웹사용기록 (접속 로그) 라우트
app.use("/api/access-logs", accessLogsRoutes);

// 디버그 라우트 (개발 환경에서만)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/debug", debugRoutes);
  console.log("🐛 디버그 라우트 활성화됨 (개발 환경)");
}

// ============================================
// 기본 라우트
// ============================================

// Root - API 정보 반환
app.get("/", (req, res) => {
  res.json({
    message: "KUWOTECH 영업관리 시스템 API 서버",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      companies: "/api/companies",
      reports: "/api/reports",
      employees: "/api/employees",
      goals: "/api/goals",
      kpi: "/api/kpi",
      upload: "/api/upload",
      migration: "/api/migration",
      master: "/api/master",
    },
    note: "프론트엔드는 로컬에서 실행하세요 (Live Server)",
  });
});

// API 정보 엔드포인트
app.get("/api", (req, res) => {
  res.json({
    message: "KUWOTECH 영업관리 시스템 API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      companies: "/api/companies",
      reports: "/api/reports",
      employees: "/api/employees",
      goals: "/api/goals",
      kpi: "/api/kpi",
      upload: "/api/upload",
      migration: "/api/migration",
      master: "/api/master",
    },
  });
});

// Health Check
app.get("/api/health", async (req, res) => {
  try {
    const { getDB } = await import("./config/database.js");
    const db = await getDB();
    await db.ping();

    res.json({
      status: "OK",
      database: "connected",
      server: "running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error("Health Check 실패:", error);
    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Debug endpoint to check paths and directory contents
app.get("/api/debug/paths", (req, res) => {
  const frontendPath = path.join(__dirname, "..", "05.Source");
  const loginPath = path.join(frontendPath, "02.login", "01_login.html");

  const debugInfo = {
    __dirname,
    "process.cwd()": process.cwd(),
    frontendPath,
    loginPath,
    frontendExists: existsSync(frontendPath),
    loginExists: existsSync(loginPath),
    environment: process.env.NODE_ENV || "development",
    railwayEnv: process.env.RAILWAY_ENVIRONMENT || "not set",
  };

  // List directory contents at various levels
  try {
    if (existsSync(process.cwd())) {
      debugInfo.cwdContents = readdirSync(process.cwd());
    }
    if (existsSync(path.join(process.cwd(), ".."))) {
      debugInfo.parentDirContents = readdirSync(path.join(process.cwd(), ".."));
    }
  } catch (error) {
    debugInfo.listError = error.message;
  }

  if (existsSync(frontendPath)) {
    try {
      debugInfo.frontendContents = readdirSync(frontendPath);
      const loginDir = path.join(frontendPath, "02.login");
      if (existsSync(loginDir)) {
        debugInfo.loginDirContents = readdirSync(loginDir);
      }
    } catch (error) {
      debugInfo.readError = error.message;
    }
  }

  res.json(debugInfo);
});

// Manual employee import endpoint (for debugging)
app.post("/api/debug/import-employees", async (req, res) => {
  try {
    const { getDB } = await import("./config/database.js");
    const db = await getDB();
    const xlsx = await import("xlsx");

    const excelPath = path.join(
      __dirname,
      "../01.Original_data/영업관리기초자료_UUID.xlsx"
    );

    if (!existsSync(excelPath)) {
      return res
        .status(404)
        .json({ error: "Excel file not found", path: excelPath });
    }

    const workbook = xlsx.default.readFile(excelPath);
    const employeeSheet = workbook.Sheets["입사일자"];
    const employeeData = xlsx.default.utils.sheet_to_json(employeeSheet);

    const results = {
      total: employeeData.length,
      imported: 0,
      errors: [],
      samples: [],
    };

    for (let i = 0; i < employeeData.length; i++) {
      const row = employeeData[i];
      try {
        const name = row["성명"];
        if (!name) {
          results.errors.push({ row: i, error: "No name", data: row });
          continue;
        }

        const hireDate = row["입사일자"];
        const role1 = row["영업사원목록"] || null;
        const role2 = row["관리자목록"] || null;
        const department = row["부서"] || null;

        const { randomUUID } = await import("crypto");
        const employeeId = randomUUID();

        const bcrypt = await import("bcrypt");
        const defaultPassword = `${name}1234`;
        const hashedPassword = await bcrypt.default.hash(defaultPassword, 10);

        const formatDate = (date) => {
          if (!date) return null;
          if (typeof date === "number") {
            const excelEpoch = new Date(1900, 0, 1);
            const jsDate = new Date(
              excelEpoch.getTime() + (date - 2) * 24 * 60 * 60 * 1000
            );
            return jsDate.toISOString().split("T")[0];
          }
          return date;
        };

        const [result] = await db.execute(
          `INSERT INTO employees (id, name, password, role1, role2, department, hireDate, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, '재직')`,
          [
            employeeId,
            name,
            hashedPassword,
            role1,
            role2,
            department,
            formatDate(hireDate),
          ]
        );

        results.imported++;
        results.samples.push({
          name,
          id: employeeId,
          affectedRows: result.affectedRows,
        });
      } catch (error) {
        results.errors.push({
          row: i,
          name: row["성명"],
          error: error.message,
          stack: error.stack,
        });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Debug endpoint for employee import status
app.get("/api/debug/employees", async (req, res) => {
  try {
    const { getDB } = await import("./config/database.js");
    const db = await getDB();

    // Check employees table
    const [employees] = await db.execute(
      "SELECT COUNT(*) as count FROM employees"
    );
    const [employeeList] = await db.execute(
      "SELECT id, name, role1, role2, department FROM employees LIMIT 5"
    );

    // Check employees table schema
    const [schema] = await db.execute("DESCRIBE employees");

    // Check Excel file
    const excelPath = path.join(
      __dirname,
      "../01.Original_data/영업관리기초자료_UUID.xlsx"
    );
    const excelExists = existsSync(excelPath);

    let excelInfo = null;
    if (excelExists) {
      try {
        const xlsx = await import("xlsx");
        const workbook = xlsx.readFile(excelPath);
        const sheets = workbook.SheetNames;
        const employeeSheet = workbook.Sheets["입사일자"];
        const employeeData = xlsx.utils.sheet_to_json(employeeSheet);
        excelInfo = {
          sheets,
          employeeDataCount: employeeData.length,
          sampleRow: employeeData[0],
        };
      } catch (error) {
        excelInfo = { error: error.message };
      }
    }

    res.json({
      database: {
        employeeCount: employees[0].count,
        employees: employeeList,
        schema: schema.map((col) => ({
          field: col.Field,
          type: col.Type,
          key: col.Key,
        })),
      },
      excel: {
        path: excelPath,
        exists: excelExists,
        info: excelInfo,
      },
      environment: {
        __dirname,
        cwd: process.cwd(),
        resetDatabase: process.env.RESET_DATABASE,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

// Debug endpoint for employees-by-role troubleshooting
app.get("/api/debug/employees-by-role-test/:role", async (req, res) => {
  const steps = [];

  try {
    const { role } = req.params;
    const { getDB } = await import("./config/database.js");
    const db = await getDB();

    steps.push({ step: 1, action: "Parameter received", role, success: true });

    // Step 2: Check role1, role2 columns exist
    try {
      const [schema] = await db.execute("DESCRIBE employees");
      const hasRole1 = schema.some((col) => col.Field === "role1");
      const hasRole2 = schema.some((col) => col.Field === "role2");
      steps.push({
        step: 2,
        action: "Check role columns",
        hasRole1,
        hasRole2,
        columns: schema.map((c) => c.Field),
        success: true,
      });
    } catch (error) {
      steps.push({
        step: 2,
        action: "Check role columns",
        error: error.message,
        success: false,
      });
      throw error;
    }

    // Step 3: Count employees with this role
    try {
      const [roleCount] = await db.execute(
        "SELECT COUNT(*) as count FROM employees WHERE role1 = ? OR role2 = ?",
        [role, role]
      );
      steps.push({
        step: 3,
        action: "Count employees with role",
        count: roleCount[0].count,
        success: true,
      });
    } catch (error) {
      steps.push({
        step: 3,
        action: "Count employees with role",
        error: error.message,
        success: false,
      });
      throw error;
    }

    // Step 4: Execute the actual query from auth.controller.js
    try {
      const [employees] = await db.execute(
        "SELECT name, department, canUploadExcel FROM employees WHERE (role1 = ? OR role2 = ?) ORDER BY department, name",
        [role, role]
      );
      steps.push({
        step: 4,
        action: "Execute main query",
        count: employees.length,
        sample: employees.slice(0, 3),
        success: true,
      });
    } catch (error) {
      steps.push({
        step: 4,
        action: "Execute main query",
        error: error.message,
        stack: error.stack,
        success: false,
      });
      throw error;
    }

    // Step 5: Format data (like in controller)
    try {
      const [employees] = await db.execute(
        "SELECT name, department, canUploadExcel FROM employees WHERE (role1 = ? OR role2 = ?) ORDER BY department, name",
        [role, role]
      );

      const formattedEmployees = employees.map((emp) => ({
        name: emp.name,
        department: emp.department,
        displayName: emp.department
          ? `${emp.name} (${emp.department})`
          : emp.name,
        canUploadExcel: emp.canUploadExcel,
      }));

      steps.push({
        step: 5,
        action: "Format employee data",
        count: formattedEmployees.length,
        sample: formattedEmployees.slice(0, 3),
        success: true,
      });
    } catch (error) {
      steps.push({
        step: 5,
        action: "Format employee data",
        error: error.message,
        success: false,
      });
      throw error;
    }

    res.json({
      success: true,
      message: "All steps completed successfully",
      steps,
      totalSteps: steps.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      steps,
      failedAt: steps.length,
    });
  }
});

// Debug endpoint to check employees table
app.get("/api/debug/employees-check", async (req, res) => {
  try {
    const { getDB } = await import("./config/database.js");
    const db = await getDB();

    // Get all employees
    const [employees] = await db.execute(
      "SELECT id, name, email, role1, role2, department, status FROM employees LIMIT 20"
    );

    // Count total employees
    const [count] = await db.execute("SELECT COUNT(*) as total FROM employees");

    res.json({
      success: true,
      total: count[0].total,
      sample: employees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// Debug endpoint to check recent company updates
app.get("/api/debug/companies-recent-updates", async (req, res) => {
  try {
    const { getDB } = await import("./config/database.js");
    const db = await getDB();

    // 1. Total count
    const [totalCount] = await db.execute(
      "SELECT COUNT(*) as total FROM companies"
    );

    // 2. Updates today (2025-10-15)
    const [todayUpdates] = await db.execute(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE DATE(updatedAt) = '2025-10-15'
    `);

    // 3. Created today (actually new)
    const [createdToday] = await db.execute(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE DATE(createdAt) = '2025-10-15'
    `);

    // 4. Recent 10 companies
    const [recentCompanies] = await db.execute(`
      SELECT keyValue, finalCompanyName, createdAt, updatedAt, customerNewsDate
      FROM companies
      ORDER BY updatedAt DESC
      LIMIT 10
    `);

    // 5. customerNewsDate count
    const [newsDateCount] = await db.execute(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE customerNewsDate = '2025-10-15'
    `);

    res.json({
      success: true,
      summary: {
        totalCompanies: totalCount[0].total,
        updatedToday: todayUpdates[0].count,
        createdToday: createdToday[0].count,
        withCustomerNewsDate: newsDateCount[0].count,
      },
      recentCompanies: recentCompanies,
      conclusion:
        createdToday[0].count > 0
          ? "✅ 오늘 엑셀 업로드가 실행되었습니다!"
          : "⚠️ 오늘 엑셀 업로드는 실행되지 않았습니다. updatedAt 변경은 마이그레이션으로 인한 것입니다.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// ============================================
// 마이그레이션 함수
// ============================================

/**
 * 마이그레이션 014: activityNotes, customerNewsDate 컬럼 추가
 */
async function runMigration014() {
  try {
    const { getDB } = await import("./config/database.js");
    const db = await getDB();

    console.log("  📝 마이그레이션 014: activityNotes, customerNewsDate 추가");

    // 1. activityNotes 컬럼 존재 여부 확인 후 추가
    const [activityColumns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'companies'
      AND COLUMN_NAME = 'activityNotes'
    `);

    if (activityColumns.length === 0) {
      await db.execute(`
        ALTER TABLE companies
        ADD COLUMN activityNotes TEXT COMMENT '고객소식 (관리자 엑셀 업로드)'
        AFTER businessActivity
      `);
      console.log("    ✅ activityNotes 컬럼 추가 완료");
    } else {
      console.log("    ℹ️  activityNotes 컬럼 이미 존재");
    }

    // 2. customerNewsDate 컬럼 존재 여부 확인 후 추가
    const [dateColumns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'companies'
      AND COLUMN_NAME = 'customerNewsDate'
    `);

    if (dateColumns.length === 0) {
      await db.execute(`
        ALTER TABLE companies
        ADD COLUMN customerNewsDate DATE COMMENT '고객소식 작성일'
        AFTER activityNotes
      `);
      console.log("    ✅ customerNewsDate 컬럼 추가 완료");
    } else {
      console.log("    ℹ️  customerNewsDate 컬럼 이미 존재");
    }

    // 3. 기존 데이터 날짜 설정
    const [result] = await db.execute(`
      UPDATE companies
      SET customerNewsDate = '2025-10-15'
      WHERE activityNotes IS NOT NULL AND activityNotes != '' AND customerNewsDate IS NULL
    `);
    console.log(
      `    ✅ 기존 데이터 날짜 업데이트 완료 (${result.affectedRows}건)`
    );

    console.log("  🎉 마이그레이션 014 완료!");
  } catch (error) {
    console.error("  ❌ 마이그레이션 014 실패:", error.message);
    // 마이그레이션 실패해도 서버는 계속 실행
  }
}

// ============================================
// 에러 핸들링
// ============================================

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error("❌ 서버 에러:", err);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "서버 오류가 발생했습니다"
      : err.message;

  res.status(statusCode).json({
    error: "Internal Server Error",
    message: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ============================================
// 서버 시작
// ============================================

const startServer = async () => {
  try {
    // 데이터베이스 초기화 (테이블 생성, 제품 삽입, 트리거 생성)
    console.log("🔧 데이터베이스 초기화 시작...");
    const dbInitialized = await initializeDatabase();

    if (!dbInitialized) {
      console.warn("⚠️  데이터베이스 초기화 실패 - 서버는 계속 실행됩니다");
    }

    // 스키마 자동 체크 및 업데이트
    console.log("📋 데이터베이스 스키마 체크 시작...");
    await ensureAllSchemas();

    // 마이그레이션 014 실행 (activityNotes, customerNewsDate 추가)
    console.log("🔄 마이그레이션 014 실행 중...");
    await runMigration014();

    // KPI 테이블 컬럼명 영문 변경 마이그레이션
    console.log("🔄 KPI 테이블 컬럼명 영문 변경 마이그레이션 실행 중...");
    const { renamekpiColumnsToEnglish } = await import(
      "./migrations/rename_kpi_columns_to_english.js"
    );
    await renamekpiColumnsToEnglish();

    // DB 연결
    await connectDB();

    // KPI 자동 계산 스케줄러 시작
    console.log("⏰ KPI 자동 계산 스케줄러 시작 중...");
    startKpiScheduler();

    // 서버 시작
    app.listen(PORT, "0.0.0.0", () => {
      console.log("\n" + "=".repeat(50));
      console.log("🚀 KUWOTECH 영업관리 시스템 API 서버 실행 중");
      console.log("=".repeat(50));
      console.log(`📍 서버 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📚 API 문서: http://localhost:${PORT}/`);
      console.log(`🌍 환경: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔌 바인딩: 0.0.0.0:${PORT}`);
      console.log("=".repeat(50) + "\n");
    });
  } catch (error) {
    console.error("❌ 서버 시작 실패:", error);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM 신호 수신 - 서버 종료 중...");
  const { closeDB } = await import("./config/database.js");
  await closeDB();
  process.exit(0);
});

// 스크립트 실행
startServer();
