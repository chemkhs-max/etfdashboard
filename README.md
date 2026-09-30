# KRX ETF 종합 EDA 분석 대시보드 (KRX ETF EDA Terminal)

네이버 증권 실시간 ETF API를 연동하여 한국거래소(KRX)에 상장된 전체 ETF(1,170여 개 종목)를 실시간으로 수집하고 종합적인 **탐색적 데이터 분석(EDA)** 및 **고성능 스크리닝**을 제공하는 금융 분석 터미널 웹 애플리케이션입니다.

**정적 페이지 배포(GitHub Pages, Vercel, Netlify, 로컬 파일 실행)**에 최적화되어 설계되었습니다.

---

## 🌟 주요 기능 (Key Features)

### 1. 실시간 시장 종합 KPI 요약 (Market High-Impact KPIs)
- **전체 상장 ETF 현황**: 1,171개 전 종목 모니터링
- **총 순자산총액 (Total AUM)**: 약 457.6조 원 시장 규모 실시간 집계
- **일일 총 거래대금 & 회전율**: 금일 시장 체결 거래대금 및 유동성 집계
- **시장 등락 비율 (Market Breadth)**: 상승 / 하락 / 보합 종목 수 및 비례 게이지 시각화
- **실시간 괴리율 경보**: `|괴리율| ≥ 1.0%` 이상 주의 종목 자동 적발

### 2. 운용사(Brand / Issuer)별 점유율 및 성과 분석
- 국내 28개 ETF 운용사 브랜드 정밀 분류 (KODEX, TIGER, RISE, ACE, SOL, PLUS, HANARO, 1Q, TIME 등)
- 운용사별 총 순자산(AUM), 시장 점유율(%), 상장 종목수, 일일 거래대금, 1개월 평균 수익률 비교 테이블
- 운용사별 점유율 인터랙티브 바 차트 및 원클릭 운용사 필터 연동

### 3. 수익률 & 팩터 EDA (Return & Factor Analysis)
- **기간별 성과 통계**: 1개월/3개월/6개월 수익률 산술 평균(Mean), 중위수(Median), 표준편차(Std), 범위(Min~Max)
- **1개월 수익률 정규분포 히스토그램**: 시장 전체 종목의 수익률 분포 구간별 빈도 탐색
- **최고/최저 성과 순위**: 1개월 최고 수익률 TOP 5 vs 최대 낙폭 WORST 5, 당일 급등/급락 종목

### 4. 유동성 & 괴리율 정밀 진단 (Liquidity & Disparity Diagnosis)
- **AUM vs 일일 거래대금 스캐터 플롯**: 로그 스케일 기반 유동성 회전율 분석
- **시장 자금 쏠림 지수**: 순자산 및 거래대금 상위 10개 ETF 점유율 집중도(Pareto/Concentration)
- **괴리율(Disparity Rate) 분포 히스토그램**: 현재가와 iNAV(순자산가치) 간의 괴리도 진단
- **괴리율 이상치 탐지**: 최고 프리미엄(고평가) TOP 5 및 최고 디스카운트(저평가) TOP 5
- **유동성 부족 관리 주의 종목**: 순자산 50억원 미만 또는 거래대금 1,000만원 미만 종목 선별

### 5. 전종목 인터랙티브 스크리너 (Interactive Screener)
- **실시간 검색**: ETF 종목명 또는 6자리 종목코드 즉각 검색 (`/` 단축키 지원)
- **다중 필터**: 운용사별, 자산군별(국내주식, 해외주식, 채권, 파생, 혼합, 원자재 등), 당일 등락별, 괴리율 주의 필터
- **인기 테마 태그**: `#배당/인컴`, `#커버드콜`, `#반도체`, `#AI/빅테크`, `#2차전지`, `#미국투자`, `#파킹/금리`, `#레버리지`, `#인버스`, `#바이오`, `#방산/우주`
- **다중 정렬**: 순자산순, 거래대금순, 괴리율순, 등락률순, 1M/3M/6M 수익률순
- **엑셀/CSV 내보내기**: 현재 필터된 종목 목록을 UTF-8 BOM 지원 CSV로 원클릭 저장
- **종목 상세 팝업**: 개별 ETF 클릭 시 세부 지표 및 네이버 증권 바로가기 링크 제공

### 6. 다크 테마 & 금융 전용 UI/UX
- 블룸버그/트레이딩뷰 스타일의 Obsidian Dark Glassmorphic 디자인
- 숫자 가독성을 위한 고정폭 폰트(`JetBrains Mono`) 및 `Pretendard` 한글 서체 적용
- 국내 KRX 기준(빨강 상승/파랑 하락) 및 글로벌 기준(녹색 상승/적색 하락) 원클릭 색상 전환 지원

---

## 📂 프로젝트 구조 (Project Structure)

```
etfdashboard/
├── index.html                   # 메인 대시보드 HTML
├── css/
│   └── styles.css               # Vanilla CSS 다크 테마 디자인 시스템
├── js/
│   ├── app.js                   # 전체 오케스트레이션 및 이벤트 핸들러
│   ├── eda.js                   # 통계 계산, 브랜드 매핑, 이상치 탐지 엔진
│   ├── charts.js                # Chart.js 시각화 모듈 (도넛, 바, 스캐터, 히스토그램)
│   └── screener.js              # 1,171개 종목 필터링, 정렬, 페이징, CSV 내보내기
├── data/
│   ├── etfs.json                # 실시간 수집된 1,171개 ETF 원본 데이터 (JSON)
│   └── etfs_data.js             # file:// 오프라인 실행용 스냅샷 (CORS 무관 로딩)
├── fetch_data.py                # uv 기반 고속 병렬 ETF 데이터 수집기
├── .github/
│   └── workflows/
│       └── update_data.yml      # 평일 장마감 후 GitHub Pages 자동 수집/배포 액션
└── README.md                    # 프로젝트 문서
```

---

## 🚀 빠른 시작 (Quick Start)

### 방법 1. 로컬 개발 서버 실행 (권장)

uv를 통해 파이썬 로컬 서버를 구동합니다:

```bash
# 1. 최신 ETF 데이터 수집 (선택 사항, 이미 수집된 스냅샷 포함)
uv run python fetch_data.py

# 2. 로컬 웹 서버 실행
uv run python -m http.server 8088

# 3. 브라우저에서 접속
# http://localhost:8088
```

### 방법 2. 별도 서버 없이 바로 열기 (Zero Config Offline)

`index.html` 파일을 더블클릭하여 브라우저에서 바로 열 수 있습니다.
내장된 `data/etfs_data.js`를 통해 브라우저 로컬 파일 CORS 제한 없이 1,171개 종목이 즉시 로드됩니다.

---

## 🔄 실시간 데이터 갱신 방식

네이버 증권 API는 브라우저 CORS 정책으로 인해 제3자 도메인에서의 직접 fetch가 제한될 수 있으므로, 아래 3가지 유연한 데이터 갱신을 지원합니다:

1. **Python `fetch_data.py` 원클릭 실행 (uv 활용)**:
   ```bash
   uv run python fetch_data.py
   ```
   멀티스레드 병렬 요청을 통해 약 1.5초 만에 12개 페이지 전체(1,171 종목)를 수집하여 `data/etfs.json`과 `data/etfs_data.js`를 갱신합니다.
2. **웹 대시보드 상단 [JSON 업로드]**:
   새로 수집된 `etfs.json`을 브라우저에 바로 드래그하거나 선택하여 즉시 반영할 수 있습니다.
3. **GitHub Actions 자동 갱신 배포**:
   `.github/workflows/update_data.yml` 워크플로우를 활성화하면 한국 시간 기준 평일 16:30(장마감 후)에 자동으로 데이터를 수집하고 GitHub Pages에 커밋 및 배포합니다.

---

## 📊 네이버 증권 ETF API 명세

- **엔드포인트**: `https://stock.naver.com/api/stockSecurity/etfs/v2/domestic`
- **주요 파라미터**:
  - `listingType=aumDesc`: 순자산총액 내림차순 정렬
  - `size=100`: 페이지당 최대 크기 (최대 100)
  - `index=0..11`: 페이지 인덱스 (0-based)
- **주요 제공 필드**:
  - `itemCode`: 단축 종목코드 (6자리)
  - `itemName`: ETF 종목명
  - `currentPrice`: 현재가
  - `changePrice` / `changeRate` / `priceMovement`: 등락폭, 등락률, 등락구분
  - `iNav`: 실시간 순자산가치 (Indicative NAV)
  - `tradingVolume` / `tradingValue`: 일일 거래량, 거래대금
  - `totalNetAssets`: 순자산총액 (AUM)
  - `returnRate1m` / `returnRate3m` / `returnRate6m`: 기간별 수익률
  - `etfType`: 세부 자산 분류 (국내주식형, 해외주식형, 채권형, 파생형 등)

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Design Tokens & Glassmorphism)
- **Charting**: Chart.js 4.4+ (Custom Tooltips, Logarithmic Scale, Histograms)
- **Icons**: Lucide Icons
- **Backend / Crawler**: Python 3.12+ (Standard Library `urllib.request` + `concurrent.futures`), Package Manager `uv`
- **CI/CD**: GitHub Actions (Scheduled Cron Workflow for GitHub Pages)
