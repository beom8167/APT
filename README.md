# 아파트 전월세 실거래가 조회 웹

국토교통부 공식 **아파트 전월세 실거래가 자료** OpenAPI를 조회하는 Netlify용 웹앱입니다. 일반 웹페이지에서 API 인증키가 노출되지 않도록 Netlify Functions를 중계 서버로 사용합니다. OpenAI API나 유료 데이터 서비스는 사용하지 않습니다.

> **현재 상태:** 앱 코드 완성. 실제 거래조회에는 본인의 공공데이터포털 API 키 등록과 Netlify 배포가 필요합니다. 키가 없으므로 실제 외부 거래 응답을 검증한 것은 아닙니다.

## 기능

- 시군구 법정동코드(앞 5자리)·계약년월(`YYYYMM`)로 공개 실거래 호출
- 주요 시군구 선택 또는 전국 임의의 5자리 지역코드 직접 입력
- 1~12개월 조회, API 페이지별 자료 취합(누락 검증), 최대 3개월 동시조회
- 아파트명, 면적 ±오차, 전세/월세 필터
- 계약일·법정동·지번·전용면적·층·보증금·월세·계약구분 조회
- 결과 건수, 전세/월세 건수, 전세 보증금 중앙값
- 엑셀로 열 수 있는 UTF-8 BOM CSV 다운로드 (필터 결과)
- 50개씩 결과 페이지 표시, 모바일 대응, 실패 월 표시

## 공식 API

- 출처: https://www.data.go.kr/data/15126474/openapi.do
- 엔드포인트: `https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent`
- 인자: `serviceKey` / `LAWD_CD` (시군구 5자리) / `DEAL_YMD` (YYYYMM) / `pageNo` / `numOfRows`
- 반환 포맷: XML

## 공공데이터포털에서 인증키 받기

1. [공공데이터포털](https://www.data.go.kr/) 회원가입·로그인
2. [국토교통부_아파트 전월세 실거래가 자료](https://www.data.go.kr/data/15126474/openapi.do)에서 **활용신청**
3. 자동승인 후 발급받은 일반인증키(Decoding)를 복사 (Encoding 키도 처리)
4. 승인 서비스 및 키 활성화 상태 확인. 실제 반영에는 시간이 걸릴 수 있음.

## Netlify 배포 (추천)

### 방법 A: GitHub 연결

1. 이 폴더의 모든 파일을 GitHub 저장소 루트에 업로드합니다. (압축파일 자체를 업로드하지 마세요.)
2. Netlify > **Add new project > Import an existing project** 에서 저장소 선택
3. Base directory는 비우고, Publish directory는 `.` 로 설정합니다. `netlify.toml`에 이미 정의되어 있습니다.
4. Netlify > **Project configuration > Environment variables > Add a variable**에서 아래를 등록합니다.

   - Key: `DATA_GO_KR_API_KEY`
   - Value: 공공데이터포털에서 발급된 **실제** 인증키

5. 사이트 **Deploy / Redeploy** 한 뒤 사이트 URL을 방문해 검색합니다. 
6. 환경변수는 **Functions 런타임에서 사용할 수 있는 범위**로 지정하세요.

> 반드시 환경변수에 저장하세요. **index.html, app.js, GitHub 저장소에 키를 직접 붙여 넣으면 안 됩니다.**

### 방법 B: 명령줄

Node.js 20 이상에서:

```bash
npm install
npm run dev
```

로컬 테스트 시 `.env`를 만들고 `DATA_GO_KR_API_KEY=인증키`를 입력하세요 (`.env` 파일은 Git 커밋 금지). 처음 실행하면 Netlify CLI 설치를 묻는 메시지가 나올 수 있습니다. 설치 후 로컬 개발 서버는 일반적으로 `http://localhost:8888`입니다. (실제 서버 함수와 XML 변환에는 npm 의존성이 없습니다.)

Netlify CLI로 배포하려면 `npx netlify login` 후 `npx netlify deploy --build --prod` 명령을 사용할 수도 있지만, 사이트 연결·환경변수 선등록이 필요합니다. Functions 번들이 포함되지 않는 일반 정적 사이트 배포(Netlify Drop에 ZIP만 드래그)는 사용하지 마세요.

## 처음 조회하는 방법

1. 첫 화면에서 주요 지역을 선택하거나 5자리 법정동 코드를 입력합니다.
2. 계약월 범위 선택 (초기값: 최근 6개 역월, 해당 월 포함)
3. **실거래가 조회** 누르기
4. 아파트명·면적·전세/월세를 바꾸면 이미 조회된 데이터에서 즉시 필터됩니다.
5. **CSV 다운로드** 클릭하여 엑셀에서 열기

### 유의사항

- 전국 단위 일괄 조회 API가 아닙니다. 시군구별 조회이며, **법정동코드 뒤 5자리는 사용하지 않습니다.**
- 주요 지역 메뉴는 편의용 예시 코드이며 전국의 모든 시군구를 포함하지 않습니다. 그 밖의 시군구도 지역코드 직접 입력으로 조회할 수 있습니다. 법정동코드는 https://www.code.go.kr/stdcode/regCodeL.do?menuNo=101010100010 에서 확인하세요. 행정구역 개편으로 코드가 바뀐 지역은 최신 코드를 입력해야 합니다.
- '실시간'은 요청 시점에 **공개된 최신 내역**을 의미하며, 실제 계약 직후 공개된다는 뜻이 아닙니다.
- 계약 신고·확정일자 자료를 바탕으로 하며 취소·정정·누락·공개 지연이 있을 수 있습니다.
- 개인정보보호상 아파트 동·호수는 제공되지 않습니다.
- 전용면적이 다른 여러 단지의 거래를 섞은 통계는 특정 아파트 시세로 사용하기에 부적합할 수 있습니다.
- 월세 0인 건은 전세로 표시하며, 전월세 혼합 거래를 전세환산해 비교하는 기능은 현 버전에는 없습니다.
- KB부동산 시세·현재 매물 호가·주소-좌표변환·반경 검색은 연결하지 않았습니다. 그런 기능은 별도 데이터 접근권한/좌표 API가 필요합니다.
- 공개 웹사이트 운영 시 API 트래픽(기본 개발계정 1만 호출 등), 접근 권한, 예상 사용량을 확인하세요. 기간 및 지역에 따라 한 검색에도 여러 번 호출됩니다.
- 이 버전에는 자체 사용자 인증/접근통제가 없으므로 사내 전용으로 운영하려면 Netlify 사이트 접근통제 등을 추가하는 것이 좋습니다.

## 파일 구성

```text
apt-rent-web/
├─ index.html                 # 검색 UI
├─ styles.css                 # 디자인
├─ app.js                     # 검색·필터·페이지·CSV
├─ netlify.toml               # 배포 설정
├─ package.json               # 실행·테스트 명령
├─ .env.example               # 서버 환경변수 예시
├─ .gitignore
├─ netlify/functions/
│  └─ apt-rent.js             # API 키 비노출 공식 API 호출 + XML 변환
└─ tests/
   └─ api.test.js             # 서버 모의응답 테스트
```

## 테스트

```bash
npm install
npm test
```

외부 패키지 없이 API 응답 구조를 점검하는 모의 테스트입니다. **실제 조회 확인은 인증키 설정 후 브라우저에서 해야 합니다.**
