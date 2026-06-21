import app from './app.js'
import { env, assertEnv } from './config/env.js'

assertEnv()

app.listen(env.port, () => {
  console.log(`🖥️  컴친 백엔드 실행 중 → http://localhost:${env.port}`)
  console.log(`    헬스체크: http://localhost:${env.port}/api/health`)
})
