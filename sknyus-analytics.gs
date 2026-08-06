/**
 * SKNYUS — 방문자 분석 백엔드 (Google Apps Script)
 * ═══════════════════════════════════════════════════════
 * ⚠️ 이건 채팅/멤버 백엔드(skinnyus-backend.gs)와 **별개의 새 스크립트**입니다.
 *    기존 스크립트는 절대 건드리지 마세요.
 *
 * 설치 (5분):
 * 1. sheets.google.com → 새 스프레드시트 생성 (이름: sknyus-analytics)
 * 2. 확장 프로그램 → Apps Script → 기본 코드 지우고 이 파일 전체 붙여넣기
 * 3. 아래 ADMIN_KEY 를 나만 아는 값으로 변경
 * 4. 상단 함수 선택창에서 setup 선택 → 실행 → 권한 승인
 * 5. 배포 → 새 배포 → 유형: 웹 앱
 *      - 설명: v1
 *      - 실행 계정: 나
 *      - 액세스 권한: 모든 사용자   ← 반드시 이걸로
 * 6. 배포 URL(.../exec) 복사 → 다음 단계에서 사용
 * 7. 확인: 브라우저에서  <배포URL>?action=ping  열면 {"ok":true,...} 가 보여야 함
 *
 * 재배포 주의: 코드를 고친 뒤에는 반드시 "배포 관리 → 편집(연필) → 버전: 새 버전 → 배포"
 *             저장만으로는 /exec 에 반영되지 않습니다.
 */

var ADMIN_KEY = "CHANGE-ME-1234";   // ← 반드시 변경 (visits.html 에도 같은 값 입력)
var MAX_ROWS  = 60000;              // 넘으면 오래된 행부터 삭제

var HEAD = ["ts","vid","sess","event","detail","path","src","ref","refhost","tz","lang","device","isnew"];

/* ───────── 유틸 ───────── */
function ss_()   { return SpreadsheetApp.getActiveSpreadsheet(); }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean_(v, n){ return String(v == null ? "" : v).slice(0, n || 300); }

function vSheet_() {
  var s = ss_().getSheetByName("Visits");
  if (!s) {
    s = ss_().insertSheet("Visits");
    s.appendRow(HEAD);
    s.setFrozenRows(1);
    s.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  }
  return s;
}

function setup() {
  vSheet_();
  SpreadsheetApp.getUi === undefined ? null : null;
  Logger.log("OK — Visits 시트 준비 완료");
}

/* ───────── 수집 (POST) ───────── */
function doPost(e) {
  var b = {};
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok:false, error:"bad json" }); }

  var list = [];
  if (b.action === "hit")  list = [b];
  if (b.action === "hits" && b.batch && b.batch.length) list = b.batch.slice(0, 40);
  if (!list.length) return json_({ ok:false, error:"unknown action" });

  var now = new Date();
  var rows = [];
  for (var i = 0; i < list.length; i++) {
    var h = list[i] || {};
    if (!h.event) continue;
    rows.push([
      now,
      clean_(h.vid, 40),
      clean_(h.sess, 40),
      clean_(h.event, 24),
      clean_(h.detail, 160),
      clean_(h.path, 160),
      clean_(h.src, 60),
      clean_(h.ref, 300),
      clean_(h.refhost, 80),
      clean_(h.tz, 60),
      clean_(h.lang, 20),
      clean_(h.device, 20),
      h.isnew ? 1 : 0
    ]);
  }
  if (!rows.length) return json_({ ok:false, error:"empty" });

  var s = vSheet_();
  s.getRange(s.getLastRow() + 1, 1, rows.length, HEAD.length).setValues(rows);

  var over = s.getLastRow() - 1 - MAX_ROWS;
  if (over > 0) s.deleteRows(2, over);

  return json_({ ok:true, saved: rows.length });
}

/* ───────── 조회 (GET) ───────── */
function doGet(e) {
  var p = e.parameter || {};

  if (p.action === "ping") return json_({ ok:true, rows: Math.max(0, vSheet_().getLastRow() - 1), now: new Date() });

  if (p.action === "stats") {
    if (p.key !== ADMIN_KEY) return json_({ ok:false, error:"bad key" });
    return json_(stats_(parseInt(p.days, 10) || 30));
  }

  return json_({ ok:false, error:"unknown action" });
}

function stats_(days) {
  var s = vSheet_();
  var last = s.getLastRow();
  if (last < 2) return { ok:true, days:days, total:0, visitors:0, sessions:0, byDay:[], byTz:[], byRef:[], bySrc:[], byPick:[], byView:[], funnel:{}, recent:[] };

  var data = s.getRange(2, 1, last - 1, HEAD.length).getValues();
  var since = new Date(Date.now() - days * 86400000);
  var tzOff = Session.getScriptTimeZone();

  var vids = {}, sess = {}, day = {}, tz = {}, ref = {}, src = {}, pick = {}, view = {};
  var f = { visit:0, pick:0, join:0, pay:0, member:0 };
  var total = 0, recent = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var t = r[0];
    if (!(t instanceof Date) || t < since) continue;
    total++;

    var ev = String(r[3] || "");
    if (r[1]) vids[r[1]] = 1;
    if (r[2]) sess[r[2]] = 1;

    var dk = Utilities.formatDate(t, tzOff, "MM-dd");
    day[dk] = (day[dk] || 0) + 1;

    if (ev === "page") {
      if (r[9])  tz[r[9]]  = (tz[r[9]]  || 0) + 1;
      var rh = String(r[8] || "") || "(direct)";
      ref[rh] = (ref[rh] || 0) + 1;
      var sc = String(r[6] || "") || "(none)";
      src[sc] = (src[sc] || 0) + 1;
      f.visit++;
    }
    if (ev === "view")   { var vk = String(r[4] || "?"); view[vk] = (view[vk] || 0) + 1; }
    if (ev === "pick")   { var pk = String(r[4] || "?"); pick[pk] = (pick[pk] || 0) + 1; f.pick++; }
    if (ev === "join")   f.join++;
    if (ev === "pay")    f.pay++;
    if (ev === "member") f.member++;
  }

  var tail = data.slice(-60).reverse();
  for (var j = 0; j < tail.length && recent.length < 40; j++) {
    var q = tail[j];
    if (!(q[0] instanceof Date)) continue;
    recent.push({
      ts: Utilities.formatDate(q[0], tzOff, "MM/dd HH:mm"),
      event: q[3], detail: q[4], src: q[6], refhost: q[8], tz: q[9], lang: q[10], device: q[11]
    });
  }

  var top = function (o, n) {
    return Object.keys(o).map(function (k) { return { k:k, n:o[k] }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, n || 15);
  };
  var byDay = Object.keys(day).sort().map(function (k) { return { k:k, n:day[k] }; });

  return {
    ok: true, days: days, total: total,
    visitors: Object.keys(vids).length,
    sessions: Object.keys(sess).length,
    byDay: byDay,
    byTz:  top(tz, 20),
    byRef: top(ref, 15),
    bySrc: top(src, 15),
    byPick: top(pick, 20),
    byView: top(view, 15),
    funnel: f,
    recent: recent
  };
}
