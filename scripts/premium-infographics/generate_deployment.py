#!/usr/bin/env python3
"""Generate the Deployment & Infra premium infographic set.

Authoring output is intentionally written to .premium-infographics/ (gitignored).
Each unit produces a full SVG and a synthetic blurred preview SVG without premium
copy. Keep full-resolution assets private. This script does not generate WebP,
upload to R2, or implement entitlement checks or delivery through the site.

Usage:
    python3 scripts/premium-infographics/generate_deployment.py
"""

from __future__ import annotations

import html
from pathlib import Path
from textwrap import wrap


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / ".premium-infographics" / "deployment"

W, H = 1600, 1200
BG = "#FBF8F0"
INK = "#172033"
MUTED = "#657083"
TEAL = "#1FBFA8"
PANEL_THEMES = [
    ("#EAF7F2", "#16A34A"),
    ("#EEEAFE", "#7C3AED"),
    ("#E7F3FD", "#0284C7"),
    ("#FDEFE2", "#D97706"),
    ("#FCEAF3", "#DB2777"),
]


COURSE = [
    {
        "unit": "00-start-here",
        "en": {
            "title": "Deployment: from source code to serving traffic",
            "subtitle": "The mental model for every deployment decision that follows.",
            "lens": "A deploy is a chain. Production failures usually live at the seams.",
            "panels": [
                ("Build an artifact", "package", ["Source becomes a reproducible artifact", "Pin inputs so the same commit builds the same thing"]),
                ("Package + publish", "layers", ["Container image = immutable runtime package", "Registry is the handoff between build and runtime"]),
                ("Release safely", "rollout", ["Orchestrator moves desired state forward", "Readiness decides when new instances may serve"]),
                ("Serve + observe", "pipeline", ["Load balancer routes only to healthy backends", "Logs, metrics and traces close the feedback loop"]),
            ],
        },
        "ru": {
            "title": "Деплой: от исходников до реального трафика",
            "subtitle": "Ментальная модель для всех следующих решений по деплою.",
            "lens": "Деплой — это цепочка. Прод-аварии чаще всего живут на стыках.",
            "panels": [
                ("Собери артефакт", "package", ["Исходники превращаются в воспроизводимый артефакт", "Пинь входы: один commit должен давать тот же build"]),
                ("Упакуй и опубликуй", "layers", ["Container image — неизменяемый runtime-пакет", "Registry передаёт артефакт из build в runtime"]),
                ("Выкатывай безопасно", "rollout", ["Оркестратор двигает desired state вперёд", "Readiness решает, когда инстанс получает трафик"]),
                ("Обслуживай и наблюдай", "pipeline", ["Load balancer ведёт только на healthy backends", "Logs, metrics и traces замыкают feedback loop"]),
            ],
        },
    },
    {
        "unit": "01-image-layers",
        "en": {
            "title": "Container image layers: make the cache work for you",
            "subtitle": "Layer order controls build speed, image size and secret exposure.",
            "lens": "Stable steps first, volatile steps last. Cache invalidation flows downward.",
            "panels": [
                ("Layers are content", "layers", ["RUN, COPY and ADD can create filesystem layers", "Change one layer and all later cache entries invalidate"]),
                ("Order for reuse", "stack", ["OS packages → deps → source → build", "Copy lockfiles before source to keep dependency cache hot"]),
        ("Compile fat, ship slim", "package", ["Builder stage owns compilers and dev dependencies", "Runtime stage copies only what production needs"]),
        ("Secrets never belong", "lock", [".dockerignore cuts build context and accidental leaks", "A deleted secret can survive in earlier cached layers"]),
            ],
        },
        "ru": {
            "title": "Слои container image: заставь кэш работать на тебя",
            "subtitle": "Порядок слоёв определяет скорость build, размер image и риск утечки секретов.",
            "lens": "Стабильные шаги — раньше, изменчивые — позже. Инвалидация кэша идёт вниз.",
            "panels": [
                ("Слой — это содержимое", "layers", ["RUN, COPY и ADD создают filesystem-слои", "Изменился слой — весь кэш ниже становится невалидным"]),
                ("Порядок ради reuse", "stack", ["OS packages → deps → source → build", "Копируй lockfiles до source, чтобы кэш deps жил дольше"]),
                ("Собирай жирно, запускай тонко", "package", ["Builder stage держит compiler и dev dependencies", "Runtime stage получает только нужное production"]),
                ("Секретам здесь не место", "lock", [".dockerignore режет context и случайные утечки", "Удалённый secret может навсегда остаться в старом layer"]),
            ],
        },
    },
    {
        "unit": "02-compose-vs-k8s",
        "en": {
            "title": "Compose vs Kubernetes: buy the orchestration weight you need",
            "subtitle": "The key difference is a distributed reconciliation loop, not YAML.",
            "lens": "Move to Kubernetes when multi-node availability or automated rollout really pays the tax.",
            "panels": [
                ("Compose", "host", ["One host, one small declarative file", "Excellent for local stacks and modest single-node production"]),
                ("Kubernetes", "cluster", ["Distributed control plane schedules across nodes", "Controllers continuously drive actual state toward desired state"]),
                ("What you are buying", "loop", ["Self-healing after node loss", "Health-gated rollouts and horizontal scaling"]),
                ("When to switch", "scale", ["Single-host ceiling is real", "A host outage is unacceptable or autoscaling is required"]),
            ],
        },
        "ru": {
            "title": "Compose vs Kubernetes: покупай только нужный вес оркестрации",
            "subtitle": "Главное отличие — распределённый reconciliation loop, а не YAML.",
            "lens": "Переходи на Kubernetes, когда multi-node availability и автоматический rollout реально окупают налог.",
            "panels": [
                ("Compose", "host", ["Один host, один небольшой декларативный файл", "Отлично для local stack и умеренного single-node production"]),
                ("Kubernetes", "cluster", ["Control plane распределяет workloads по nodes", "Controllers постоянно сводят actual state к desired state"]),
                ("За что ты платишь", "loop", ["Self-healing после потери node", "Health-gated rollout и горизонтальный scaling"]),
                ("Когда переходить", "scale", ["Предел одного host стал реальным", "Падение host недопустимо или нужен autoscaling"]),
            ],
        },
    },
    {
        "unit": "03-k8s-objects",
        "en": {
            "title": "Kubernetes objects: desired state connected by selectors",
            "subtitle": "Pods are disposable; controllers, Services and labels make the system durable.",
            "lens": "Debug Kubernetes by following ownership and selectors from desired state to endpoints.",
            "panels": [
                ("Reconciliation", "loop", ["API objects declare the target state", "Controllers observe gaps and keep closing them"]),
                ("Workload hierarchy", "hierarchy", ["Deployment → ReplicaSet → Pods", "Replace Pods; do not treat them as durable servers"]),
                ("Service glue", "network", ["Service selects Pods by labels", "Endpoint membership changes while the Service address stays stable"]),
                ("Config boundary", "config", ["ConfigMap separates config from image", "Secret is an API object; base64 alone provides no secrecy"]),
            ],
        },
        "ru": {
            "title": "Объекты Kubernetes: desired state, связанный selectors",
            "subtitle": "Pods одноразовые; controllers, Services и labels делают систему устойчивой.",
            "lens": "Отлаживай Kubernetes по цепочке ownership и selectors — от desired state до endpoints.",
            "panels": [
                ("Reconciliation", "loop", ["API objects описывают целевое состояние", "Controllers видят разницу и постоянно закрывают её"]),
                ("Иерархия workload", "hierarchy", ["Deployment → ReplicaSet → Pods", "Заменяй Pods; не считай их долговечными серверами"]),
                ("Клей Service", "network", ["Service выбирает Pods по labels", "Endpoints меняются, адрес Service остаётся стабильным"]),
                ("Граница конфигурации", "config", ["ConfigMap отделяет config от image", "Secret — API object; один base64 не даёт секретности"]),
            ],
        },
    },
    {
        "unit": "04-rollout-strategies",
        "en": {
            "title": "Rollout strategies: trade blast radius for cost and rollback speed",
            "subtitle": "There is no free rollout; every strategy moves risk somewhere else.",
            "lens": "Choose with three axes: blast radius, duplicate capacity and rollback time.",
            "panels": [
                ("Rolling", "rollout", ["Replace instances gradually", "Cheap on capacity; readiness must be trustworthy"]),
                ("Blue-green", "switch", ["Run old and new environments together", "Traffic flip is fast; database compatibility is the hard part"]),
                ("Canary", "canary", ["Send a small traffic slice to the new version", "Best blast-radius control; requires strong telemetry"]),
                ("Recreate", "replace", ["Stop old, then start new", "Simple and cheap; accepts downtime by design"]),
            ],
        },
        "ru": {
            "title": "Стратегии rollout: размен blast radius, стоимости и скорости rollback",
            "subtitle": "Бесплатного rollout не бывает: каждая стратегия переносит риск в другое место.",
            "lens": "Выбирай по трём осям: blast radius, запас capacity и время rollback.",
            "panels": [
                ("Rolling", "rollout", ["Постепенно заменяет instances", "Экономит capacity; readiness должна быть честной"]),
                ("Blue-green", "switch", ["Старое и новое окружения живут параллельно", "Traffic flip быстрый; сложность уезжает в совместимость БД"]),
                ("Canary", "canary", ["Новая версия получает маленькую долю traffic", "Лучший контроль blast radius; требует сильной telemetry"]),
                ("Recreate", "replace", ["Сначала остановить старое, потом поднять новое", "Просто и дёшево; downtime принят заранее"]),
            ],
        },
    },
    {
        "unit": "05-iac",
        "en": {
            "title": "Infrastructure as Code: plan, state, lock, reconcile",
            "subtitle": "IaC is a diff engine backed by a state model — treat that state as production data.",
            "lens": "Remote state + locking + reviewable plans turn infrastructure changes into controlled transactions.",
            "panels": [
                ("Declare the destination", "config", ["Code describes the target infrastructure", "Provider reads real infrastructure before planning"]),
                ("Plan the diff", "diff", ["Plan compares desired, recorded and observed state", "Review destructive changes before apply"]),
                ("Protect state", "database", ["State maps resource identities and dependencies", "Store remotely, encrypt it, version it and restrict access"]),
                ("Lock + detect drift", "lock", ["One writer prevents concurrent corruption", "Scheduled plans expose manual changes that escaped code"]),
            ],
        },
        "ru": {
            "title": "Infrastructure as Code: plan, state, lock и reconcile",
            "subtitle": "IaC — это diff engine поверх state-модели; обращайся со state как с production data.",
            "lens": "Remote state + locking + review plan превращают изменения инфраструктуры в контролируемую транзакцию.",
            "panels": [
                ("Опиши пункт назначения", "config", ["Код задаёт целевую инфраструктуру", "Provider читает реальность перед построением plan"]),
                ("Посчитай diff", "diff", ["Plan сравнивает desired, recorded и observed state", "Разрушительные изменения проверяются до apply"]),
                ("Защищай state", "database", ["State связывает identities ресурсов и зависимости", "Храни remote, шифруй, версионируй и ограничивай доступ"]),
                ("Lock + drift detection", "lock", ["Один writer защищает от параллельной порчи", "План по расписанию ловит ручные изменения вне code"]),
            ],
        },
    },
    {
        "unit": "06-lb-levels",
        "en": {
            "title": "Load balancing L4 vs L7: bytes or requests",
            "subtitle": "The layer decides what the balancer can observe, route and terminate.",
            "lens": "TLS termination, health checks and draining matter as much as the balancing algorithm.",
            "panels": [
                ("Layer 4", "l4", ["Routes TCP/UDP flows using addresses and ports", "Fast, protocol-agnostic and blind to HTTP semantics"]),
                ("Layer 7", "l7", ["Understands host, path, headers and HTTP methods", "Can route per request and enforce application policy"]),
                ("TLS changes visibility", "lock", ["Terminate before L7 to inspect HTTP", "Pass-through preserves end-to-end TLS but hides request data"]),
                ("Healthy traffic only", "health", ["Health checks remove dead backends", "Connection draining lets in-flight requests finish during deploys"]),
            ],
        },
        "ru": {
            "title": "Load balancing L4 vs L7: байты или запросы",
            "subtitle": "Уровень определяет, что balancer может видеть, маршрутизировать и терминировать.",
            "lens": "TLS termination, health checks и draining важны не меньше алгоритма балансировки.",
            "panels": [
                ("Layer 4", "l4", ["Маршрутизирует TCP/UDP flows по адресам и портам", "Быстро, protocol-agnostic и без понимания HTTP"]),
                ("Layer 7", "l7", ["Понимает host, path, headers и HTTP methods", "Может маршрутизировать каждый request и применять app policy"]),
                ("TLS меняет видимость", "lock", ["Терминируй до L7, если нужно читать HTTP", "Pass-through сохраняет end-to-end TLS, но скрывает request"]),
                ("Только healthy traffic", "health", ["Health checks убирают мёртвые backends", "Connection draining даёт in-flight requests завершиться при deploy"]),
            ],
        },
    },
    {
        "unit": "07-secrets-at-deploy",
        "en": {
            "title": "Secrets at deploy: inject late, rotate often, leak nowhere",
            "subtitle": "A secret should enter as close to runtime as possible and leave the fewest copies behind.",
            "lens": "Identity-based secret delivery beats copying long-lived credentials through CI and images.",
            "panels": [
                ("Never bake secrets", "image", ["Image layers are immutable and widely replicated", "Deleting a file later does not erase the earlier layer"]),
                ("Base64 is encoding", "lock", ["Kubernetes Secret is not encrypted by base64", "Protect storage, API access and etcd at rest"]),
                ("Inject at runtime", "inject", ["Prefer secret manager → workload identity → runtime", "Files rotate more cleanly than process env in many stacks"]),
                ("Design for rotation", "rotate", ["Short-lived credentials reduce blast radius", "Audit reads and revoke without rebuilding the image"]),
            ],
        },
        "ru": {
            "title": "Секреты при deploy: вводи поздно, ротируй часто, не оставляй копий",
            "subtitle": "Secret должен появляться как можно ближе к runtime и оставлять минимум копий.",
            "lens": "Доставка через workload identity лучше, чем перенос long-lived credentials через CI и images.",
            "panels": [
                ("Не запекай secrets", "image", ["Image layers неизменяемы и широко реплицируются", "Удаление файла позже не стирает ранний layer"]),
                ("Base64 — это encoding", "lock", ["Kubernetes Secret не шифруется самим base64", "Защищай storage, API access и etcd at rest"]),
                ("Inject в runtime", "inject", ["Лучше: secret manager → workload identity → runtime", "Файлы во многих stack проще ротировать, чем process env"]),
                ("Проектируй rotation", "rotate", ["Short-lived credentials уменьшают blast radius", "Аудитируй чтения и отзывай без rebuild image"]),
            ],
        },
    },
    {
        "unit": "08-putting-it-together",
        "en": {
            "title": "Production deployment is one chain, not seven separate tools",
            "subtitle": "Build, migration, rollout, health, traffic and telemetry form one failure domain.",
            "lens": "The release is safe only when every seam has an explicit contract and rollback story.",
            "panels": [
                ("Build → registry", "pipeline", ["Immutable artifact gets a unique version", "Promotion should reuse the exact tested artifact"]),
                ("Migration → rollout", "database", ["Schema compatibility constrains deployment order", "Expand/contract keeps old and new versions compatible"]),
                ("Readiness → traffic", "health", ["Running is not the same as serving", "Readiness gates whether the load balancer may route requests"]),
                ("Drain → observe", "observe", ["Stop new traffic before terminating instances", "Telemetry proves the rollout is healthy before expanding blast radius"]),
            ],
        },
        "ru": {
            "title": "Production deployment — одна цепочка, а не семь отдельных tools",
            "subtitle": "Build, migration, rollout, health, traffic и telemetry образуют один failure domain.",
            "lens": "Release безопасен, только если у каждого стыка есть контракт и понятный rollback.",
            "panels": [
                ("Build → registry", "pipeline", ["Immutable artifact получает уникальную version", "Promotion использует ровно тот artifact, который прошёл tests"]),
                ("Migration → rollout", "database", ["Schema compatibility задаёт порядок deploy", "Expand/contract держит old и new versions совместимыми"]),
                ("Readiness → traffic", "health", ["Running не означает serving", "Readiness решает, может ли load balancer слать requests"]),
                ("Drain → observe", "observe", ["Останови новый traffic до termination instance", "Telemetry подтверждает здоровье rollout до роста blast radius"]),
            ],
        },
    },
    {
        "unit": "09-docker-deep",
        "en": {
            "title": "Docker deeper: network, persistence and image security",
            "subtitle": "Three boundaries decide whether a container stays disposable without losing data or trust.",
            "lens": "Treat the container as replaceable; make network identity, state and privileges explicit outside it.",
            "panels": [
                ("Network by name", "network", ["User-defined bridge provides DNS by service name", "localhost always means this container, not its neighbour"]),
                ("Publish only edges", "ports", ["Container-to-container traffic uses the internal network", "Host port publishing is for ingress from outside that network"]),
                ("Persist deliberately", "storage", ["Writable layer is scratch space", "Named volume for managed persistence; bind mount for host coupling; tmpfs for ephemeral secrets"]),
                ("Reduce attack surface", "shield", ["Run non-root, pin versions and ship a small runtime", "Scan at build time and keep rescanning after release"]),
            ],
        },
        "ru": {
            "title": "Docker глубже: network, persistence и безопасность image",
            "subtitle": "Три границы решают, останется ли container одноразовым без потери данных и доверия.",
            "lens": "Считай container заменяемым; network identity, state и privileges делай явными снаружи.",
            "panels": [
                ("Network по имени", "network", ["User-defined bridge даёт DNS по service name", "localhost всегда означает этот container, а не соседний"]),
                ("Публикуй только edge", "ports", ["Container-to-container traffic идёт по internal network", "Host port нужен для ingress извне этой network"]),
                ("Persist осознанно", "storage", ["Writable layer — временный scratch", "Named volume для persistence; bind mount для host coupling; tmpfs для ephemeral data"]),
                ("Уменьшай attack surface", "shield", ["Запускай non-root, пинь versions и делай runtime маленьким", "Сканируй на build и продолжай rescanning после release"]),
            ],
        },
    },
    {
        "unit": "10-k8s-deep",
        "en": {
            "title": "Kubernetes deeper: traffic, config, health, resources and Helm",
            "subtitle": "The production path is selectors + probes + resource contracts + versioned releases.",
            "lens": "Most Kubernetes incidents are broken relationships between otherwise valid objects.",
            "panels": [
                ("Service → Ingress", "ingress", ["Service gives a stable virtual address to changing Pods", "Ingress routes external HTTP traffic to Services"]),
                ("Config + secrets", "config", ["One image, many environments", "Choose env or mounted files based on reload and rotation needs"]),
                ("Probes + resources", "health", ["Startup, readiness and liveness answer different questions", "Requests schedule; limits cap; QoS influences eviction under pressure"]),
                ("Helm releases", "helm", ["Chart packages templates, defaults and metadata", "Release history gives upgrade and rollback as a versioned unit"]),
            ],
        },
        "ru": {
            "title": "Kubernetes глубже: traffic, config, health, resources и Helm",
            "subtitle": "Production path строится из selectors + probes + resource contracts + versioned releases.",
            "lens": "Большинство Kubernetes-инцидентов — сломанные связи между по отдельности валидными objects.",
            "panels": [
                ("Service → Ingress", "ingress", ["Service даёт стабильный virtual address меняющимся Pods", "Ingress ведёт внешний HTTP traffic в Services"]),
                ("Config + secrets", "config", ["Один image, много environments", "Выбирай env или mounted files по требованиям reload и rotation"]),
                ("Probes + resources", "health", ["Startup, readiness и liveness отвечают на разные вопросы", "Requests планируют; limits ограничивают; QoS влияет на eviction"]),
                ("Helm releases", "helm", ["Chart пакует templates, defaults и metadata", "Release history делает upgrade и rollback версионированной единицей"]),
            ],
        },
    },
]


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def text_lines(text: str, width: int) -> list[str]:
    # Keep technical tokens intact; SVG line-wrap is explicit for deterministic layout.
    return wrap(text, width=width, break_long_words=False, break_on_hyphens=False) or [""]


def estimated_text_width(text: str, font_size: int, weight: int = 500) -> float:
    """Conservative SVG text-width estimate for Inter/Arial-like sans faces.

    We deliberately avoid a font/rendering dependency in the authoring generator.
    Uppercase, Cyrillic, digits and bold text are budgeted slightly wider so a title
    that is safe here stays safe with either Inter or the Arial fallback.
    """
    units = 0.0
    for ch in text:
        if ch.isspace():
            units += 0.30
        elif ch in "ilI1|.,:;!'`":
            units += 0.30
        elif ch in "mwMWЖШЩЮФ@%&":
            units += 0.86
        elif ch.isupper() or ch.isdigit():
            units += 0.64
        else:
            units += 0.56
    if weight >= 700:
        units *= 1.035
    return units * font_size


def title_layout(text: str) -> tuple[list[str], int, int, int, int]:
    """Fit a lesson title into the space left of the brand badge.

    Returns lines, font size, first baseline, line height, subtitle baseline.
    Titles are limited to two lines so the subtitle always clears the panels.
    """
    max_width = 1190  # x=86 through x=1276; badge begins at x=1332.
    words = text.split()

    for font_size in (48, 46, 44, 42, 40):
        if estimated_text_width(text, font_size, 800) <= max_width:
            return [text], font_size, 96, font_size + 4, 142

        best: tuple[float, list[str]] | None = None
        for split in range(1, len(words)):
            lines = [" ".join(words[:split]), " ".join(words[split:])]
            widths = [estimated_text_width(line, font_size, 800) for line in lines]
            if max(widths) > max_width:
                continue
            # Prefer balanced lines while slightly rewarding a longer first line.
            score = abs(widths[0] - widths[1]) - widths[0] * 0.03
            if best is None or score < best[0]:
                best = (score, lines)
        if best:
            line_height = font_size + 4
            first_baseline = 78
            subtitle_baseline = first_baseline + line_height + 32
            return best[1], font_size, first_baseline, line_height, subtitle_baseline

    # Course titles should never reach this path, but fail visibly rather than
    # letting an unbounded string collide with the badge or lesson panels.
    raise ValueError(f"title is too long for infographic header: {text!r}")


def icon(kind: str, x: float, y: float, accent: str) -> str:
    # Chunky flat icons intentionally use only simple geometry so they remain crisp
    # at any display size and match the repository's ByteByteGo-inspired guidance.
    common = f'stroke="{accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'
    if kind in {"lock", "shield"}:
        if kind == "shield":
            return f'<path d="M{x+54} {y+10} L{x+96} {y+28} V{y+64} C{x+96} {y+94} {x+78} {y+112} {x+54} {y+124} C{x+30} {y+112} {x+12} {y+94} {x+12} {y+64} V{y+28} Z" fill="{accent}22" {common}/><path d="M{x+36} {y+67} l14 14 27 -31" fill="none" {common}/>'
        return f'<rect x="{x+18}" y="{y+54}" width="76" height="62" rx="14" fill="{accent}22" {common}/><path d="M{x+34} {y+54} V{y+38} C{x+34} {y+5} {x+78} {y+5} {x+78} {y+38} V{y+54}" fill="none" {common}/><circle cx="{x+56}" cy="{y+84}" r="7" fill="{accent}"/>'
    if kind in {"database", "storage"}:
        return f'<ellipse cx="{x+56}" cy="{y+30}" rx="42" ry="18" fill="{accent}22" {common}/><path d="M{x+14} {y+30} V{y+92} C{x+14} {y+116} {x+98} {y+116} {x+98} {y+92} V{y+30}" fill="{accent}11" {common}/><path d="M{x+14} {y+61} C{x+14} {y+85} {x+98} {y+85} {x+98} {y+61}" fill="none" {common}/>'
    if kind in {"cluster", "hierarchy"}:
        boxes = [(12,12),(72,12),(12,76),(72,76)]
        parts=[]
        for dx,dy in boxes:
            parts.append(f'<rect x="{x+dx}" y="{y+dy}" width="46" height="34" rx="8" fill="{accent}20" {common}/>')
        parts.append(f'<path d="M{x+58} {y+29} H{x+72} M{x+35} {y+46} V{y+76} M{x+95} {y+46} V{y+76} M{x+58} {y+93} H{x+72}" fill="none" {common}/>' )
        return ''.join(parts)
    if kind in {"loop", "rotate"}:
        return f'<path d="M{x+91} {y+46} A45 45 0 1 0 {x+89} {y+94}" fill="none" {common}/><path d="M{x+89} {y+94} l-4 -28 28 4" fill="none" {common}/><circle cx="{x+58}" cy="{y+66}" r="13" fill="{accent}25" {common}/>'
    if kind in {"network", "l4", "l7", "ingress", "ports"}:
        return f'<rect x="{x+8}" y="{y+44}" width="42" height="38" rx="9" fill="{accent}18" {common}/><rect x="{x+76}" y="{y+16}" width="42" height="38" rx="9" fill="{accent}18" {common}/><rect x="{x+76}" y="{y+74}" width="42" height="38" rx="9" fill="{accent}18" {common}/><path d="M{x+50} {y+63} C{x+66} {y+63} {x+65} {y+35} {x+76} {y+35} M{x+50} {y+63} C{x+66} {y+63} {x+65} {y+93} {x+76} {y+93}" fill="none" stroke-dasharray="7 7" {common}/>'
    if kind in {"layers", "stack", "package", "image"}:
        return ''.join(f'<rect x="{x+12+i*8}" y="{y+78-i*22}" width="90" height="28" rx="7" fill="{accent}{20+i*10:02x}" {common}/>' for i in range(4))
    if kind in {"rollout", "switch", "canary", "replace", "scale"}:
        return f'<rect x="{x+5}" y="{y+77}" width="30" height="30" rx="7" fill="{accent}22" {common}/><rect x="{x+48}" y="{y+58}" width="30" height="49" rx="7" fill="{accent}22" {common}/><rect x="{x+91}" y="{y+32}" width="30" height="75" rx="7" fill="{accent}22" {common}/><path d="M{x+18} {y+53} C{x+46} {y+24} {x+77} {y+24} {x+104} {y+12}" fill="none" stroke-dasharray="7 7" {common}/><path d="M{x+104} {y+12} l-17 2 9 14" fill="none" {common}/>'
    if kind in {"config", "diff"}:
        return f'<rect x="{x+18}" y="{y+10}" width="84" height="108" rx="12" fill="{accent}12" {common}/><path d="M{x+36} {y+42} H{x+83} M{x+36} {y+65} H{x+72} M{x+36} {y+88} H{x+88}" fill="none" {common}/>'
    if kind in {"health", "observe"}:
        return f'<rect x="{x+8}" y="{y+20}" width="112" height="84" rx="14" fill="{accent}12" {common}/><path d="M{x+22} {y+70} H{x+42} L{x+53} {y+45} L{x+68} {y+87} L{x+81} {y+59} H{x+108}" fill="none" {common}/>'
    if kind == "helm":
        return f'<circle cx="{x+63}" cy="{y+62}" r="47" fill="{accent}10" {common}/><circle cx="{x+63}" cy="{y+62}" r="13" fill="{accent}"/><path d="M{x+63} {y+15} V{y+35} M{x+63} {y+89} V{y+109} M{x+16} {y+62} H{x+36} M{x+90} {y+62} H{x+110} M{x+30} {y+29} L{x+44} {y+43} M{x+82} {y+81} L{x+96} {y+95} M{x+96} {y+29} L{x+82} {y+43} M{x+44} {y+81} L{x+30} {y+95}" fill="none" {common}/>'
    if kind == "inject":
        return f'<path d="M{x+10} {y+62} H{x+102}" fill="none" stroke-dasharray="7 7" {common}/><path d="M{x+102} {y+62} l-17 -12 v24 z" fill="{accent}" stroke="none"/><rect x="{x+10}" y="{y+28}" width="34" height="68" rx="9" fill="{accent}15" {common}/><rect x="{x+86}" y="{y+28}" width="34" height="68" rx="9" fill="{accent}15" {common}/>'
    # generic pipeline / host / fallback
    return f'<rect x="{x+8}" y="{y+44}" width="34" height="34" rx="8" fill="{accent}18" {common}/><rect x="{x+51}" y="{y+44}" width="34" height="34" rx="8" fill="{accent}18" {common}/><rect x="{x+94}" y="{y+44}" width="34" height="34" rx="8" fill="{accent}18" {common}/><path d="M{x+42} {y+61} H{x+51} M{x+85} {y+61} H{x+94}" fill="none" stroke-dasharray="6 5" {common}/>'


def svg_text(lines: list[str], x: int, y: int, size: int, *, weight: int = 500, fill: str = INK, lh: int | None = None) -> str:
    lh = lh or int(size * 1.35)
    spans = ''.join(f'<tspan x="{x}" dy="{0 if i == 0 else lh}">{esc(line)}</tspan>' for i, line in enumerate(lines))
    return f'<text x="{x}" y="{y}" font-family="Inter, Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{fill}">{spans}</text>'


def render_svg(locale: str, unit: str, spec: dict) -> str:
    title_lines, title_size, title_y, title_lh, subtitle_y = title_layout(spec["title"])
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        f'<rect width="{W}" height="{H}" fill="{BG}"/>',
        '<defs><filter id="soft"><feDropShadow dx="0" dy="7" stdDeviation="10" flood-color="#172033" flood-opacity="0.07"/></filter></defs>',
        f'<rect x="56" y="48" width="6" height="74" rx="3" fill="{TEAL}"/>',
        svg_text(title_lines, 86, title_y, title_size, weight=800, lh=title_lh),
        svg_text(text_lines(spec["subtitle"], 92), 88, subtitle_y, 18, weight=500, fill=MUTED, lh=24),
        '<rect x="1332" y="56" width="212" height="58" rx="29" fill="#172033"/>',
        svg_text(["SKEIN · DEPLOYMENT"], 1361, 92, 16, weight=800, fill="#FFFFFF"),
        svg_text([locale.upper()], 1498, 145, 13, weight=700, fill=MUTED),
    ]

    panel_w, panel_h = 730, 388
    coords = [(56, 196), (814, 196), (56, 612), (814, 612)]
    for idx, ((title, kind, bullets), (x, y)) in enumerate(zip(spec["panels"], coords)):
        fill, accent = PANEL_THEMES[idx % len(PANEL_THEMES)]
        parts.append(f'<g filter="url(#soft)"><rect x="{x}" y="{y}" width="{panel_w}" height="{panel_h}" rx="24" fill="{fill}" stroke="{accent}" stroke-width="2" stroke-dasharray="10 10"/></g>')
        parts.append(f'<rect x="{x+24}" y="{y+22}" width="{min(430, 34 + len(title)*14)}" height="42" rx="21" fill="{accent}"/>')
        parts.append(svg_text([title], x+44, y+50, 20, weight=800, fill="#FFFFFF"))
        parts.append(icon(kind, x+42, y+104, accent))
        bullet_y = y + 116
        for bi, bullet in enumerate(bullets):
            lines = text_lines(bullet, 50)
            parts.append(f'<circle cx="{x+196}" cy="{bullet_y+8}" r="7" fill="{accent}"/>')
            parts.append(svg_text(lines, x+216, bullet_y+15, 18, weight=600 if bi == 0 else 500, fill=INK, lh=25))
            bullet_y += 32 + (len(lines)-1)*25 + 34
        # Small technical chip anchors each card visually.
        chip = kind.replace("-", " ").upper()
        parts.append(f'<rect x="{x+42}" y="{y+326}" width="{120 + min(120, len(chip)*7)}" height="34" rx="17" fill="#FFFFFFAA" stroke="{accent}55"/>')
        parts.append(svg_text([chip], x+58, y+349, 12, weight=800, fill=accent))

    parts.extend([
        '<rect x="56" y="1032" width="1488" height="104" rx="22" fill="#172033"/>',
        f'<rect x="84" y="1060" width="6" height="48" rx="3" fill="{TEAL}"/>',
        svg_text(["SENIOR LENS" if locale == "en" else "SENIOR LENS"], 112, 1082, 13, weight=800, fill="#92E7D7"),
        svg_text(text_lines(spec["lens"], 105), 112, 1110, 20, weight=650, fill="#FFFFFF", lh=26),
        svg_text([f"deployment / {unit}"], 1295, 1100, 13, weight=700, fill="#ABB4C2"),
        '</svg>',
    ])
    return ''.join(parts)


def render_preview_svg(locale: str) -> str:
    """Render a deliberately non-reversible blurred preview.

    The preview contains no premium copy. Placeholder bars approximate the layout,
    then the drawing is blurred. A user can inspect or save this SVG without
    recovering the full infographic's text or exact vector content.
    """
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 {W} {H}">',
        '<defs><filter id="preview-blur"><feGaussianBlur stdDeviation="12"/></filter></defs>',
        f'<rect width="{W}" height="{H}" fill="{BG}"/>',
        '<g filter="url(#preview-blur)" opacity="0.88">',
        f'<rect x="56" y="48" width="6" height="74" rx="3" fill="{TEAL}"/>',
        '<rect x="86" y="58" width="780" height="44" rx="16" fill="#172033" opacity="0.86"/>',
        '<rect x="88" y="124" width="590" height="20" rx="10" fill="#657083" opacity="0.55"/>',
        '<rect x="1332" y="56" width="212" height="58" rx="29" fill="#172033"/>',
    ]
    coords = [(56, 196), (814, 196), (56, 612), (814, 612)]
    for idx, (x, y) in enumerate(coords):
        fill, accent = PANEL_THEMES[idx]
        parts.extend([
            f'<rect x="{x}" y="{y}" width="730" height="388" rx="24" fill="{fill}" stroke="{accent}" stroke-width="3" stroke-dasharray="12 12"/>',
            f'<rect x="{x+24}" y="{y+22}" width="330" height="42" rx="21" fill="{accent}"/>',
            f'<rect x="{x+48}" y="{y+116}" width="118" height="118" rx="24" fill="{accent}" opacity="0.28"/>',
            f'<rect x="{x+216}" y="{y+118}" width="410" height="20" rx="10" fill="#172033" opacity="0.66"/>',
            f'<rect x="{x+216}" y="{y+160}" width="352" height="18" rx="9" fill="#172033" opacity="0.48"/>',
            f'<rect x="{x+216}" y="{y+202}" width="390" height="18" rx="9" fill="#172033" opacity="0.48"/>',
            f'<rect x="{x+42}" y="{y+326}" width="182" height="34" rx="17" fill="#FFFFFF" opacity="0.72"/>',
        ])
    parts.extend([
        '<rect x="56" y="1032" width="1488" height="104" rx="22" fill="#172033"/>',
        '<rect x="112" y="1062" width="860" height="20" rx="10" fill="#FFFFFF" opacity="0.72"/>',
        '<rect x="112" y="1095" width="710" height="18" rx="9" fill="#FFFFFF" opacity="0.48"/>',
        '</g>',
        '<rect x="0" y="0" width="1600" height="1200" fill="#172033" opacity="0.10"/>',
        '<rect x="502" y="484" width="596" height="184" rx="30" fill="#172033" opacity="0.94"/>',
        '<path d="M760 525 V500 C760 451 840 451 840 500 V525" fill="none" stroke="#92E7D7" stroke-width="10" stroke-linecap="round"/>',
        '<rect x="744" y="522" width="112" height="82" rx="20" fill="#1FBFA8"/>',
        '<circle cx="800" cy="557" r="10" fill="#172033"/>',
        svg_text(["SKEIN COACH"], 700, 625, 24, weight=800, fill="#FFFFFF"),
        svg_text(["PREVIEW" if locale == "en" else "ПРЕВЬЮ"], 735, 656, 17, weight=800, fill="#92E7D7"),
        '</svg>',
    ])
    return ''.join(parts)


def main() -> None:
    count = 0
    for item in COURSE:
        unit = item["unit"]
        for locale in ("en", "ru"):
            dest = OUT / locale
            dest.mkdir(parents=True, exist_ok=True)
            svg_path = dest / f"{unit}.svg"
            preview_path = dest / f"{unit}.preview.svg"
            svg_path.write_text(render_svg(locale, unit, item[locale]), encoding="utf-8")
            preview_path.write_text(render_preview_svg(locale), encoding="utf-8")
            count += 1
            print(f"generated {svg_path.relative_to(ROOT)} + {preview_path.name}")
    print(f"done: {count} full SVGs + {count} blurred previews")


if __name__ == "__main__":
    main()
