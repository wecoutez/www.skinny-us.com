# 채팅 연결하기 — 5분 (이것만 하면 됩니다)

사이트 코드는 다 고쳐뒀습니다. 남은 건 **Apps Script 재배포 한 번**입니다.
이건 제가 대신 못 합니다 (Erin 계정 권한이 필요해서요).

---

## 1. 백엔드 코드 교체

1. SKNY_DB 스프레드시트 열기
   https://docs.google.com/spreadsheets/d/14SHZEmMpUJ1fuRsyYfgPUJayr1RRxqgUs_MY3biRiZI/edit
2. **확장 프로그램 → Apps Script**
3. 기존 코드 **전부 지우고** `skinnyus-backend.gs` 내용 전체 붙여넣기
4. 파일 안의 `ADMIN_KEY` 를 나만 아는 값으로 변경 → 저장 (Ctrl+S)

## 2. 시트 만들기 (권한 승인)

상단 함수 드롭다운에서 **`setup`** 선택 → **▶ 실행**
→ 권한 승인 팝업이 뜨면 전부 허용
→ SKNY_DB 에 `Messages` / `Members` / `Joins` 탭이 생기면 성공

## 3. 웹 앱으로 배포

**배포 → 새 배포 → 유형: 웹 앱**

| 항목 | 값 |
|---|---|
| 실행 계정 | **나** |
| 액세스 권한 | **모든 사용자** ← 여기가 제일 자주 틀립니다 |

배포 후 나오는 `https://script.google.com/macros/s/.../exec` URL **전체 복사**

## 4. 연결 확인 (10초)

브라우저 주소창에 복사한 URL 뒤에 **`?action=ping`** 을 붙여서 열어보세요.

- ✅ `{"ok":true,"pong":true,"sheet":"SKNY_DB",...}` → 성공
- ❌ 구글 로그인 화면 / "authorization required" → 3번의 **액세스 권한이 "모든 사용자"가 아닙니다**
- ❌ `{"ok":false,...}` → 코드가 덜 붙여넣어졌습니다

## 5. 사이트에 URL 넣기

`index.html` 과 `join.html` **두 파일 모두**에서 `CHAT_API` 를 찾아 새 URL 로 교체:

```js
var CHAT_API = "여기에_새_exec_URL";
```

지금 들어있는 값은 `...RMtk/exec` 입니다. 4번의 ping 이 성공했다면 그 URL 을 쓰면 됩니다.

## 6. 마지막 확인

사이트에서 💬 1:1 Chat 열기 → 이름·이메일·메시지 입력 → 전송
→ SKNY_DB 의 **Messages** 탭에 줄이 생기면 끝.

---

## ⚠️ 앞으로 코드를 고칠 때

Apps Script 는 **저장만으로는 반영되지 않습니다.**
`배포 → 배포 관리 → 연필(편집) → 버전: 새 버전 → 배포` 를 해야
`/exec` 이 새 코드를 실행합니다. (이렇게 하면 URL 은 그대로 유지됩니다.)

이걸 안 해서 "고쳤는데 그대로예요" 가 생기는 경우가 가장 많습니다.
