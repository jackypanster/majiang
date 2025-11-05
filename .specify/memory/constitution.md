# 麻将项目章程

<!-- 
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- List of modified principles: All principles established.
- Added sections: All sections populated.
- Removed sections: None.
- Templates requiring updates: None, initial setup.
- Follow-up TODOs: None.
-->

## 核心原则

### I. 极简实现 (Simplicity and Minimalism)
专注于编写解决问题所需的最少代码。避免过早优化和过度设计。将抽象保持在最低限度。

### II. 快速失败 (Fail Fast and Explicitly)
错误必须在发生时立即处理。对任何意外或错误状态都应抛出异常。不要静默地忽略异常。程序应该在出现问题时立即崩溃，而不是在未知状态下继续运行。

### III. 真实测试 (Realistic and Direct Testing)
测试应尽可能接近真实的执行环境。禁止使用 Mock。如果测试需要外部服务（例如数据库），应使用这些服务的真实实例。这能确保测试更真实地反映生产行为。

### IV. 高效工具 (Modern and Efficient Tooling)
项目将使用现代、高效的工具来确保代码质量和开发速度。具体如下：
*   **语言**: Python
*   **项目与依赖管理**: `uv`
*   **代码检查与格式化**: `ruff`

### V. 透明问题管理 (Transparent Issue Management)
所有的 Bug、功能请求和技术问题都必须作为 GitHub Issues 进行跟踪。推荐使用 `gh` 命令行工具与 GitHub 交互。这确保了透明度和所有工作的清晰记录。

## 开发语言规范 (Development Language Specification)

代码、注释和技术文档的主要语言应为英语，以促进更广泛的协作。面向用户的输出和高级文档可以使用中文。

## 开发工作流 (Development Workflow)

所有开发活动都必须遵循上述原则。代码变更应通过 Pull Request 提交，并经过代码审查。发现任何问题时，应立即创建 GitHub Issue 进行追踪。

## 治理 (Governance)

本章程是项目所有开发活动的最高准则，其优先级高于所有其他实践。所有代码合并请求（Pull Request）和代码审查都必须验证是否符合本章程。对章程的任何修订都需要记录、审批和制定迁移计划。

**版本**: 1.0.0 | **批准日期**: 2025-11-05 | **最后修订**: 2025-11-05