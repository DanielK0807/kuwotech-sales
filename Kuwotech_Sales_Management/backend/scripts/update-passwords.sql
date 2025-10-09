-- 모든 직원 비밀번호를 bcrypt 해시로 업데이트
-- 기본 비밀번호: 1234
-- bcrypt 해시: $2b$10$EPFV3hwve5qvvMqVzlIsYeADE0dvXdsJtm6tz71uOyCr/MNx7ocCi

UPDATE employees
SET password = '$2b$10$EPFV3hwve5qvvMqVzlIsYeADE0dvXdsJtm6tz71uOyCr/MNx7ocCi';

-- 확인: 업데이트된 직원 수 조회
SELECT COUNT(*) as updated_count FROM employees;

-- 샘플 확인: 첫 5명의 직원 조회
SELECT name, department, LEFT(password, 20) as password_hash FROM employees LIMIT 5;
