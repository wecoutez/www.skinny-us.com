/**
 * Skinny-us 채팅 + 리드 + 멤버 관리 백엔드 (Google Apps Script)
 * ══════════════════════════════════════════════════════════════
 *
 * 이 버전에서 고친 것
 * ─────────────────────────────────────────────────────────────
 * 1) 스프레드시트를 ID로 직접 연다 (openById).
 *    예전 코드는 getActiveSpreadsheet() 였다 — 스크립트가 "어느 시트에 붙어
 *    있느냐"에 따라 기록 위치가 달라져서, 배포를 다시 할 때마다 엉뚱한 시트에
 *    쌓이거나 아무 데도 안 쌓일 수 있었다. 이제는 항상 SKNY_DB 로 간다.
 * 2) action:"join" 처리 추가.
 *    join.html 은 예전부터 {action:"join"} 을 보내고 있었는데 백엔드에 그 분기가
 *    없었다. → key 검사에 걸려 "bad key" 로 전부 버려졌다. 결제 직전 단계의
 *    이름·이메일(가장 값비싼 리드)이 통째로 유실되던 자리다.
 * 3) 이름과 이메일을 분리해서 저장 (Messages 시트에 email 컬럼 추가).
 * 4) action:"ping" 추가 — 연결이 살아있는지 1초 만에 확인하는 용도.
 * 5) 모든 응답에 성공/실패 이유를 담아 돌려준다 (사이트에서 에러를 띄울 수 있게).
 *
 * ══════════════════════════════════════════════════════════════
 * 설치 / 재배포 (5분)
 * ══════════════════════════════════════════════════════════════
 * 1. SKNY_DB 스프레드시트 열기
 *    https://docs.google.com/spreadsheets/d/14SHZEmMpUJ1fuRsyYfgPUJayr1RRxqgUs_MY3biRiZI/edit
 * 2. 확장 프로그램 → Apps Script → 기존 코드 전부 지우고 이 파일 전체 붙여넣기
 * 3. 아래 ADMIN_KEY 를 나만 아는 값으로 변경  ← 꼭!
 * 4. 저장 후 ▶ 실행 한 번 (setup 함수 선택) → 권한 승인 팝업 허용
 *    → Messages / Members / Joins 시트가 만들어지고 헤더가 잡힌다
 * 5. 배포 → 새 배포 → 유형: 웹 앱
 *      - 설명: 아무거나
 *      - 실행 계정: 나
 *      - 액세스 권한: **모든 사용자** (익명 포함)   ← 여기가 제일 자주 틀리는 곳
 * 6. 나오는 URL(https://script.google.com/macros/s/…/exec) 전체 복사
 * 7. index.html 과 join.html 의 CHAT_API 값에 붙여넣기 (두 파일 모두!)
 * 8. 확인: 브라우저 주소창에 그 URL 뒤에 ?action=ping 을 붙여서 열어본다.
 *      {"ok":true,"pong":true,...} 가 보이면 연결 성공.
 *      로그인 화면이나 "authorization required" 가 보이면 5번의 액세스 권한이
 *      "모든 사용자" 가 아니다.
 *
 * ⚠️ 코드를 고칠 때마다 "배포 관리 → 편집(연필) → 버전: 새 버전 → 배포" 를
 *    해야 반영된다. 저장만 해서는 /exec 이 옛날 코드를 계속 실행한다.
 *    (기존 URL을 유지하고 싶으면 '새 배포'가 아니라 '배포 관리'에서 버전만 올릴 것)
 */

// ═══ 설정 ═══════════════════════════════════════════════════════
var SHEET_ID  = "14SHZEmMpUJ1fuRsyYfgPUJayr1RRxqgUs_MY3biRiZI";  // SKNY_DB
var ADMIN_KEY = "CHANGE-ME-1234";   // ← 반드시 변경 (사이트 #/suadmin 에서 쓰는 키)

// ═══ 시트 헬퍼 ═══════════════════════════════════════════════════
function ss() { return SpreadsheetApp.openById(SHEET_ID); }

function sheet(name, headers) {
  var book = ss();
  var s = book.getSheetByName(name);
  if (!s) {
    s = book.insertSheet(name);
    s.appendRow(headers);
    s.setFrozenRows(1);
    return s;
  }
  // 이미 있는 시트라도 헤더가 비어 있거나 컬럼이 늘어난 경우 맞춰준다
  if (s.getLastRow() === 0) {
    s.appendRow(headers);
    s.setFrozenRows(1);
  } else if (s.getLastColumn() < headers.length) {
    s.getRange(1, 1, 1, headers.length).setValues([headers]);
    s.setFrozenRows(1);
  }
  return s;
}

// name 과 email 을 분리해서 보관한다
function msgSheet()  { return sheet("Messages", ["ts","vid","name","email","from","text","read"]); }
function memSheet()  { return sheet("Members",  ["ts","email","name","status","note"]); }
function joinSheet() { return sheet("Joins",    ["ts","name","email","plan","note"]); }

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean(v, n) { return String(v == null ? "" : v).slice(0, n || 2000); }

// 설치 직후 한 번 실행해서 시트와 권한을 만들어 두는 용도
function setup() {
  msgSheet(); memSheet(); joinSheet();
  Logger.log("OK — SKNY_DB 에 Messages / Members / Joins 준비 완료");
}

// ═══ GET ════════════════════════════════════════════════════════
function doGet(e) {
  var p = (e && e.parameter) || {};

  // 연결 확인용 — 브라우저에서 …/exec?action=ping 으로 열어보면 된다
  if (p.action === "ping") {
    return json({ ok: true, pong: true, sheet: ss().getName(), at: new Date().toISOString() });
  }

  if (p.action === "thread" && p.vid) {
    var rows = msgSheet().getDataRange().getValues().slice(1)
      .filter(function (r) { return String(r[1]) === String(p.vid); })
      .map(function (r) { return { ts: r[0], from: r[4], text: r[5] }; });
    return json({ ok: true, messages: rows.slice(-100) });
  }

  if (p.action === "admin") {
    if (p.key !== ADMIN_KEY) return json({ ok: false, error: "bad key" });
    var msgs = msgSheet().getDataRange().getValues().slice(1).slice(-800)
      .map(function (r) { return { ts: r[0], vid: r[1], name: r[2], email: r[3], from: r[4], text: r[5], read: r[6] }; });
    var mems = memSheet().getDataRange().getValues().slice(1)
      .map(function (r) { return { ts: r[0], email: r[1], name: r[2], status: r[3], note: r[4] }; });
    var joins = joinSheet().getDataRange().getValues().slice(1).slice(-300)
      .map(function (r) { return { ts: r[0], name: r[1], email: r[2], plan: r[3], note: r[4] }; });
    return json({ ok: true, messages: msgs, members: mems, joins: joins });
  }

  return json({ ok: false, error: "unknown action" });
}

// ═══ POST ═══════════════════════════════════════════════════════
function doPost(e) {
  var b = {};
  try { b = JSON.parse(e.postData.contents); }
  catch (err) { return json({ ok: false, error: "bad json" }); }

  // ── 인증 불필요: 방문자가 보내는 것들 ──────────────────────────

  // 채팅 메시지
  if (b.action === "send" && b.vid && b.text) {
    msgSheet().appendRow([
      new Date(), clean(b.vid, 40), clean(b.name, 80), clean(b.email, 120),
      "visitor", clean(b.text), ""
    ]);
    return json({ ok: true, saved: "message" });
  }

  // 결제 직전 리드 (join.html) — 예전 버전엔 이 분기가 없어서 전부 버려졌다
  if (b.action === "join" && (b.email || b.name)) {
    joinSheet().appendRow([
      new Date(), clean(b.name, 80), clean(b.email, 120),
      clean(b.plan, 40), clean(b.note, 500)
    ]);
    return json({ ok: true, saved: "join" });
  }

  // ── 여기서부터 관리자 전용 ────────────────────────────────────
  if (b.key !== ADMIN_KEY) return json({ ok: false, error: "bad key" });

  if (b.action === "reply" && b.vid && b.text) {
    var s = msgSheet();
    s.appendRow([new Date(), clean(b.vid, 40), "", "", "admin", clean(b.text), ""]);
    // 해당 스레드의 방문자 메시지 읽음 처리
    var data = s.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(b.vid) && data[i][4] === "visitor" && !data[i][6]) {
        s.getRange(i + 1, 7).setValue("y");
      }
    }
    return json({ ok: true });
  }

  if (b.action === "member" && b.email) {
    var ms = memSheet(), d = ms.getDataRange().getValues();
    for (var j = 1; j < d.length; j++) {
      if (String(d[j][1]).toLowerCase() === clean(b.email, 120).toLowerCase()) {
        ms.getRange(j + 1, 3, 1, 3).setValues([[clean(b.name, 80), clean(b.status, 20) || "active", clean(b.note, 500)]]);
        return json({ ok: true, updated: true });
      }
    }
    ms.appendRow([new Date(), clean(b.email, 120), clean(b.name, 80), clean(b.status, 20) || "active", clean(b.note, 500)]);
    return json({ ok: true, created: true });
  }

  if (b.action === "memberDel" && b.email) {
    var ms2 = memSheet(), d2 = ms2.getDataRange().getValues();
    for (var k = d2.length - 1; k >= 1; k--) {
      if (String(d2[k][1]).toLowerCase() === clean(b.email, 120).toLowerCase()) ms2.deleteRow(k + 1);
    }
    return json({ ok: true });
  }

  return json({ ok: false, error: "unknown action" });
}
