-- ============================================
-- 05. 고객소식 관리 시스템 테이블 생성
-- ============================================
-- 목적: 고객소식 작성, 관리자 의견, 알림 시스템 구현
-- 실행일: 2025-10-17
-- ============================================

-- ==========================================
-- 1. customer_news 테이블 (고객소식)
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_news (
  id VARCHAR(36) PRIMARY KEY COMMENT '고객소식 ID (UUID)',
  companyId VARCHAR(100) NOT NULL COMMENT '거래처 ID',
  companyName VARCHAR(200) NOT NULL COMMENT '거래처명 (조회용)',

  -- 작성자 정보
  createdBy VARCHAR(100) NOT NULL COMMENT '작성자 (영업담당자)',
  department VARCHAR(100) COMMENT '작성자 부서',

  -- 카테고리 및 내용
  category ENUM('경조사', '생일', '개업기념일', '일반소식', '중요공지', '기타') NOT NULL COMMENT '카테고리',
  title VARCHAR(200) NOT NULL COMMENT '제목',
  content TEXT NOT NULL COMMENT '내용',

  -- 날짜 및 알림 설정
  newsDate DATE NOT NULL COMMENT '소식 발생일',
  isYearlyRecurring BOOLEAN DEFAULT FALSE COMMENT '매년 반복 여부 (생일, 기념일 등)',

  -- 중요도 및 알림
  priority ENUM('낮음', '보통', '높음', '긴급') DEFAULT '보통' COMMENT '중요도',
  showAsNotification BOOLEAN DEFAULT FALSE COMMENT '로그인 시 알림 표시 여부',

  -- 상태 및 통계
  status ENUM('활성', '비활성', '삭제됨') DEFAULT '활성' COMMENT '상태',
  viewCount INT DEFAULT 0 COMMENT '조회수',
  commentCount INT DEFAULT 0 COMMENT '의견 수',

  -- 시스템 필드
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

  -- 외래키
  FOREIGN KEY (companyId) REFERENCES companies(keyValue) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (createdBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 인덱스
  INDEX idx_companyId (companyId),
  INDEX idx_createdBy (createdBy),
  INDEX idx_category (category),
  INDEX idx_newsDate (newsDate),
  INDEX idx_showAsNotification (showAsNotification),
  INDEX idx_status (status),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='고객소식 관리 테이블 - 영업담당자가 작성';

-- ==========================================
-- 2. customer_news_comments 테이블 (관리자 의견)
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_news_comments (
  id VARCHAR(36) PRIMARY KEY COMMENT '의견 ID (UUID)',
  newsId VARCHAR(36) NOT NULL COMMENT '고객소식 ID',

  -- 작성자 정보
  commentBy VARCHAR(100) NOT NULL COMMENT '의견 작성자 (주로 관리자)',
  commentByRole VARCHAR(50) COMMENT '작성자 역할',

  -- 의견 내용
  comment TEXT NOT NULL COMMENT '의견 내용',
  commentType ENUM('일반', '질문', '제안', '승인', '반려') DEFAULT '일반' COMMENT '의견 유형',

  -- 상태
  isRead BOOLEAN DEFAULT FALSE COMMENT '영업담당자 읽음 여부',
  readAt TIMESTAMP NULL COMMENT '읽은 시간',

  -- 시스템 필드
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

  -- 외래키
  FOREIGN KEY (newsId) REFERENCES customer_news(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (commentBy) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE RESTRICT,

  -- 인덱스
  INDEX idx_newsId (newsId),
  INDEX idx_commentBy (commentBy),
  INDEX idx_isRead (isRead),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='고객소식 의견 테이블 - 관리자가 작성';

-- ==========================================
-- 3. customer_news_notifications 테이블 (알림 읽음 상태)
-- ==========================================
CREATE TABLE IF NOT EXISTS customer_news_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  newsId VARCHAR(36) NOT NULL COMMENT '고객소식 ID',
  employeeName VARCHAR(100) NOT NULL COMMENT '직원명',

  -- 알림 상태
  viewCount INT DEFAULT 0 COMMENT '조회 횟수 (최대 3회)',
  isDismissed BOOLEAN DEFAULT FALSE COMMENT '더이상 보지 않기 클릭 여부',
  dismissedAt TIMESTAMP NULL COMMENT '더이상 보지 않기 클릭 시간',

  -- 조회 이력
  firstViewedAt TIMESTAMP NULL COMMENT '첫 조회 시간',
  lastViewedAt TIMESTAMP NULL COMMENT '마지막 조회 시간',

  -- 시스템 필드
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

  -- 외래키
  FOREIGN KEY (newsId) REFERENCES customer_news(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (employeeName) REFERENCES employees(name) ON UPDATE CASCADE ON DELETE CASCADE,

  -- 유니크 제약 (한 직원당 한 소식에 대해 하나의 알림 상태만)
  UNIQUE KEY uk_news_employee (newsId, employeeName),

  -- 인덱스
  INDEX idx_employeeName (employeeName),
  INDEX idx_isDismissed (isDismissed),
  INDEX idx_viewCount (viewCount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='고객소식 알림 읽음 상태 추적 테이블';

-- ==========================================
-- 트리거: 의견 작성 시 commentCount 증가
-- ==========================================
DROP TRIGGER IF EXISTS increment_comment_count;

CREATE TRIGGER increment_comment_count
AFTER INSERT ON customer_news_comments
FOR EACH ROW
BEGIN
  UPDATE customer_news
  SET commentCount = commentCount + 1
  WHERE id = NEW.newsId;
END;

-- ==========================================
-- 트리거: 의견 삭제 시 commentCount 감소
-- ==========================================
DROP TRIGGER IF EXISTS decrement_comment_count;

CREATE TRIGGER decrement_comment_count
AFTER DELETE ON customer_news_comments
FOR EACH ROW
BEGIN
  UPDATE customer_news
  SET commentCount = GREATEST(0, commentCount - 1)
  WHERE id = OLD.newsId;
END;

-- ==========================================
-- 결과 확인
-- ==========================================
SELECT '✅ 고객소식 관리 테이블 생성 완료' AS status;

SHOW TABLES LIKE 'customer_news%';
