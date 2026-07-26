/**
 * Skinny-us 채팅 + 멤버 관리 백엔드 (Google Apps Script)
 * ─────────────────────────────────────────────────────
 * 설치 (5분):
 * 1. sheets.google.com 새 스프레드시트 생성 (이름: skinnyus-admin)
 * 2. 확장 프로그램 → Apps Script → 이 코드 전체 붙여넣기
 * 3. 아래 ADMIN_KEY를 나만 아는 값으로 변경
 * 4. 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행 계정: 나
 *    - 액세스 권한: 모든 사용자(익명 포함)  ← 중요
 * 5. 배포 URL(https://script.google.com/macros/s/…/exec)을
 *    index.html의 CHAT_API에 붙여넣기
 * 6. 같은 ADMIN_KEY로 사이트 #/suadmin 에서 로그인
 */

var ADMIN_KEY = "CHANGE-ME-1234";   // ← 반드시 변경

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet(name, headers) {
  var s = ss().getSheetByName(name);
  if (!s) { s = ss().insertSheet(name); s.appendRow(headers); }
  return s;
}
function msgSheet() { return sheet("Messages", ["ts","vid","name","from","text","read"]); }
function memSheet() { return sheet("Members",  ["ts","email","name","status","note"]); }
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = e.parameter || {};
  if (p.action === "thread" && p.vid) {
    var rows = msgSheet().getDataRange().getValues().slice(1)
      .filter(function (r) { return String(r[1]) === String(p.vid); })
      .map(function (r) { return { ts: r[0], from: r[3], text: r[4] }; });
    return json({ ok: true, messages: rows.slice(-100) });
  }
  if (p.action === "admin") {
    if (p.key !== ADMIN_KEY) return json({ ok: false, error: "bad key" });
    var msgs = msgSheet().getDataRange().getValues().slice(1).slice(-800)
      .map(function (r) { return { ts: r[0], vid: r[1], name: r[2], from: r[3], text: r[4], read: r[5] }; });
    var mems = memSheet().getDataRange().getValues().slice(1)
      .map(function (r) { return { ts: r[0], email: r[1], name: r[2], status: r[3], note: r[4] }; });
    return json({ ok: true, messages: msgs, members: mems });
  }
  return json({ ok: false, error: "unknown action" });
}

function doPost(e) {
  var b = {};
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: "bad json" }); }
  var clean = function (v, n) { return String(v == null ? "" : v).slice(0, n || 2000); };

  if (b.action === "send" && b.vid && b.text) {
    msgSheet().appendRow([new Date(), clean(b.vid, 40), clean(b.name, 80), "visitor", clean(b.text), ""]);
    return json({ ok: true });
  }
  if (b.key !== ADMIN_KEY) return json({ ok: false, error: "bad key" });

  if (b.action === "reply" && b.vid && b.text) {
    var s = msgSheet();
    s.appendRow([new Date(), clean(b.vid, 40), "", "admin", clean(b.text), ""]);
    // 해당 스레드의 방문자 메시지 읽음 처리
    var data = s.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(b.vid) && data[i][3] === "visitor" && !data[i][5]) {
        s.getRange(i + 1, 6).setValue("y");
      }
    }
    return json({ ok: true });
  }
  if (b.action === "member" && b.email) {
    var ms = memSheet(); var d = ms.getDataRange().getValues();
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
    var ms2 = memSheet(); var d2 = ms2.getDataRange().getValues();
    for (var k = d2.length - 1; k >= 1; k--) {
      if (String(d2[k][1]).toLowerCase() === clean(b.email, 120).toLowerCase()) ms2.deleteRow(k + 1);
    }
    return json({ ok: true });
  }
  return json({ ok: false, error: "unknown action" });
}
