# 다음 세션에서 할 일 — Canva 이미지 넣기

Canva에서 만들어 둔 이미지 (media id는 canva-media.json):
- 도시 카드 배경 낮/밤: seoul, tokyo, paris, la, sf  (`<city>-day`, `<city>-night`)
- 홀로그램: ahran (전신), haim (러시안블루)

할 일
1. Canva export로 각 이미지 원본을 받아 `ahran/img/` 에 webp로 저장 (가로 800px 정도)
2. app.js `skyHtml()` 대신 도시 카드 배경을 이미지로: 현지 시간이 낮이면 `-day`, 밤이면 `-night`,
   새벽·해질녘은 그 위에 주황·보라 그라데이션을 살짝 덮기. 글씨 대비를 위해 아래쪽으로 어두운 그라데이션.
3. Today 가운데: body.js로 그리는 인체·고양이 대신(또는 겹쳐서) ahran / haim 이미지를 배경 나무 위에 배치,
   오늘 조심할 부위 빨간 점 표시는 이미지 위에 유지.
4. 공개 저장소이므로 사람 얼굴 사진을 바탕으로 만든 이미지는 넣기 전 사용자에게 확인.
