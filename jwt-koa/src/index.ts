import cors from "@koa/cors";
import Router from "@koa/router";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Koa from "koa";
import { koaBody } from "koa-body";
import koaJwt from "koa-jwt";
import { omit } from "lodash";
import { createClient } from "redis";
import { JWT_SECRET, JWT_TOKEN_KEY } from "./constant";
import { globalLogger } from "./logger";

const app = new Koa();
const router = new Router();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOSTNAME || "redis"}:${
    process.env.REDIS_PORT || "6379"
  }`,
});
redisClient.on("error", globalLogger.error);

router
  .post("/public/register", async (ctx) => {
    // 使用 redis 存储用户表不大合适，这里仅是为了演示方便
    const body = ctx.request.body as {
      name: string;
      account: string;
      password: string;
    };
    const userKey = `user:${body.account}`;
    const exists = await redisClient.exists(userKey);
    if (exists) {
      ctx.body = {
        code: -1,
        result: `user ${body.account} exists`,
      };
      return;
    }
    const encryptPassword = await bcrypt.hash(body.password, 10);
    await redisClient.hSet(userKey, {
      ...omit(body, "password"),
      password: encryptPassword,
    });
    ctx.body = {
      code: 0,
      result: true,
    };
  })
  .post("/public/login", async (ctx) => {
    const body = ctx.request.body as { account: string; password: string };
    const userKey = `user:${body.account}`;
    const exists = await redisClient.exists(userKey);
    if (exists === 0) {
      ctx.body = {
        code: -1,
        result: `user ${body.account} not exists`,
      };
      return;
    }
    const hashPassword = await redisClient.hGet(userKey, "password");
    if (!hashPassword) {
      ctx.body = {
        code: -1,
        result: `user ${body.account}'s password not exists`,
      };
      return;
    }

    const isPasswordCorrect = await bcrypt.compare(body.password, hashPassword);
    if (!isPasswordCorrect) {
      ctx.body = {
        code: -1,
        result: `uncorrect password`,
      };
      return;
    }

    const payload = { account: body.account };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "7d",
    });
    ctx.cookies.set(JWT_SECRET, token, { httpOnly: true });
    ctx.body = {
      code: 0,
      result: token,
    };
  })
  .post("/api/logout", async (ctx) => {
    const jwtInfo = ctx.state.user;
    const jwtToken = ctx.state[JWT_TOKEN_KEY];
    const exTimeStamp = jwtInfo.exp * 1000 - new Date().getTime();
    if (exTimeStamp > 0) {
      // token 还未过期，加入黑名单，防止再次被使用
      await redisClient.set(`token:blacklist:${jwtToken}`, jwtToken, {
        PX: exTimeStamp,
      });
    }
    ctx.body = {
      code: 0,
      result: true,
    };
  })
  .get("/api/users", async (ctx) => {
    const userKeys = await redisClient.keys("user:*");
    const users = await Promise.all(
      userKeys.map(async (userKey) => {
        const selections = ["account", "name"];
        const values = await redisClient.hmGet(userKey, selections);
        const userEntity = selections.reduce((acc, cur, index) => {
          acc[cur] = values[index];
          return acc;
        }, {} as Record<string, string>);
        return userEntity;
      })
    );
    ctx.body = {
      code: 0,
      result: users,
    };
  });

app
  .use((ctx, next) => {
    return next().catch((err) => {
      if (401 == err.status) {
        ctx.status = 401;
        ctx.body = {
          code: 401,
          result: `Protected resource, use Authorization header or ${JWT_SECRET} cookie to get access`,
        };
      } else {
        throw err;
      }
    });
  })
  .use(
    koaJwt({
      secret: JWT_SECRET,
      cookie: JWT_SECRET,
      tokenKey: JWT_TOKEN_KEY,
    }).unless({
      path: [/^\/public/],
    })
  )
  .use(async (ctx, next) => {
    // 防止退出登录的 token 再次被使用
    const jwtToken = ctx.state[JWT_TOKEN_KEY];
    if (!jwtToken) {
      return next();
    }
    const tokenInBlackList = await redisClient.exists(
      `token:blacklist:${jwtToken}`
    );
    if (tokenInBlackList === 1) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        result: "The token is invalid after logout",
      };
      return;
    }
    return next();
  })
  .use(koaBody())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(cors());

(async () => {
  await redisClient.connect();
  app.listen(3000, async () => {
    console.log(`server listen on port 3000`);
  });
})();
