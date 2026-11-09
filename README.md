# AlphA Bank
개인 가계·예산 관리 웹앱. 홈서버에서 Docker로 운영합니다.

- 주소: bank.alphaintlgroup.com (Cloudflare Zero Trust 이메일 인증 필요)
- 인프라 구성: [alpha-infra](https://github.com/alpha-1nc/alpha-infra)

## 주요 기능
- 대시보드, 자산 현황
- 월별 예산 (수입 · 고정지출 · 변동지출 · 저축 항목별 집행 체크)
- 급여 계산기, 구독 관리, 목적자금 관리
- 모바일 PWA 설치, 웹 푸시 알림

## 스택
Next.js · TypeScript · Prisma · SQLite · Tailwind CSS · Docker

## 실행 구성
| 항목 | 값 |
|---|---|
| 컨테이너 | `alpha-bank` (포트 3005 → 3000) |
| 이미지 | `node:20-alpine` 기반 Dockerfile |
| DB | 호스트 `./prisma` ↔ 컨테이너 `/app/prisma` 바인드 마운트 |
| 환경변수 | `.env.example` 참고 (VAPID 키, CRON_SECRET) |

## 배포
```
git pull
docker compose up -d --build
```
DB 구조가 바뀌는 배포는 [배포 절차서](docs/DEPLOY.md)의 순서(빌드 확인 → 정지 → 백업 → 스키마 반영 → 마이그레이션 → 기동)를 따릅니다.
