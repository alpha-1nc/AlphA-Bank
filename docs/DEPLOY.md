# AlphA Bank 운영 배포 절차서

대상: 홈서버 (Ubuntu + Docker Compose), 이번 배포 = 예산 분류 개편 · 계좌 연동/개인 용돈/초기 잔액/근무지 색상 제거 · 디자인 토큰 적용 · 프로필(JK/MY) 구분 및 로그인 제거 · 계좌 종류 "금고" → "목적자금" 이름 변경.

순서의 원칙: **이미지 빌드(검증) → 컨테이너 정지 → 백업 → 스키마 반영 → 마이그레이션 → 코드 기동**.
DB에 손대기 전에 새 이미지 빌드가 성공하는지 먼저 확인하고, DB 작업은 앱이 멈춘 상태에서만 한다.

---

## 0. 이 프로젝트의 실제 구성 (사전점검 결과)

| 항목 | 내용 |
|---|---|
| Dockerfile | 저장소 루트에 있다 (`node:20-alpine`, `npm ci` → `COPY . .` → `prisma generate` → `npm run build` → `npm start`). 서버에 따로 둔 Dockerfile이 있으면 저장소 것과 같은지 먼저 비교한다 (1-1). |
| `.dockerignore` | 저장소에 있다. `node_modules`, `.next`, `.git`, `.env`, `*.db`, `*.db.bak*`, `docs`를 빌드 컨텍스트에서 제외한다. `scripts/`는 이미지에 들어간다. |
| standalone 여부 | `next.config.mjs`에 `output: "standalone"` 없음. 이미지는 `npm run build` + `npm start`(`next start`) 방식이다. |
| 서비스 / 컨테이너 | 서비스 `alphabank-web`, 컨테이너 이름 `alpha-bank`, 포트 `3005(호스트) → 3000(컨테이너)` |
| DB 파일 | 호스트 `<프로젝트 폴더>/prisma/dev.db` ↔ 컨테이너 `/app/prisma/dev.db` (`./prisma:/app/prisma` 바인드 마운트) |
| DB 경로 결정 규칙 | compose에 `DATABASE_URL` 없음. 앱·`prisma.config.ts`는 `src/lib/resolve-database-url.ts` 규칙으로 `file:` URL을 무시하고 항상 `<cwd>/prisma/dev.db`를 쓴다 → 컨테이너 WORKDIR이 `/app`이어야 위 경로와 맞는다. |
| DB 스크립트 | `scripts/migrate-cashflow-categories.cjs`, `rename-account-type-safe.cjs`, `drop-workplace-color.cjs`, `remove-my-profile.cjs` (의존: `@libsql/client`). 이 스크립트들은 `DATABASE_URL`이 있으면 **그 값을 그대로** 쓴다 (앱과 다름). 그래서 아래 명령들은 모두 `DATABASE_URL`을 명시해서 대상 파일을 고정한다. |
| ⚠ alpine 컨테이너와 libsql | 이미지가 `node:20-alpine`(musl)이라, 컨테이너 안에서 위 스크립트(`@libsql/client` 네이티브 모듈)를 돌리면 `fcntl64` 심볼 오류로 실패한다. **DB 스크립트는 호스트(방법 C)나 debian 기반 일회성 컨테이너(방법 B)에서 돌리거나, `sqlite3`로 직접 처리한다 (3-3).** |
| Prisma CLI | `prisma`는 **devDependencies**. `npm ci --omit=dev`나 `NODE_ENV=production npm ci` 또는 `npm prune --production`을 쓰는 이미지라면 컨테이너에서 `npx prisma`를 쓸 수 없다. Prisma Client(`@prisma/client`, `@prisma/adapter-libsql`)는 dependencies. 생성된 클라이언트(`src/generated/prisma`)는 git에서 제외되어 있어 빌드 중 `prisma generate`가 필요하다. 그러므로 빌드 단계에서는 dev 의존성이 반드시 설치되어 있다. |
| Node 버전 | Prisma 7 요구사항: `^20.19 || ^22.12 || >=24.0` |
| npm 의존성 변경 | 추가: `@toss/tds-colors`, `emoji-mart`, `@emoji-mart/react`, `@emoji-mart/data`. 제거: `iron-session`, `recharts`. 모두 `package-lock.json`에 반영됨. Dockerfile의 `npm ci`가 빌드 시 반영한다. |
| 인증/세션 | **없다.** 프로필 선택 화면과 세션 쿠키가 제거되어 단일 사용자(JK)로 동작한다. `SESSION_PASSWORD` 등 세션 환경변수는 더 이상 필요하지 않다. |

### 이번 배포에서 바뀌는 DB 스키마

삭제되는 컬럼 (데이터 영구 삭제, `--accept-data-loss` 필요):

| 테이블 | 컬럼 | 비고 |
|---|---|---|
| `Account` | `initialBalance` | 초기 잔액 |
| `MonthlyBudget` | `personalAllowance` | 개인 용돈 |
| `CashFlow` | `accountId` | 계좌 연동 (Account FK 포함) |
| `Subscription` | `accountId` | 결제 계좌 (Account FK 포함) |

`Workplace.color`(근무지 색상, `NOT NULL`·기본값 없음)는 `db push`로 지우지 않는다. 테이블 재생성을 피하려고 `scripts/drop-workplace-color.cjs`(`ALTER TABLE … DROP COLUMN` 한 줄)로 먼저 제거한다 (3-3 ②). 이 스크립트를 건너뛰면 `db push`가 `color`도 삭제 대상으로 표시한다.

추가되는 컬럼: `CashFlow.category` (nullable), `CashFlow.emoji` (nullable)

값이 바뀌는 데이터 (이름 변경): `Account.type`의 `금고`는 `목적자금`으로 바뀐다 (`scripts/rename-account-type-safe.cjs`). 

프로필 데이터: 운영 DB에 `user-my` 사용자가 있으면 `scripts/remove-my-profile.cjs`로 삭제한다 (3-3 ③). 없으면 건너뛴다. `User` 모델과 JK 행(`74881cb7-6fa0-4a86-a6b3-cf3e271c7ce0`)은 그대로 유지한다. 앱이 이 id를 고정값으로 쓴다.

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

### 1-1. 서버에서: Dockerfile 확인

Dockerfile과 `.dockerignore`는 저장소에 있으므로 `git pull` 후에는 서버도 같은 파일을 쓴다. 서버에 git 미추적 Dockerfile이 따로 있었다면 `git pull`이 충돌하거나 덮어쓰지 않는지 먼저 확인하고, 필요하면 서버 쪽 파일을 치운다.

```bash
cd <서버의 프로젝트 폴더>     # docker-compose.yml이 있는 곳
git status --short Dockerfile .dockerignore
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

- 이 명령은 `npx prisma`(`db push`)를 컨테이너에서 쓸 수 있는지만 알려준다.
- `LIBSQL_OK`가 나와도 `@libsql/client`가 실제로 DB를 열 때 `fcntl64` 오류가 날 수 있다 (alpine). **DB 스크립트(3-3 ①~④)는 방법 B/C 또는 `sqlite3` 직접 실행을 쓴다.**

### 1-2. 롤백용 현재 상태 기록

```bash
cd <서버의 프로젝트 폴더>
git rev-parse HEAD > /tmp/alphabank-prev-commit          # 현재 배포된 커밋
IMAGE_NAME=$(docker inspect alpha-bank --format '{{.Config.Image}}')
echo "$IMAGE_NAME" > /tmp/alphabank-image-name
docker tag "$(docker inspect alpha-bank --format '{{.Image}}')" alphabank-web:rollback
```

- 실패 시: 이 단계는 상태를 바꾸지 않는다. 그대로 중단한다.

### 1-3. 서버 `.env` 정리 (세션 환경변수 제거)

세션이 없어졌으므로 서버 `.env`(compose 파일과 같은 폴더)에서 아래 항목을 지운다. 앱과 compose는 더 이상 읽지 않는다.

- `SESSION_PASSWORD`
- `SESSION_SECRET` (있는 경우)

`DATABASE_URL`과 `DATABASE_AUTH_TOKEN`은 그대로 둔다.

```bash
cd <서버의 프로젝트 폴더>
sed -i.bak -E '/^(SESSION_PASSWORD|SESSION_SECRET)=/d' .env && rm -f .env.bak
grep -c "SESSION" .env    # 0이면 정리 완료 (출력이 0이어도 grep 종료코드는 1)
```

- 새 `docker-compose.yml`은 `environment:` 블록이 없다. `.env`에 다른 값이 없어도 기동에 문제없다.
- 기존 로그인 쿠키(`alphabank-session`)는 새 코드가 읽지 않으므로 그대로 무시된다. 사용자가 할 일은 없다.
- 구 커밋으로 롤백하면 구 compose가 `SESSION_PASSWORD`를 다시 요구한다. 롤백 가능성이 남아 있는 동안에는 이 줄을 지우지 말고 **배포가 확정된 뒤에** 지우는 것을 권한다.

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

작업은 두 묶음이다. **묶음 1 (DB 스크립트, 이름·컬럼·프로필 정리) → 묶음 2 (`db push` → `migrate-cashflow-categories.cjs`)** 순서로 한다. `migrate-cashflow-categories.cjs`는 `category` 컬럼을 쓰므로 반드시 `db push` 뒤에 돌린다. `drop-workplace-color.cjs`는 `db push` 전에 돌려야 `db push`가 `Workplace`를 건드리지 않는다.

#### 묶음 1 — DB 스크립트 (방법 B/C 또는 sqlite3로 실행)

모두 멱등이라 다시 돌려도 안전하다. 이미 처리됐으면 "이미 처리됨"을 출력하고 아무것도 바꾸지 않는다. 앱은 정지 상태여야 한다 (3-1).

**① 계좌 종류 이름 변경** — `금고` → `목적자금`
```bash
DATABASE_URL="file:$PWD/prisma/dev.db" node scripts/rename-account-type-safe.cjs
```

**② Workplace.color 컬럼 제거**
```bash
# 운영 DB의 행 수가 개발 DB(Workplace 2 / WorkRecord 37)와 다르면 실제 값을 지정한다
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Workplace; SELECT COUNT(*) FROM WorkRecord;"
EXPECT_WORKPLACE=<위 값> EXPECT_WORKRECORD=<위 값> \
DATABASE_URL="file:$PWD/prisma/dev.db" node scripts/drop-workplace-color.cjs
```
- SQLite 3.35 이상이어야 한다 (`sqlite_version()`을 스크립트가 출력하고 검사한다).
- 테이블을 재생성하지 않고 `DROP COLUMN` 한 줄만 쓴다. 끝나면 행 수, `foreign_key_check`, 고아 행을 검증하고 어긋나면 롤백한다.

**③ MY 프로필 삭제 — 운영 DB에 `user-my`가 있을 때만**
```bash
sqlite3 prisma/dev.db "SELECT id, name FROM User;"
```
`user-my`가 보이면 `scripts/remove-my-profile.cjs`를 쓴다. 이 스크립트는 **개발 DB의 행 수**(JK: Account 7 / MonthlyBudget 11 / CashFlow 18 / BucketList 2 / Subscription 2 / Workplace 2 / WorkRecord 37)와 MY의 MonthlyBudget 한 건(`3763c34a-a890-45fc-9314-0be439496b25`)을 하드코딩해서 검사한다. 운영 DB가 다르면 사전 검사에서 중단하고 아무것도 지우지 않는다. 그 경우 운영 DB의 MY 데이터를 직접 확인한 뒤 스크립트의 기대값을 운영 DB에 맞게 고쳐서 쓴다. `user-my`가 없으면 이 단계를 건너뛴다.
```bash
DATABASE_URL="file:$PWD/prisma/dev.db" node scripts/remove-my-profile.cjs
```

**sqlite3로 직접 처리하는 경우** (Node 없이, 스크립트의 검증은 없다)
```bash
sqlite3 prisma/dev.db <<'SQL'
BEGIN;
UPDATE Account SET type = '목적자금' WHERE type = '금고';
ALTER TABLE Workplace DROP COLUMN color;      -- SQLite 3.35 이상
SELECT 'fk_check', COUNT(*) FROM pragma_foreign_key_check;   -- 0이어야 한다
COMMIT;                                        -- 값이 이상하면 COMMIT 대신 ROLLBACK;
SQL
```

#### 묶음 2 — 스키마 반영 + 분류 마이그레이션

아래 세 방법 중 하나를 쓴다. 순서는 `db push` → `migrate-cashflow-categories.cjs`이다.

#### 방법 A — 새 이미지로 일회성 컨테이너 실행 (`db push` 전용)

```bash
docker compose run --rm --no-deps -e DATABASE_URL=file:/app/prisma/dev.db alphabank-web \
  npx prisma db push --accept-data-loss
docker compose run --rm --no-deps -e DATABASE_URL=file:/app/prisma/dev.db alphabank-web \
  node scripts/migrate-cashflow-categories.cjs
```

- 장점: 운영과 똑같은 Node·의존성·경로로 실행된다. 호스트에 아무것도 설치하지 않는다.
- 단점: 이미지가 alpine이라 `@libsql/client`를 쓰는 스크립트(`migrate-cashflow-categories.cjs` 포함)는 `fcntl64` 오류로 실패할 수 있다. 실패하면 두 번째 명령만 방법 B나 C로 돌린다. 이미 `db push`가 끝났다면 `migrate-cashflow-categories.cjs`부터 다시 하면 된다.

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

- 묶음 1의 스크립트도 이 컨테이너에서 돌릴 수 있다 (debian이라 libsql이 동작한다). 위 `sh -c` 안의 명령만 바꾸면 된다.
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

#### 성공 판정

- **묶음 1 스크립트**: 각각 마지막 줄이 `완료` 또는 `이미 처리됨 (변경 없음)`이어야 한다.
- **`db push`**:
  - "Your database is now in sync with your Prisma schema"가 출력되어야 한다.
  - 삭제 경고 목록에 위 4개 컬럼(`Account.initialBalance`, `MonthlyBudget.personalAllowance`, `CashFlow.accountId`, `Subscription.accountId`)만 있어야 한다. `Workplace.color`가 보이면 ②를 건너뛴 것이다. 그 외의 컬럼이나 테이블 삭제가 표시되면 **즉시 중단하고 복원**한다.
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

1. 주소로 들어가면 프로필 선택 없이 바로 대시보드가 열린다 ("중경님의 N월"). 모바일 헤더 우측에 프로필 배지가 없고, 설정 화면에 "현재 프로필" 섹션이 없다.
2. `/budget`: 기존 항목이 고정·변동·저축 카테고리로 보이고, 합계가 배포 전과 같다.
3. `/work`, `/settings`: 근무지 추가·수정이 저장된다 (`Workplace.color` 제거 후 NOT NULL 오류가 나지 않아야 한다).
4. `/asset`, `/subscription`, `/bucket`이 정상으로 열린다. `/asset`에서 계좌 종류가 "금고" 대신 "목적자금"으로 보인다.
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

1. [ ] (PC) 커밋·푸시. DB 파일·`.env`가 커밋에 들어가지 않았는지 확인 (`Dockerfile`·`.dockerignore`는 커밋 대상)
2. [ ] (서버) Dockerfile 확인 (1-1), 롤백 정보 기록 (1-2)
3. [ ] `git pull` → `docker compose build` 성공
4. [ ] `docker compose stop`
5. [ ] DB 백업 + 해시 일치 확인
6. [ ] 묶음 1: `rename-account-type-safe.cjs` → `drop-workplace-color.cjs` → (`user-my`가 있으면) `remove-my-profile.cjs`
7. [ ] 묶음 2: `prisma db push --accept-data-loss` (삭제 대상 4개 컬럼만 표시되는지 확인) → `migrate-cashflow-categories.cjs`가 `OK`
8. [ ] `docker compose up -d --no-build --force-recreate` → 화면 점검
9. [ ] 배포 확정 후 서버 `.env`에서 `SESSION_PASSWORD`/`SESSION_SECRET` 삭제 (1-3)

---

## 다음에 할 일

- `Dockerfile`과 `.dockerignore`가 아직 git에 커밋되지 않았다면 커밋한다. 서버의 미추적 Dockerfile은 정리한다.
- `Dockerfile`이 `node:20-alpine`이라 컨테이너 안에서는 libsql 스크립트를 돌릴 수 없다. 배포마다 DB 작업이 필요하면 debian 기반(`node:20-bookworm-slim`)으로 바꾸는 것을 검토한다.
- 운영 DB의 Prisma 7 요구 Node 버전(`^20.19 || ^22.12 || >=24.0`)과 이미지의 `node:20`이 맞는지 확인한다.
