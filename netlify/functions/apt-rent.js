'엄격하게 사용';

// Netlify Function: 국토교통부 아파트 전월세 실거래가 API
// GitHub에 인증키를 약속하지 마세요. Netlify 환경의 다양한 DATA_GO_KR_API_KEY를 사용합니다.
const ENDPOINT = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';
const PAGE_SIZE = 1000;

함수 reply(statusCode, body) {
  반품 {
    상태 코드,
    헤더: {
      'Content-Type': 'application/json; charset=utf-8',
      '캐시 제어': '저장 안 함',
      'X-Content-Type-Options': 'nosniff',
    },
    본문: JSON.stringify(body),
  };
}

함수 decodeXml(text) {
  return String(text ?? '').replace(/&(amp|lt|gt|quot|apos|#x[\da-fA-F]+|#\d+);/g, (match, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    Object.prototype.hasOwnProperty.call(named, entity))이면 named[entity]를 반환합니다.
    const hex = entity.startsWith('#x');
    const codepoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    코드포인트가 0보다 크고 코드포인트가 0x10ffff보다 작거나 같으면 반환하고, 코드포인트가 0xd800보다 크거나 같고 코드포인트가 0xdfff보다 작거나 같으면 반환하지 않습니다.
      ? String.fromCodePoint(codepoint) : '\uFFFD';
  }).손질();
}

함수 태그(xml, 이름) {
  const pattern = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i');
  const match = pattern.exec(xml);
  return match ? decodeXml(match[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')) : '';
}

함수 parseApiXml(xml) {
  if (typeof xml !== 'string' || !/<(?:\?xml|response|OpenAPI_ServiceResponse)/i.test(xml)) {
    throw new Error('XML 응답이 아닙니다.');
  }
  const code = tag(xml, 'resultCode') || tag(xml, 'returnReasonCode');
  const message = tag(xml, 'resultMsg') || tag(xml, 'returnAuthMsg') || tag(xml, 'errMsg');
  const fieldNames = [
    'aptNm', 'umdNm', 'jibun', 'excluUseAr', 'dealYear', 'dealMonth', 'dealDay',
    '보증금', '월세', '층', '건축년도', '계약 유형', '계약 기간',
    '권리 사용', '예치금', '월세 선납금',
  ];
  const items = [];
  for (const found of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const item = {};
    for (const field of fieldNames) item[field] = tag(found[1], field);
    항목들을 푸시(item);
  }
  반품 {
    코드, 메시지, 항목,
    totalCount: tag(xml, 'totalCount'),
    numOfRows: tag(xml, 'numOfRows'),
  };
}

함수 asText(value) {
  return (value === undefined || value === null || typeof value === 'object') ? '' : String(value).trim();
}

함수 toNumber(value) {
  const number = Number(asText(value).replace(/,/g, ''));
  Number.isFinite(number) ? number : 0을 반환합니다.
}

함수 normalize(item) {
  const y = asText(item.dealYear);
  const m = asText(item.dealMonth).padStart(2, '0');
  const d = asText(item.dealDay).padStart(2, '0');
  const date = `${y}-${m}-${d}`;
  반품 {
    aptName: asText(item.aptNm),
    dong: asText(item.umdNm),
    jibun: asText(item.jibun),
    영역: toNumber(item.excluUseAr),
    dealDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    예금: toNumber(item.deposit), // 만 원
    MonthlyRent: toNumber(item.monthlyRent), // 만 원/월
    층: toNumber(item.floor),
    빌드 연도: toNumber(item.buildYear),
    계약 유형: asText(item.contractType),
    계약 조건: asText(item.contractTerm),
    renewalRight: asText(item.useRRRight),
    이전 입금: toNumber(item.preDeposit),
    이전월 임대료: toNumber(item.preMonthlyRent),
  };
}

함수 normalizeKey(raw) {
  const value = String(raw ?? '').trim();
  // 포털에서 복사하거나 승인을 받아 입력하세요.
  try { return decodeURIComponent(value); } catch { return value; }
}

함수 validYm(ym) {
  if (!/^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(ym)) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    시간대: 'Asia/Seoul', 연도: '숫자', 월: '두 자리',
  }).formatToParts(new Date());
  const currentYm = parts.find(p => p.type === 'year').value + parts.find(p => p.type === 'month').value;
  ym <= currentYm을 반환합니다.
}

비동기 함수 핸들러(이벤트) {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'GET 요청만 지원합니다.' });
  const qs = event.queryStringParameters || {};
  const lawdCd = String(qs.lawdCd || '');
  const ymd = String(qs.ymd || '');
  const pageNo = Number(qs.pageNo || 1);
  if (!/^\d{5}$/.test(lawdCd) || !validYm(ymd) || !Number.isInteger(pageNo) || 페이지번호 < 1 || 페이지번호 > 100) {
    return reply(400, { error: '시군구코드(5자리),계약년월(YYYYMM), 페이지번호를 확인하세요.' });
  }

  const apiKey = normalizeKey(process.env.DATA_GO_KR_API_KEY);
  if (!apiKey || apiKey === '발급받은_인증키') {
    return reply(503, { 오류: 'DATA_GO_KR_API_KEY 환경 변수가 없습니다. Netlify 환경 변수를 등록하고 재배포하세요.' });
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('LAWD_CD', lawdCd);
  url.searchParams.set('DEAL_YMD', ymd);
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(PAGE_SIZE));

  응답을 기다립니다.
  노력하다 {
    응답 = await fetch(url, {
      신호: 중단 신호.타임아웃(12000),
      헤더: { Accept: 'application/xml,text/xml,*/*' },
    });
  } catch (err) {
    console.error('APT 업스트림 네트워크 실패:', err.name); // URL/인증키 로그인 방지
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return reply(502, { error: isTimeout ? '국토교통부 API 응답 시간이 초과되었습니다.' : '국토교통부 API 네트워크 연결에 실패했습니다.', stage: 'network' });
  }

  응답이 괜찮지 않으면 {
    console.error('APT 업스트림 HTTP 상태:', response.status);
    return reply(502, { error: `국토교통부 API HTTP ${response.status} 오류`, stage: 'http' });
  }

  파싱된 것을 저장하세요;
  노력하다 {
    parsed = parseApiXml(await response.text());
  } 잡다 {
    return reply(502, { error: '국토교통부 API가 올바른 XML을 반환하지 않았습니다.', stage: 'xml' });
  }
  만약 ['00', '000']에 parsed.code가 포함되어 있지 않다면 {
    console.error('APT 업스트림 결과 코드:', parsed.code);
    return reply(502, { error: `국토 교통부 API 오류 (${parsed.code || '응답 코드 없음'}): ${parsed.message || '인증/활용신청 상태 확인 필요'}`, stage: 'api' });
  }

  const items = parsed.items.map(normalize);
  const totalCount = Number.parseInt(parsed.totalCount, 10);
  const resultPageSize = Number.parseInt(parsed.numOfRows, 10);
  200, {를 반환하는 답글
    lawdCd, ymd, 페이지 번호,
    pageSize: Number.isInteger(resultPageSize) && resultPageSize > 0 ? resultPageSize : PAGE_SIZE,
    totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
    품목,
    출처: '국토교통부_아파트 전월세 실거래가 자료',
  });
}

module.exports = { handler, normalize, normalizeKey, validYm, parseApiXml };
