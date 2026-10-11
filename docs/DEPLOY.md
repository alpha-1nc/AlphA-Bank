# AlphA Bank 운영 배포 절차서

대상: 홈서버 (Ubuntu + Docker Compose), 이번 배포 = 예산 분류 개편 · 계좌 연동/개인 용돈/초기 잔액/근무지 색상 제거 · 디자인 토큰 적용.

순서의 원칙: **이미지 빌드(검증) → 컨테이너 정지 → 백업 → 스키마 반영 → 마이그레이션 → 코드 기동**.
DB에 손대기 전에 새 이미지 빌드가 성공하는지 먼저 확인하고, DB 작업은 앱이 멈춘 상태에서만 한다.

---

## 0. 이 프로젝트의 실제 구성 (사전점검 결과)

| 항목 | 내용 |
|---|---|
| Dockerfile | **저장소에 없음** (git 이력에도 없음). `docker-compose.yml`은 `build: .`이므로 서버 폴더에 git 미추적 Dockerfile이 따로 있어야 빌드된다. 내용은 서버에서 직접 확인해야 한다 (1-1). |
| `.dockerignore` | 없음 → `COPY . .`류라면 `scripts/`, `prisma/`, `.env`, 호스트의 `node_modules`까지 빌드 컨텍스트에 들어간다. |
| standalone 여부 | `next.config.mjs`에 `output: "standalone"` **없음**. 이 설정 그대로 빌드하면 standalone 산출물이 생기지 않으므로, Dockerfile은 `npm run build` + `npm start`(`next start`) 방식일 가능성이 높다. |
| 서비스 / 컨테이너 | 서비스 `alphabank-web`, 컨테이너 이름 `alpha-bank`, 포트 `3005(호스트) → 3000(컨테이너)` |
| DB 파일 | 호스트 `<프로젝트 폴더>/prisma/dev.db` ↔ 컨테이너 `/app/prisma/dev.db` (`./prisma:/app/prisma` 바인드 마운트) |
| DB 경로 결정 규칙 | compose에 `DATABASE_URL` 없음. 앱·`prisma.config.ts`는 `src/lib/resolve-database-url.ts` 규칙으로 `file:` URL을 무시하고 항상 `<cwd>/prisma/dev.db`를 쓴다 → 컨테이너 WORKDIR이 `/app`이어야 위 경로와 맞는다. |
| 마이그레이션 스크립트 | `scripts/migrate-cashflow-categories.cjs` (의존: `@libsql/client` — dependencies라 production 설치에도 포함). 이 스크립트는 `DATABASE_URL`이 `file:`이면 **그 값을 그대로** 쓴다 (앱과 다름). 그래서 아래 명령들은 모두 `DATABASE_URL`을 명시해서 대상 파일을 고정한다. |
| Prisma CLI | `prisma`는 **devDependencies**. `npm ci --omit=dev`나 `NODE_ENV=production npm ci` 또는 `npm prune --production`을 쓰는 이미지라면 컨테이너에서 `npx prisma`를 쓸 수 없다. Prisma Client(`@prisma/client`, `@prisma/adapter-libsql`)는 dependencies. 생성된 클라이언트(`src/generated/prisma`)는 git에서 제외되어 있어 빌드 중 `prisma generate`가 필요하다. 그러므로 빌드 단계에서는 dev 의존성이 반드시 설치되어 있다. |
| Node 버전 | Prisma 7 요구사항: `^20.19 || ^22.12 || >=24.0` |
| 새 npm 의존성 | `@toss/tds-colors@^0.1.0`, `emoji-mart@^5.6.0`, `@emoji-mart/react@^1.1.1`, `@emoji-mart/data@^1.2.1` (모두 dependencies, `package-lock.json`에 반영됨). Dockerfile에서 `npm ci`/`npm install`을 실행한다면 빌드 시 자동 설치된다. |

### 이번 배포에서 바뀌는 DB 스키마

삭제되는 컬럼 (데이터 영구 삭제, `--accept-data-loss` 필요):

| 테이블 | 컬럼 | 비고 |
|---|---|---|
| `Account` | `initialBalance` | 초기 잔액 |
| `MonthlyBudget` | `personalAllowance` | 개인 용돈 |
| `CashFlow` | `accountId` | 계좌 연동 (Account FK 포함) |
| `Subscription` | `accountId` | 결제 계좌 (Account FK 포함) |
| `Workplace` | `color` | 근무지 색상 |

추가되는 컬럼: `CashFlow.category` (nullable), `CashFlow.emoji` (nullable)

값이 바뀌는 데이터 (마이그레이션 스크립트):
`CashFlow.type`의 `EXPENSE_FIXED`는 `EXPENSE`+`FIXED`로, `EXPENSE_VAR`는 `EXPENSE`+`VARIABLE`로 바뀐다. `SAVING`에는 `category=SAVE`를 채우고, `INCOME`의 category는 `null`로 둔다. 행은 삭제하지 않고, 실행 전후의 행 수와 금액합이 같은지 스스로 검증한다.

> 스키마 반영과 마이그레이션 뒤에는 **구버전 코드가 이 DB로 정상 동작하지 않는다.** 구버전 코드는 삭제된 컬럼을 조회하고 구 `type` 값을 기대하기 때문이다. 그래서 코드 롤백은 **반드시 DB 복원과 함께** 한다.

---

## 1. 배포 전 준비

### 1-0. 개발 PC에서

- 현재 변경분은 아직 커밋되지 않았다. 커밋 후 원격에 푸시한다.
- DB 파일(`prisma/*.db`, `-journal`, `-wal`, `-shm`, `*.db.bak*`)과 `.env`는 `.gitignore`로 제외되어 있다. 커밋 전에 한 번 더 확인한다.
  ```bash
  git status --short --ignored | grep -E "dev\.db|\.env"
  ```
  `!!`(무시됨)으로만 나와야 한다. `A`나 `??`로 나오면 커밋하지 않는다. 단, `.env.example`은 `??`가 정상이며 커밋 대상이다.

### 1-1. 서버에서: Dockerfile 판정

```bash
cd <서버의 프로젝트 폴더>     # docker-compose.yml이 있는 곳
ls -la Dockerfile .dockerignore
grep -nE "FROM|WORKDIR|COPY|npm (ci|install|prune)|omit=dev|NODE_ENV|standalone|CMD|ENTRYPOINT|USER" Dockerfile
```

판정 기준:

| 확인 | "예"이면 |
|---|---|
| ① 최종 스테이지에 `COPY . .`(또는 `COPY scripts`)가 있다 | 컨테이너 안에 `scripts/`가 있다 |
| ② 최종 스테이지에서 dev 의존성을 빼지 않는다 (`--omit=dev`, `--production`, `npm prune` 없음, 멀티스테이지에서 runner에 node_modules를 따로 설치하지 않음) | 컨테이너 안에서 `npx prisma`를 쓸 수 있다 |
| ③ `WORKDIR /app` | DB 경로 규칙이 `/app/prisma/dev.db`와 일치한다 |
| ④ standalone 산출물(`.next/standalone`)만 복사하는 구조 | `scripts/`와 `prisma` CLI가 **없다** (①②가 "아니오") |

빌드한 뒤에 실제로 확인하는 명령 (2단계 이후에 실행):
```bash
docker compose run --rm --no-deps alphabank-web sh -c 'pwd; ls scripts; npx --no-install prisma --version; node -e "require(\"@libsql/client\")" && echo LIBSQL_OK'
```

- 세 가지가 모두 성공하면 **3단계에서 방법 A**를 쓴다.
- 하나라도 실패하면 **방법 B 또는 C**를 쓴다.
- `.env`(1-3)를 먼저 만들어 두어야 이 명령이 `SESSION_PASSWORD` 미설정 경고 없이 실행된다.

### 1-2. 롤백용 현재 상태 기록

```bash
cd <서버의 프로젝트 폴더>
git rev-parse HEAD > /tmp/alphabank-prev-commit          # 현재 배포된 커밋
IMAGE_NAME=$(docker inspect alpha-bank --format '{{.Config.Image}}')
echo "$IMAGE_NAME" > /tmp/alphabank-image-name
docker tag "$(docker inspect alpha-bank --format '{{.Image}}')" alphabank-web:rollback
```

- 실패 시: 이 단계는 상태를 바꾸지 않는다. 그대로 중단한다.

### 1-3. 서버에 `.env` 만들기 (비밀값 분리)

이번 배포부터 `docker-compose.yml`은 `SESSION_PASSWORD`를 평문으로 갖지 않는다. 대신 `${SESSION_PASSWORD}`로 참조하고, 값은 compose 파일과 같은 폴더의 `.env`에서 읽는다. 필요한 키 목록은 저장소의 `.env.example`에 있다.

기존 값(구 `docker-compose.yml`에 있던 값)은 **git 이력에 남아 있고 GitHub(origin/main)에도 푸시된 상태**이므로 노출된 값으로 보고 **새 값으로 교체**한다.

```bash
cd <서버의 프로젝트 폴더>
ls -la .env 2>/dev/null && grep -c "^SESSION_PASSWORD=" .env   # 이미 있으면 키 중복 여부 확인
NEW_PW=$(openssl rand -hex 32)                 # 64자 hex (iron-session은 32자 이상 필요)
printf 'SESSION_PASSWORD=%s\n' "$NEW_PW" >> .env  # .env가 이미 있고 키가 있으면, 추가하지 말고 그 줄을 직접 고친다
unset NEW_PW
chmod 600 .env
grep -qE '^SESSION_PASSWORD=.{32,}$' .env && echo ENV_OK
```

- `ENV_OK`가 나오면 값이 32자 이상으로 들어간 것이다.
- 값이 비어 있으면 compose 실행 시 `The "SESSION_PASSWORD" variable is not set` 경고가 나온다.
- `docker compose config`로도 확인할 수 있지만, 출력에 값이 그대로 찍히므로 화면 공유나 로그에 주의한다.
- `openssl`이 없으면 다음 명령으로 같은 형식의 값을 만들 수 있다.
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **값을 바꾸면 기존 로그인 세션(쿠키)이 전부 풀린다.**
  - 배포 후 모든 기기(PWA 포함)에서 프로필을 다시 선택해야 한다.
  - 데이터에는 영향이 없다.
- `.dockerignore`가 없으므로 Dockerfile이 `COPY . .`를 하면 `.env`가 **이미지 안에도 복사된다**.
  - 앱 동작에는 문제가 없지만, 이미지를 다른 곳에 올리거나 공유하면 안 된다.
  - 이 문제는 "다음에 할 일"에서 Dockerfile과 함께 정리한다.

**실패 시 되돌리기**:
- `.env`는 새 compose 파일에서만 쓰인다. 구 커밋으로 롤백하면 구 `docker-compose.yml`의 평문 값이 다시 쓰인다.
- 따라서 롤백 시 `.env`를 지울 필요는 없다. 다만 세션은 구 값 기준으로 다시 한 번 풀린다.

---

## 2. 코드 받기 + 이미지 빌드 (DB는 아직 건드리지 않음)

```bash
git pull
docker compose build
```

- `./prisma`가 바인드 마운트라 `git pull` 직후 실행 중인 구 컨테이너에도 새 `schema.prisma`가 보인다. 구 컨테이너는 이미지 안에 이미 생성된 Prisma Client로 동작하므로 런타임에는 영향이 없다.
- 이 단계까지 구 컨테이너는 계속 서비스 중이다.

**실패 시 되돌리기**:
- 빌드가 실패해도 구 컨테이너는 그대로 돈다.
- 코드는 아래 명령으로 원래 커밋으로 되돌리고 원인을 고친다.
  ```bash
  git checkout "$(cat /tmp/alphabank-prev-commit)"
  ```

---

## 3. 컨테이너 정지 → 백업 → 스키마 반영 → 마이그레이션

### 3-1. 앱 정지

```bash
docker compose stop alphabank-web
```

SQLite 파일을 복사하거나 변경하는 동안 앱이 쓰기를 하지 않도록 반드시 멈춘다.

### 3-2. 백업

```bash
TS=$(date +%Y%m%d-%H%M%S)
cp -p prisma/dev.db "prisma/dev.db.bak-$TS"
for f in prisma/dev.db-wal prisma/dev.db-shm prisma/dev.db-journal; do [ -f "$f" ] && cp -p "$f" "${f/dev.db/dev.db.bak-$TS}"; done
sha256sum prisma/dev.db "prisma/dev.db.bak-$TS"
echo "$TS" > /tmp/alphabank-backup-ts
```

- 두 해시가 같아야 백업이 완료된 것이다. 가능하면 백업 파일을 서버 밖(다른 디스크·PC)에도 한 부 복사한다.
- 실패 시: DB는 아직 바뀌지 않았다. 원인을 고치고 다시 백업하거나, `docker compose start alphabank-web`으로 구버전 서비스를 재개한다.

### 3-3. 스키마 반영 + 3-4. 마이그레이션

아래 세 방법 중 1-1 판정에 맞는 것 **하나**를 쓴다. 어느 방법이든 순서는 `db push` → 스크립트이다. 스크립트가 `category` 컬럼을 쓰므로 반드시 db push가 먼저다.

#### 방법 A — 새 이미지로 일회성 컨테이너 실행 (1-1 확인 명령이 모두 성공한 경우)

```bash
docker compose run --rm --no-deps -e DATABASE_URL=file:/app/prisma/dev.db alphabank-web \
  npx prisma db push --accept-data-loss
docker compose run --rm --no-deps -e DATABASE_URL=file:/app/prisma/dev.db alphabank-web \
  node scripts/migrate-cashflow-categories.cjs
```

- 장점:
  - 운영과 똑같은 Node·의존성·경로(`/app/prisma/dev.db`)로 실행된다.
  - 호스트에 아무것도 설치하지 않는다.
- 단점: Dockerfile 구조에 의존한다 (standalone·`--omit=dev`이면 쓸 수 없다).

#### 방법 B — 공식 Node 이미지로 일회성 컨테이너 실행 (A가 불가할 때 권장)

```bash
docker run --rm \
  -v "$PWD":/app \
  -v alphabank-migrate-nm:/app/node_modules \
  -w /app \
  -e DATABASE_URL=file:/app/prisma/dev.db \
  node:22-bookworm-slim \
  sh -c "npm ci && npx prisma db push --accept-data-loss && node scripts/migrate-cashflow-categories.cjs"
```

- 장점:
  - Dockerfile을 고치지 않는다.
  - 호스트에 Node가 필요 없다.
  - `node_modules`는 이름 있는 볼륨(`alphabank-migrate-nm`)에 설치되어 호스트 폴더를 더럽히지 않는다.
- 단점:
  - 처음 한 번은 `npm ci` 때문에 몇 분 걸린다.
  - 운영 이미지와 Node 버전이 다를 수 있다 (Prisma 7 요구사항만 맞으면 된다).
- 정리 (선택):
  ```bash
  docker volume rm alphabank-migrate-nm
  ```

#### 방법 C — 호스트에서 직접 실행

```bash
node -v                      # ^20.19 || ^22.12 || >=24 이어야 함
npm ci
DATABASE_URL="file:$PWD/prisma/dev.db" npx prisma db push --accept-data-loss
DATABASE_URL="file:$PWD/prisma/dev.db" node scripts/migrate-cashflow-categories.cjs
```

- 장점: 가장 단순하고, 출력과 오류를 바로 본다.
- 단점:
  - 호스트에 맞는 버전의 Node가 필요하다.
  - 호스트 폴더에 `node_modules`가 생긴다. `.dockerignore`가 없어서 다음 `docker compose build` 때 이 폴더가 빌드 컨텍스트로 들어가 빌드가 느려진다. Dockerfile이 `npm ci` 뒤에 `COPY . .`를 하면 이미지의 `node_modules`를 덮어쓸 수도 있다.
  - 끝나면 `rm -rf node_modules`를 권장한다.

#### (참고) 방법 D — Dockerfile에 `COPY scripts`를 추가

이미지가 standalone이라면 `scripts/`만 복사해서는 부족하다. `@libsql/client`와 `prisma` CLI, `prisma.config.ts`, `src/lib/resolve-database-url.ts`까지 러너 스테이지에 넣어야 하기 때문이다.

- 장점: 이후 배포마다 방법 A처럼 쓸 수 있다.
- 단점: Dockerfile이 저장소에 없어서 변경 이력이 남지 않고, 이미지가 커진다.
- 결론: 이번 배포에는 B 또는 C를 쓰고, Dockerfile 정비는 별도 작업으로 한다.

#### 성공 판정

- **`db push`**:
  - "Your database is now in sync with your Prisma schema"가 출력되어야 한다.
  - 삭제 경고 목록에 위 5개 컬럼만 있어야 한다. 그 외의 컬럼이나 테이블 삭제가 표시되면 **즉시 중단하고 복원**한다.
- **마이그레이션 스크립트**:
  - 마지막 줄이 `OK: 행 수·금액합 동일, 유실 없음.`이어야 한다.
  - `구 타입 잔존: 0, 유효하지 않은 행: 0`이어야 한다.
  - 멱등이므로 다시 실행해도 안전하다.

#### 실패 시 되돌리기 (3-3 / 3-4 공통)

```bash
TS=$(cat /tmp/alphabank-backup-ts)
docker compose stop alphabank-web            # 이미 정지 상태여도 무방
rm -f prisma/dev.db-wal prisma/dev.db-shm prisma/dev.db-journal
cp -p "prisma/dev.db.bak-$TS" prisma/dev.db
for f in wal shm journal; do [ -f "prisma/dev.db.bak-$TS-$f" ] && cp -p "prisma/dev.db.bak-$TS-$f" "prisma/dev.db-$f"; done
sha256sum prisma/dev.db "prisma/dev.db.bak-$TS"   # 해시 일치 확인
```

복원한 뒤에는 5장 "구버전으로 완전 롤백"을 따라 구 이미지로 다시 띄운다.

---

## 4. 코드 기동

```bash
docker compose up -d --no-build --force-recreate alphabank-web
docker compose logs -f --tail=100 alphabank-web     # 기동 오류 확인 후 Ctrl+C
```

확인 항목 (브라우저, `http://<서버>:3005`):

1. 프로필 선택 후 대시보드가 열린다.
2. `/budget`: 기존 항목이 고정·변동·저축 카테고리로 보이고, 합계가 배포 전과 같다.
3. `/work`, `/settings`: 근무지 추가·수정이 저장된다 (color 컬럼이 제거되었는지 확인).
4. `/asset`, `/subscription`, `/bucket`이 정상으로 열린다.
5. `/settings`의 예산 기준일 값을 확인한다. 이번 배포부터 예산 기간 규칙이 "M월 기준일 ~ 다음 달 (기준일−1)일"로 바뀌므로, 운영에 원하는 기준일이 들어 있는지 본다.

PWA로 설치한 기기는 서비스 워커 캐시 때문에 구 화면이 잠깐 보일 수 있다. 앱을 완전히 닫았다가 다시 연다.

**실패 시 되돌리기**: 아래 5장.

---

## 5. 구버전으로 완전 롤백

새 코드에 문제가 있으면 **DB 복원과 구 이미지 복귀를 함께** 한다. 구 코드는 마이그레이션된 DB로 동작하지 않는다.

```bash
cd <서버의 프로젝트 폴더>
docker compose stop alphabank-web

# 1) DB 복원 (3장 "실패 시 되돌리기"와 동일)
TS=$(cat /tmp/alphabank-backup-ts)
rm -f prisma/dev.db-wal prisma/dev.db-shm prisma/dev.db-journal
cp -p "prisma/dev.db.bak-$TS" prisma/dev.db
for f in wal shm journal; do [ -f "prisma/dev.db.bak-$TS-$f" ] && cp -p "prisma/dev.db.bak-$TS-$f" "prisma/dev.db-$f"; done

# 2) 코드(바인드 마운트되는 prisma/schema.prisma 포함) 복귀
git checkout "$(cat /tmp/alphabank-prev-commit)"

# 3) 구 이미지를 compose 이미지 이름으로 되돌린 뒤 재빌드 없이 기동
docker tag alphabank-web:rollback "$(cat /tmp/alphabank-image-name)"
docker compose up -d --no-build --force-recreate alphabank-web
```

- 배포 후에 새로 입력된 데이터는 백업 시점 이후분이라 복원하면 사라진다. 롤백 판단은 배포 직후 확인 단계에서 끝내는 것이 좋다.
- 정상 배포가 확정되면 정리한다:
  ```bash
  docker image rm alphabank-web:rollback
  ```
  `/tmp/alphabank-*` 파일도 지운다. DB 백업 파일은 보관한다.

---

## 요약 체크리스트

1. [ ] (PC) 커밋·푸시. DB 파일·`.env`가 커밋에 들어가지 않았는지 확인
2. [ ] (서버) Dockerfile 판정 (1-1), 롤백 정보 기록 (1-2)
3. [ ] (서버) `.env`에 새 `SESSION_PASSWORD` 생성 (1-3). 세션이 모두 풀린다는 점을 미리 알린다
4. [ ] `git pull` → `docker compose build` 성공
5. [ ] `docker compose stop`
6. [ ] DB 백업 + 해시 일치 확인
7. [ ] `prisma db push --accept-data-loss` (삭제 대상 5개 컬럼만 표시되는지 확인)
8. [ ] `migrate-cashflow-categories.cjs` → `OK` 확인
9. [ ] `docker compose up -d --no-build --force-recreate` → 화면 점검

---

## 다음에 할 일

### Dockerfile을 저장소로 가져와 커밋하기

현재 Dockerfile은 **서버에만 있고 저장소·git 이력에는 없다.** 서버 디스크가 망가지거나 서버를 옮기면 같은 이미지를 다시 만들 수 없고, 변경 이력도 남지 않는다. 즉 재현 불가능한 배포다.

1. 서버의 Dockerfile을 개발 PC로 가져온다.
   ```bash
   scp <서버>:<서버의 프로젝트 폴더>/Dockerfile ./Dockerfile
   ```
2. 비밀값이 직접 적혀 있지 않은지 확인한다 (`ENV SESSION_PASSWORD=...` 등이 있으면 제거).
3. 함께 `.dockerignore`를 만들어 `.env`, `prisma/*.db*`, `node_modules`, `.next`, `.git`이 빌드 컨텍스트에 들어가지 않게 하는 것을 검토한다.
4. 마이그레이션·`prisma db push`를 컨테이너에서 실행할 수 있는 구조인지 검토한다 (1-1 판정 기준 참고).
5. 커밋 후, 서버에서는 저장소의 Dockerfile로 빌드되는지 확인하고 서버 쪽 미추적 Dockerfile을 정리한다.
