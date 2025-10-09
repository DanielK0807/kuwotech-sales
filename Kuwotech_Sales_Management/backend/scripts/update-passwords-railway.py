#!/usr/bin/env python3
"""
Railway MySQL 비밀번호 업데이트 스크립트
"""
import subprocess
import sys

# bcrypt 해시값 (비밀번호: 1234)
BCRYPT_HASH = '$2b$10$EPFV3hwve5qvvMqVzlIsYeADE0dvXdsJtm6tz71uOyCr/MNx7ocCi'

SQL_QUERY = f"""
UPDATE employees
SET password = '{BCRYPT_HASH}';

SELECT COUNT(*) as updated_count FROM employees;
"""

print("🔐 Railway MySQL 비밀번호 업데이트")
print("=" * 50)
print(f"새 비밀번호: 1234")
print(f"bcrypt 해시: {BCRYPT_HASH[:30]}...")
print("=" * 50)
print()

# Railway 명령 실행
try:
    # Railway MySQL 서비스에 SQL 실행
    cmd = ['railway', 'run', '--service', 'MySQL', 'mysql', '-e', SQL_QUERY]

    print("📡 Railway에 연결 중...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print("✅ 업데이트 완료!")
        print(result.stdout)
    else:
        print("❌ 업데이트 실패:")
        print(result.stderr)
        sys.exit(1)

except Exception as e:
    print(f"❌ 에러 발생: {e}")
    sys.exit(1)
