'엄격하게 사용';

const ENDPOINT = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

// 공공데이터 API의 화면 XML 응답(<response>/<item>)이 추가되었습니다.
// 외부 npm 의존성이 없어 Netlify Functions에 그대로 배포할 수 있습니다.
function xmlText(value) {
  return String(value || '').replace(/&(?:amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#[0-9]+);/g, entity => {
    const named = { '&': '&', '<': '<', '>': '>', '"': '"', ''': "'" };
    Object.prototype.hasOwnProperty.call(named, entity))이면 named[entity]를 반환합니다.
    const hex = entity.startsWith('&#x');
    const n = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    n > 0 && n <= 0x10FFFF && !(n >= 0xD800 && n <= 0xDFFF) ? String.fromCodePoint(n) : '�';
  }).손질();
}
함수 태그(콘텐츠, 이름) {
  const found = new RegExp(String.raw`<${name}(?:\s+[^>]*)?>([\s\S]*?)<\/${name}>`).exec(content);
  (찾지 못했으면) ''를 반환합니다.
  return xmlText(found[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1'));
}
함수 parseApiXml(xml) {
  if (typeof xml !== 'string' || !xml.includes('<')) throw new Error('유효하지 않은 XML');
  const code = tag(xml, 'resultCode');
  const message = tag(xml, 'resultMsg') || tag(xml, 'returnAuthMsg');
  const items = [];
  const fieldNames = [
    'aptNm','umdNm','jibun','excluUseAr','dealYear','dealMonth','dealDay',
    '보증금', '월세', '층', '건축년도', '계약 유형',
    '계약기간', '권리사용권', '선불 보증금', '선불 월세'
  ];
  for (const found of xml.matchAll(/<item(?:\s+[^>]*)?>([\s\S]*?)<\/item>/g)) {
    const fields = {};
    for (const field of fieldNames) fields[field] = tag(found[1], field);
    항목들을 필드에 푸시합니다.
  }
  return { code, message, items, totalCount: tag(xml, 'totalCount'), numOfRows: tag(xml, 'numOfRows') };
}

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

함수 asText(value) {
  반환 값이 '정의되지 않음'이거나, 값이 'null'이거나, 값의 유형이 '객체'인 경우
    ? '' : String(value).trim();
}

함수 toNumber(value) {
  const normalized = asText(value).replace(/,/g, '');
  정규화되지 않았으면 0을 반환합니다.
  const n = Number(정규화된);
  Number.isFinite(n) ? n : 0을 반환합니다.
}

함수 normalize(item) {
  const y = asText(item.dealYear);
  const m = asText(item.dealMonth).padStart(2, '0');
  const d = asText(item.dealDay).padStart(2, '0');
  반품 {
    aptName: asText(item.aptNm),
    dong: asText(item.umdNm),
    jibun: asText(item.jibun),
    영역: toNumber(item.excluUseAr),
    dealDate: /^\d{4}-\d{2}-\d{2}$/.test(`${y}-${m}-${d}`) ? `${y}-${m}-${d}` : '',
    예금: toNumber(item.deposit), //만원
    MonthlyRent: toNumber(item.monthlyRent), //만원/월
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
  // URLSearchParams가 본인을 승인하고 사전에 동의한 키는 한 번만 감사합니다.
  try { return decodeURIComponent(raw); } catch { return raw; }
}

함수 validYm(ym) {
  if (!/^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(ym)) return false;
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    시간대: '아시아/서울', 연도: '숫자', 월: '두 자리 숫자'
  }).formatToParts(now);
  const seoul = parts.find(p => p.type === 'year').value + parts.find(p => p.type === 'month').value;
  ym <= 서울을 반환합니다.
}

비동기 함수 핸들러(이벤트) {
  if (event.httpMethod !== 'GET') return reply(405, { error: 'GET 요청만 지원합니다.' });
  const qs = event.queryStringParameters || {};
  const lawdCd = String(qs.lawdCd || '');
  const ymd = String(qs.ymd || '');
  const pageNo = Number(qs.pageNo || 1);
  const pageSize = 5000;

  if (!/^\d{5}$/.test(lawdCd) || !validYm(ymd) || !Number.isInteger(pageNo) || 페이지번호 < 1 || 페이지번호 > 100) {
    return reply(400, { error: '지역코드(5자리), 조회월(YYYYMM), 페이지번호를 확인하세요. 미래월은 조회할 수 없습니다.' });
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey || apiKey === '발급받은_인증키') {
    return reply(503, { 오류: '서버에 DATA_GO_KR_API_KEY가 설정되어 있지 않습니다. Netlify 다양한 환경을 등록하세요.' });
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set('serviceKey', normalizeKey(apiKey));
  url.searchParams.set('LAWD_CD', lawdCd);
  url.searchParams.set('DEAL_YMD', ymd);
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(pageSize));

  노력하다 {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    res를 놔두세요;
    노력하다 {
      res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/xml,text/xml,*/*' } });
    } 마지막으로 {
      clearTimeout(타임아웃);
    }
    만약 (res.ok가 아니면) {
      return reply(502, { error: `공공데이터 API HTTP 오류(${res.status}). 조치 후 다시 시도하세요.` });
    }
    const xml = await res.text();
    파싱된 것을 저장하세요;
    try { parsed = parseApiXml(xml); } catch {
      return reply(502, { error: '공공데이터 API 응답(XML)을 입력했습니다.' });
    }
    만약 ['00', '000']에 parsed.code가 포함되어 있지 않다면 {
      return reply(502, { error: `공공데이터 API 오류(${parsed.code || '인증/응답'}): ${parsed.message || '알 수 없는 오류'}. 인증키와 활용신청 상태를 확인하세요.` });
    }
    const items = parsed.items.map(normalize);
    const totalCount = Number.parseInt(parsed.totalCount, 10);
    const reportedPageSize = Number.parseInt(parsed.numOfRows, 10);
    200, {를 반환하는 답글
      lawdCd,
      ymd,
      페이지 번호,
      pageSize: Number.isInteger(reportedPageSize) && reportedPageSize > 0 ? reportedPageSize : pageSize,
      totalCount: Number.isFinite(totalCount) ? totalCount : items.length,
      품목,
      출처: '국토교통부 아파트 전월실거래가 자료',
    });
  } catch (e) {
    return reply(502, { error: e?.name === 'AbortError' ? '국토교통부 API 응답 시간이 초과되었습니다.' : '외부 API 연결에 실패했습니다. 방해 후 다시 시도하세요.' });
  }
}

module.exports = { handler, normalize, normalizeKey, validYm, parseApiXml };
