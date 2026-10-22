# power-cube

광교중흥s클래스아파트 파워큐브 이동형 충전기의 그룹별 충전 상태를 모바일에서 보는 웹사이트.

- 화면: GitHub Pages (`web/`) → https://jongh0.github.io/power-cube/
- 데이터: Vercel 서버리스 함수 (`api/status.js`) 가 ev-line 에 로그인해 조회 (방문 시에만, 60초 캐시)
- 계정 정보는 Vercel 환경변수에만 저장 (저장소에 없음)

## 배포 절차
1. **Vercel**: GitHub 저장소 Import (Framework: Other, 빌드 명령 없음)
2. Vercel → Settings → Environment Variables 에 등록 (Sensitive 체크)
   - `USER_ID`, `USER_PWD`, `STATION_ID=165170000001`, `ALLOWED_ORIGIN=https://jongh0.github.io`
3. 배포된 도메인을 `web/app.js` 의 `API_URL` 에 입력 후 커밋/푸시
4. **GitHub**: Settings → Pages → Source 를 **GitHub Actions** 로 설정 (1회)
5. 폰에서 https://jongh0.github.io/power-cube/ 접속

## 로컬 테스트
```bash
npm install
npm test            # 파서 단위 테스트
cp .env.example .env  # 값 채우기
npx vercel dev      # http://localhost:3000/api/status
```

## 주의
- 로그인 실패 시 자동 재시도하지 않습니다 (계정 잠금 방지). 비밀번호를 확인하세요.
- ev-line 데이터는 파워큐브코리아 자산입니다. 개인용, 낮은 호출 빈도로만 사용하세요.
