# Whim 后端（whim-microservices）

Whim 项目的后端仓库，使用 NestJS、TypeScript、pnpm workspace 和 Turborepo 管理多个应用。当前处于基础骨架阶段，包含低代码应用、DevOps 应用，以及共享的配置加载、响应包装和异常处理逻辑。

目前应用仍以 `Hello World!` 示例接口为主，尚未接入实际数据库访问模块；数据库连接配置为预留模板，数据库由仓库外部环境管理。

## 应用与目录

| 模块        | 位置                 | 监听端口 | Swagger 文档                   |
| ----------- | -------------------- | -------- | ------------------------------ |
| 低代码后端  | `apps/whim-low-code` | 3000     | http://localhost:3000/api/docs |
| DevOps 后端 | `apps/devops`        | 3001     | http://localhost:3001/api/docs |
| 公共库      | `libs/comm`          | —        | 通过 `@comm/comm` 引用         |

```text
apps/
  whim-low-code/       # 低代码后端应用及测试
  devops/             # DevOps 后端应用及测试
libs/comm/src/
  exceptions/         # HTTP 异常、业务异常和兜底异常处理
  interceptors/       # 成功响应包装
  utils/              # 环境识别与 YAML 配置读取
.config/.dev.yaml      # 当前提供的开发环境配置
docker-compose.yml    # 两个后端应用
Dockerfile            # 共用多阶段镜像构建，通过 APP_NAME 选择应用
nest-cli.json         # Nest 应用、公共库与构建配置
pnpm-workspace.yaml   # workspace 包与安装脚本许可配置
pnpm-lock.yaml        # 依赖锁文件
turbo.json            # 多应用开发任务编排
```

两个应用的端口目前写在各自的 `src/main.ts` 中，不是从 YAML 或 `PORT` 环境变量读取。

## 本地开发

### 环境与依赖

本地已使用 Node.js 22.21.1、pnpm 11.10.0 完成依赖安装和格式检查。仓库尚未通过 `engines` 或 `packageManager` 字段约束版本，这些版本是已验证的环境记录，不是最低版本声明。

以下命令均在本仓库根目录执行：

```bash
pnpm install --frozen-lockfile
```

使用已提交的锁文件安装依赖，不要从其他目录复制 `node_modules`。在 Windows 上移动项目后，应重新安装依赖，避免 pnpm 的目录链接仍指向旧位置。

### 启动应用

推荐分别在两个终端中启动，便于查看各应用日志：

```bash
# 终端一：低代码后端，监听 3000
pnpm start:lowcode

# 终端二：DevOps 后端，监听 3001
pnpm start:devops
```

这两个脚本都通过 `cross-env` 设置 `RUNNING_ENV=dev`，并开启 watch 模式。也可以执行 `pnpm start`，通过 Turbo 调用各 workspace 的 `dev` 脚本。

低代码应用启用了 URI 版本控制，示例接口为 `GET http://localhost:3000/v1`。两个应用的接口文档入口见上表。

### 配置加载

两个应用均通过 `ConfigModule` 调用 `libs/comm/src/utils/index.ts` 中的 `getConfig()`，读取：

```text
<当前工作目录>/.config/.<RUNNING_ENV>.yaml
```

- 本机和当前 Compose 均使用 `RUNNING_ENV=dev`，读取 `.config/.dev.yaml`；容器通过只读挂载获取该文件。
- 配置包含 `TEST_VALUE`、`MONGODB_CONFIG` 和 `MYSQL_CONFIG`；数据库连接参数请按本地环境设置，不要提交真实凭据。
- `ConfigModule` 设置了 `ignoreEnvFile: true`，不会自动加载 `.env` 文件。原来的三个根目录 `.env.*` 仅有未引用的 `DATABASE_USER` / `DATABASE_PASSWORD`，现已移除。
- YAML 中不会自动展开 `${变量名}`，数据库地址和凭据需要按外部环境填写。
- 未设置 `RUNNING_ENV` 时，会尝试读取 `.config/.undefined.yaml` 并失败。
- 使用其他环境值前，需要自行准备对应 YAML 文件。配置路径依赖当前工作目录，因此启动时应位于仓库根目录。

`start:dev` 和 `start:debug` 本身不设置环境变量，需要显式传入，例如：

```bash
pnpm exec cross-env RUNNING_ENV=dev pnpm start:debug
```

## 响应与异常约定

两个应用的启动入口都注册了全局响应拦截器和异常过滤器。成功响应示例：

```json
{
  "data": "Hello World!",
  "status": 0,
  "extra": {},
  "message": "success",
  "success": true
}
```

- `BusinessException` 返回 HTTP 200，响应中 `success` 为 `false`，`status` 为业务错误码，`data` 为 `null`。
- 普通 HTTP 异常保留 HTTP 状态码，返回 `statusCode`、`timestamp`、`path`、`message`。
- 未分类异常由兜底过滤器返回 HTTP 503。

调用方需要结合 HTTP 状态和响应体判断结果，不能仅凭 HTTP 200 判断业务成功。业务错误码定义在 `libs/comm/src/exceptions/business.error.codes.ts`。

## 常用命令

| 命令                          | 用途                                       |
| ----------------------------- | ------------------------------------------ |
| `pnpm start:lowcode`          | 启动低代码应用，开发环境、watch 模式       |
| `pnpm start:devops`           | 启动 DevOps 应用，开发环境、watch 模式     |
| `pnpm start`                  | 通过 Turbo 运行 workspace 开发任务         |
| `pnpm build`                  | 构建默认应用 `whim-low-code`               |
| `pnpm exec nest build devops` | 构建 DevOps 应用                           |
| `pnpm format`                 | 格式化 `apps`、`libs` 下的 TypeScript 文件 |
| `pnpm format:check`           | 只检查格式，不修改文件                     |
| `pnpm lint`                   | 执行 ESLint 并自动修复                     |
| `pnpm lint:check`             | 只检查 ESLint 规则，不修改文件             |
| `pnpm test`                   | 运行根配置下的单元测试                     |
| `pnpm test:watch`             | 监听模式运行单元测试                       |
| `pnpm test:cov`               | 生成测试覆盖率报告                         |
| `pnpm test:e2e`               | 使用低代码应用的配置运行端到端测试         |

### 构建后运行

以开发配置运行低代码应用的构建产物：

```bash
pnpm build
pnpm exec cross-env RUNNING_ENV=dev pnpm start:prod
```

`start:prod` 仅运行 `dist/apps/whim-low-code/main`，不会设置环境变量，也不会自动选择生产配置。实际部署时需要准备目标环境 YAML 并传入对应的 `RUNNING_ENV`。

DevOps 应用没有独立的生产启动脚本，可使用：

```bash
pnpm exec nest build devops
pnpm exec cross-env RUNNING_ENV=dev node dist/apps/devops/main.js
```

### 测试现状

当前单元测试覆盖两个示例控制器和公共服务。端到端测试仍为模板：独立的 Jest 配置未配置 `@comm/comm` 路径映射，也未复用 `main.ts` 中的版本控制、拦截器和过滤器初始化逻辑；导入应用模块时还需要设置 `RUNNING_ENV`。

因此，现有端到端测试不能视为真实 HTTP 启动行为的完整验证。后续补充业务测试时，应同步完善别名、环境配置和应用初始化。

## 格式规范与协作

- `.gitattributes` 统一文本文件为 LF，Windows `.bat`、`.cmd` 使用 CRLF。
- `.editorconfig` 约定 UTF-8、两空格缩进和文件末尾换行。
- `.prettierrc` 约定单引号、尾逗号和 LF；IDE 应使用项目内的 Prettier，并开启保存时格式化。
- 不要通过关闭 ESLint 的 Prettier 检查来隐藏换行符问题。

提交前执行：

```bash
pnpm format:check
pnpm lint:check
```

CI 可使用同样的只读检查命令；当前仓库未提供 CI 流水线配置。

## Docker 运行

根目录 Compose 只管理 `whim-low-code` 和 `devops`，不部署或创建数据库。两个后端的宿主机端口只绑定 `127.0.0.1`。

### 首次准备

保留 external 网络 `whim-backend`，用于接入由外部环境管理的数据库容器。以下命令在本仓库根目录执行，网络已存在时跳过：

```bash
docker network create whim-backend
```

外部数据库容器需要加入该网络，并提供与应用配置一致的网络别名；如果数据库在其他服务器上，直接在 YAML 中填写应用容器可访问的地址。当前示例应用尚未接入数据库访问模块，不要求先准备数据库即可运行示例接口。

本机开发使用 `pnpm start:lowcode`、`pnpm start:devops`；本机与容器运行均使用 `.config/.dev.yaml`。

### 容器运行后端

```bash
docker compose config --quiet
docker compose up -d --build
docker compose logs -f
```

共用 Dockerfile 使用 Node.js 22 和 pnpm 11.10.0，按 `APP_NAME` 分别构建两个应用；运行阶段仅复制生产依赖和选定应用的构建产物，以 `node` 用户运行。配置文件不进入镜像，Compose 将 `.config/.dev.yaml` 只读挂载到 `/app/.config/.dev.yaml`。

低代码文档地址为 http://localhost:3000/api/docs，DevOps 文档地址为 http://localhost:3001/api/docs。该方式运行构建产物，不提供源码热更新；修改源码后重新执行 `up -d --build`，修改 YAML 后执行 `docker compose restart`。

接入实际数据库客户端前，请按运行环境调整 `.config/.dev.yaml` 中的地址、端口和凭据。容器内的 `127.0.0.1` 指向应用容器自身，不能用于访问其他数据库容器；应填写应用容器可访问的数据库地址。

数据库、业务库、用户和表结构由外部环境或后续迁移流程准备；本仓库不会自动创建。真实密码不要提交到 Git。

### 停止后端

```bash
docker compose down
```

该命令只停止本项目后端容器，不管理外部数据库，也不会删除 external 网络。删除仓库中的数据库部署文件不会删除已有数据库容器或数据卷。

## 常见问题

| 现象                                     | 排查方式                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| 找不到 `.config/.undefined.yaml`         | 使用 `start:lowcode` / `start:devops`，或显式设置 `RUNNING_ENV`                   |
| 找不到指定环境的 YAML 文件               | 检查配置文件是否存在，以及是否在仓库根目录启动                                    |
| 大量 `Delete ␍` 格式错误                 | 确认仓库格式配置已生效，运行 `pnpm format` 转换换行符                             |
| 移动目录后找不到 ESLint、Prettier 等依赖 | 在新位置重新执行 `pnpm install --frozen-lockfile`                                 |
| pnpm 提示数据库无法打开                  | 检查 `pnpm store path` 对应目录的写入权限；受限沙箱中安装依赖需要允许访问全局存储 |
| 访问低代码根路径返回 404                 | 示例接口使用版本路径 `/v1`，文档路径为 `/api/docs`                                |
| DevOps 示例路由未按预期暴露              | 入口开启了 URI 版本控制，但示例控制器尚未声明版本，需在实现业务接口时统一版本约定 |

## 许可

当前 `package.json` 标记为 `private: true`、`license: UNLICENSED`，本仓库未声明采用 NestJS 模板的 MIT 许可。
