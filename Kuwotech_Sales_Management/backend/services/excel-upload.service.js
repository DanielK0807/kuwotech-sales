// ============================================
// 엑셀 업로드 서비스
// ============================================
// 엑셀 파일 업로드 및 데이터 업데이트 처리
// UPSERT 로직: 신규 추가 + 기존 업데이트
// 변경 추적: change_history 테이블에 기록
// ============================================

import xlsx from 'xlsx';
import { getDB } from '../config/database.js';

// 엑셀 날짜 시리얼 번호를 Date로 변환
const excelDateToJSDate = (serial) => {
  if (!serial) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
};

// Date를 MySQL DATE 형식으로 변환
const formatDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    return date.replace(/\./g, '-');
  }
  return null;
};

// 변경 사항 추적
const trackChanges = async (connection, tableName, recordId, oldData, newData, changedBy) => {
  try {
    await connection.execute(
      `INSERT INTO change_history (tableName, operation, recordId, changedBy, oldData, newData)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tableName, 'UPDATE', recordId, changedBy, JSON.stringify(oldData), JSON.stringify(newData)]
    );
  } catch (error) {
    console.error('변경 이력 저장 실패:', error.message);
  }
};

// 거래처 데이터 UPSERT
export const upsertCompaniesFromExcel = async (filePath, uploadedBy) => {
  let connection;
  const results = {
    totalRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    changes: []
  };

  try {
    connection = await getDB();

    // 엑셀 파일 읽기
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['기본정보'];

    if (!sheet) {
      throw new Error('엑셀 파일에 "기본정보" 시트가 없습니다.');
    }

    const companyData = xlsx.utils.sheet_to_json(sheet);
    results.totalRows = companyData.length;

    for (const row of companyData) {
      try {
        const keyValue = row['KEYVALUE'];

        if (!keyValue) {
          results.skipped++;
          continue;
        }

        // 기존 데이터 조회
        const [existing] = await connection.execute(
          'SELECT * FROM companies WHERE keyValue = ?',
          [keyValue]
        );

        const newData = {
          keyValue,
          erpCompanyName: row['거래처명(ERP)'] || null,
          finalCompanyName: row['최종거래처명'] || null,
          isClosed: row['폐업여부'] === '폐업' ? 'Y' : 'N',
          ceoOrDentist: row['대표이사 또는 치과의사'] || null,
          customerRegion: row['고객사 지역'] || null,
          businessStatus: row['거래상태'] || null,
          department: row['담당부서'] || null,
          salesProduct: row['판매제품'] || null,
          internalManager: row['내부담당자'] || null,
          jcwContribution: row['정철웅기여\r\n(상.중.하)'] || row['정철웅기여(상.중.하)'] || null,
          companyContribution: row['회사기여\r\n(상.중.하)'] || row['회사기여(상.중.하)'] || null,
          lastPaymentDate: formatDate(row['마지막결제일']),
          lastPaymentAmount: row['마지막총결재금액'] || 0,
          accumulatedSales: row['누적매출금액'] || 0,
          accumulatedCollection: row['누적수금금액'] || 0,
          accountsReceivable: row['매출채권잔액'] || 0,
          activityNotes: row['영업활동(특이사항)'] || null
        };

        if (existing.length === 0) {
          // 신규 추가
          await connection.execute(
            `INSERT INTO companies (
              keyValue, erpCompanyName, finalCompanyName, isClosed, ceoOrDentist,
              customerRegion, businessStatus, department, salesProduct, internalManager,
              jcwContribution, companyContribution, lastPaymentDate, lastPaymentAmount,
              accumulatedSales, accumulatedCollection, accountsReceivable, activityNotes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newData.keyValue, newData.erpCompanyName, newData.finalCompanyName,
              newData.isClosed, newData.ceoOrDentist, newData.customerRegion,
              newData.businessStatus, newData.department, newData.salesProduct,
              newData.internalManager, newData.jcwContribution, newData.companyContribution,
              newData.lastPaymentDate, newData.lastPaymentAmount, newData.accumulatedSales,
              newData.accumulatedCollection, newData.accountsReceivable, newData.activityNotes
            ]
          );
          results.inserted++;
          results.changes.push({
            keyValue,
            companyName: newData.finalCompanyName,
            action: '신규 추가'
          });
        } else {
          // 기존 업데이트 (변경된 필드만)
          const oldData = existing[0];
          const changedFields = [];

          // 변경된 필드 찾기
          Object.keys(newData).forEach(key => {
            if (key === 'keyValue') return; // keyValue는 비교 안 함
            if (oldData[key] !== newData[key]) {
              changedFields.push({
                field: key,
                oldValue: oldData[key],
                newValue: newData[key]
              });
            }
          });

          if (changedFields.length > 0) {
            // 업데이트 실행
            await connection.execute(
              `UPDATE companies SET
                erpCompanyName = ?, finalCompanyName = ?, isClosed = ?, ceoOrDentist = ?,
                customerRegion = ?, businessStatus = ?, department = ?, salesProduct = ?,
                internalManager = ?, jcwContribution = ?, companyContribution = ?,
                lastPaymentDate = ?, lastPaymentAmount = ?, accumulatedSales = ?,
                accumulatedCollection = ?, accountsReceivable = ?, activityNotes = ?
              WHERE keyValue = ?`,
              [
                newData.erpCompanyName, newData.finalCompanyName, newData.isClosed,
                newData.ceoOrDentist, newData.customerRegion, newData.businessStatus,
                newData.department, newData.salesProduct, newData.internalManager,
                newData.jcwContribution, newData.companyContribution, newData.lastPaymentDate,
                newData.lastPaymentAmount, newData.accumulatedSales, newData.accumulatedCollection,
                newData.accountsReceivable, newData.activityNotes, keyValue
              ]
            );

            // 변경 이력 저장
            await trackChanges(connection, 'companies', keyValue, oldData, newData, uploadedBy);

            results.updated++;
            results.changes.push({
              keyValue,
              companyName: newData.finalCompanyName,
              action: '업데이트',
              changedFields: changedFields.map(f => f.field).join(', ')
            });
          } else {
            results.skipped++;
          }
        }
      } catch (error) {
        results.errors.push({
          row: row['NO'] || '알 수 없음',
          keyValue: row['KEYVALUE'],
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};

// 직원 데이터 UPSERT
export const upsertEmployeesFromExcel = async (filePath, uploadedBy) => {
  let connection;
  const results = {
    totalRows: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    changes: []
  };

  try {
    connection = await getDB();

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['입사일자'];

    if (!sheet) {
      throw new Error('엑셀 파일에 "입사일자" 시트가 없습니다.');
    }

    const employeeData = xlsx.utils.sheet_to_json(sheet);
    results.totalRows = employeeData.length;

    for (const row of employeeData) {
      try {
        const name = row['성명'];

        if (!name) {
          results.skipped++;
          continue;
        }

        // 기존 데이터 조회
        const [existing] = await connection.execute(
          'SELECT * FROM employees WHERE name = ?',
          [name]
        );

        const hireDate = formatDate(excelDateToJSDate(row['입사일자']));
        const role1 = row['영업사원목록'] || null;
        const role2 = row['관리자목록'] || null;
        const department = row['부서'] || null;

        if (existing.length === 0) {
          // 신규 추가 (비밀번호는 이름1234)
          const bcrypt = await import('bcrypt');
          const hashedPassword = await bcrypt.hash(`${name}1234`, 10);

          // UUID 생성 (영구 추적용 - Primary Key)
          const { randomUUID } = await import('crypto');
          const employeeId = randomUUID();

          await connection.execute(
            `INSERT INTO employees (id, name, password, role1, role2, department, hireDate, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, '재직')`,
            [employeeId, name, hashedPassword, role1, role2, department, hireDate]
          );
          results.inserted++;
          results.changes.push({
            name,
            action: '신규 추가',
            id: employeeId
          });
        } else {
          // 기존 업데이트 (role1, role2, department, hireDate)
          const oldData = existing[0];
          const changedFields = [];

          if (oldData.role1 !== role1) changedFields.push('role1');
          if (oldData.role2 !== role2) changedFields.push('role2');
          if (oldData.department !== department) changedFields.push('department');
          if (oldData.hireDate !== hireDate) changedFields.push('hireDate');

          if (changedFields.length > 0) {
            await connection.execute(
              `UPDATE employees SET role1 = ?, role2 = ?, department = ?, hireDate = ? WHERE name = ?`,
              [role1, role2, department, hireDate, name]
            );

            await trackChanges(connection, 'employees', name, oldData, { role1, role2, department, hireDate }, uploadedBy);

            results.updated++;
            results.changes.push({
              name,
              action: '업데이트',
              changedFields: changedFields.join(', ')
            });
          } else {
            results.skipped++;
          }
        }
      } catch (error) {
        results.errors.push({
          name: row['성명'],
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};
