
'엄격하게 사용';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { handler, normalize, normalizeKey, validYm } = require('../netlify/functions/apt-rent');

const originalFetch = global.fetch;
const originalKey = process.env.DATA_GO_KR_API_KEY;
after(() => {
  global.fetch = originalFetch;
  원래 키가 정의되지 않은 경우 process.env.DATA_GO_KR_API_KEY를 삭제합니다.
  그렇지 않으면 process.env.DATA_GO_KR_API_KEY = originalKey;
});

test('숫자 및 서명 표시 규정화', () => {
  const r = Normalize({aptNm:'테스트 아파트',dealYear:'2025',dealMonth:'1',dealDay:'9', 예금:'43,500',monthlyRent:'0', extraUseAr:'84.98'});
  assert.equal(r.deposit,43500);
  assert.equal(r.dealDate,'2025-01-09');
  assert.equal(r.area,84.98);
  assert.equal(r.monthlyRent,0);
});
test('Encoding API 키 기록 방지', () => {
  assert.equal(normalizeKey('foo%2Bbar%2Fbaz%3D'), 'foo+bar/baz=');
  assert.equal(normalizeKey('foo+bar/baz='), 'foo+bar/baz=');
});
test('잘못된 조회 변수 400다시', async () => {
  const res = await handler({httpMethod:'GET',queryStringParameters:{lawdCd:'abc',ymd:'202510'}});
  assert.equal(res.statusCode,400);
});
test('공공데이터 예제 XML 파싱 및 정규화', async () => {
  process.env.DATA_GO_KR_API_KEY = 'test+key/=';
  const xml = `<?xml version="1.0"?><response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items><item><aptNm>명륜동주상복합아남아파트</aptNm><buildYear>1999</buildYear><contractTerm/><contractType> </contractType><dealDay>20</dealDay><dealMonth>1</dealMonth><dealYear>2025</dealYear><deposit>43,500</deposit><excluUseAr>50.49</excluUseAr><floor>2</floor><jibun>237</jibun><monthlyRent>0</monthlyRent><preDeposit/><preMonthlyRent/><sggCd>11110</sggCd><umdNm>명륜2가</umdNm><useRRRight> </useRRRight></item></items><numOfRows>5000</numOfRows><pageNo>1</pageNo><totalCount>1</totalCount></body></response>`;
  요청된 대로 처리해 주세요;
  global.fetch = async (url) => { requested = new URL(url); return {ok:true,text:async()=>xml}; };
  const resp = wait handler({httpMethod:'GET',queryStringParameters:{lawdCd:'11110',ymd:'202501',pageNo:'1'}});
  const json = JSON.parse(resp.body);
  assert.equal(resp.statusCode,200);
  주장.equal(json.items[0].aptName,'명륜동주상복합아남아파트');
  assert.equal(json.items[0].deposit,43500);
  assert.equal(json.totalCount,1);
  assert.equal(requested.searchParams.get('serviceKey'),'test+key/=');
});
test('잘못된 인증 응답을 처리하지 않음', async () => {
  global.fetch = async()=>({ok:true,text:async()=>'<response><header><resultCode>30</resultCode><resultMsg>BAD_KEY</resultMsg></header></response>'});
  process.env.DATA_GO_KR_API_KEY = 'test';
  const resp = wait handler({httpMethod:'GET',queryStringParameters:{lawdCd:'11110',ymd:'202501'}});
  assert.equal(resp.statusCode,502);
  assert.match(JSON.parse(resp.body).error,/BAD_KEY/);
});
test('미래 연월 보기 차단', () => {
  assert.equal(validYm('299912'),false);
  assert.equal(validYm('202513'),false);
  assert.equal(validYm('202501'),true);
});
