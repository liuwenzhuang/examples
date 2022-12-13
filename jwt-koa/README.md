# jwt 演示

使用 koa、koa-jwt、jsonwebtoken、redis 演示借用 jwt 进行用户注册、登录、退出登录、获取保护资源 的场景。

## 运行

```bash
# 如果有 docker 环境
docker compose up

# 或者有 redis 环境
yarn
REDIS_HOSTNAME=127.0.0.1 REDIS_PORT=6379 yarn dev
```

### 演示

```bash
# 注册用户
curl -X POST -H "Content-Type:application/json" -d '{"name":"测试用户","account":"test","password":"12345"}' http://127.0.0.1:3000/public/register
{"code": 0, "result": true}

# 登录，获得 token
curl -X POST -H "Content-Type:application/json" -d '{"account":"test","password":"12345"}' http://127.0.0.1:3000/public/login
{"code": 0, "result": "XXX.YYY.ZZZ"}

# 使用 token 获得用户列表
curl -H "Content-Type:application/json" -H "Authorization: Bearer XXX.YYY.ZZZ" http://127.0.0.1:3000/api/users
{"code": 0, "result": [{"account": "test", "name": "测试用户"}]}

# 不提供 token
curl -H "Content-Type:application/json" http://127.0.0.1:3000/api/users
{"code":401, "result":"Protected resource, use Authorization header or jwt-learn-secret cookie to get access"}

# 退出登录
curl -H "Content-Type:application/json" -H "Authorization: Bearer XXX.YYY.ZZZ" http://127.0.0.1:3000/api/logout
{"code": 0, "result": true}

# 退出后 token 不能再次使用
curl -H "Content-Type:application/json" -H "Authorization: Bearer XXX.YYY.ZZZ" http://127.0.0.1:3000/api/users
{"code": 401, "result": "The token is invalid after logout"}
```
