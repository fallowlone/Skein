import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Geometry audit for lesson figures: every dict string must fit its container
// (conservative glyph-width model, both locales) and every rect/circle must
// stay inside the 800x420 viewBox. Usage:
//   bun scripts/figure-qa/audit-geometry.mjs
// RULES below is the per-batch extension point: when you author figures for a
// new lesson, add one entry per figure — [dictKey, containerWidthPx, fontSize].
// (The db-join entries are the reference example. Keep them: they guard the
// committed figures against regressions.)
// Conservative avg glyph widths (px per char) at given font-size.
const W = { mono: 0.62, display: 0.60 };
function est(s, size, kind = "mono") { return [...s].length * size * W[kind]; }
let fails = 0;
function check(cond, msg) { if (!cond) { fails++; console.log("FAIL:", msg); } }
// Per-figure container widths for centered texts: [dictKey, maxWidth, size]
const RULES = {
  "db-join/01-nested-loop-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["outerTitle", 230, 13],
    ["estLine", 220, 11], ["actLine", 220, 12], ["lookupNote", 640, 12],
    ["innerTitle", 360, 13], ["loopsLine", 290, 15], ["loopsSub", 290, 11],
    ["foot", 700, 13], ["outerRows", 190, 12],
  ],
  "db-join/02-hash-join-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["buildTitle", 150, 12],
    ["hashNote", 150, 11], ["barLine1", 660, 12], ["barLine2", 660, 12],
    ["probeTitle", 160, 12], ["buildKeys", 110, 12], ["bucketKeys", 55, 11],
  ],
  "db-join/03-merge-join-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["sortBadge", 200, 11],
    ["outLine", 150, 15], ["foot", 700, 13],
  ],
  // db-start wave (3 figures)
  "db-start/three-walls-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["code", 244, 11],
    ["colMem", 160, 12], ["colFiles", 160, 12], ["colDb", 160, 12],
    ["walls", 170, 11], ["memV", 160, 12], ["fileV", 160, 12],
    ["dbV", 160, 12], ["foot", 700, 13],
  ],
  "db-start/table-keys-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["usersTitle", 300, 13],
    ["uCols", 130, 12], ["uVals", 130, 12], ["uMore", 300, 16], ["uNote", 300, 11],
    ["ordersTitle", 300, 13], ["oFk", 150, 12], ["oStatus", 120, 12],
    ["oNote", 300, 11], ["sql", 500, 13], ["sqlSub", 500, 11],
  ],
  "db-start/fast-correct-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["idxTitle", 330, 13],
    ["scanLine", 330, 11], ["jumpLine", 175, 12], ["msLine", 175, 12],
    ["txnTitle", 330, 13], ["accA", 130, 12], ["accB", 130, 12],
    ["commitLine", 290, 12], ["crashLine", 290, 12], ["txnNote", 330, 11],
    ["foot", 700, 13],
  ],
  // db-relational wave (14 figures)
  "db-relational/relation-anatomy-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["tableTitle", 280, 13], ["panelTitle", 340, 13], ["colId", 80, 12],
    ["colEmail", 150, 12], ["rowIds", 80, 12], ["rowEmails", 150, 11],
    ["setTitle", 240, 12], ["setSub", 240, 11], ["box1Title", 300, 12],
    ["box1Sub", 300, 11], ["box2Title", 300, 12], ["box2Sub", 300, 11],
    ["box3Title", 300, 12], ["box3Sub", 300, 11], ["foot", 700, 13],
  ],
  "db-relational/constraint-refuse-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["codes", 240, 12], ["chips", 264, 11], ["verdicts", 120, 13], ["foot", 700, 13],
  ],
  "db-relational/sql-algebra-gap-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["codes", 310, 12], ["effects", 310, 11], ["foot", 700, 13],
  ],
  "db-relational/surrogate-key-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["beforeTitle", 320, 12], ["beforeRow", 284, 13], ["afterTitle", 320, 12],
    ["afterRow", 284, 13], ["afterSub", 284, 11], ["panelTitle", 320, 12],
    ["box1Title", 284, 12], ["box1Sub", 284, 11], ["box2Title", 284, 12],
    ["box2Sub", 284, 11], ["foot", 700, 13],
  ],
  "db-relational/normal-ladder-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["badges", 74, 15], ["rules", 582, 12], ["viols", 582, 11], ["foot", 700, 13],
  ],
  "db-relational/orm-nplusone-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["leftTitle", 330, 12], ["leftBox1a", 294, 15], ["leftBox1b", 294, 11],
    ["leftBox2a", 294, 15], ["leftBox2b", 294, 11], ["leftTotal", 294, 13],
    ["rightTitle", 310, 12], ["rightBig", 274, 20], ["rightMid", 274, 12],
    ["rightSub", 274, 11], ["rightTotal", 274, 13], ["foot", 700, 13],
  ],
  "db-relational/jsonb-index-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["ginTitle", 330, 12], ["ginOps", 56, 12], ["ginExample", 330, 12],
    ["ginNote", 330, 11], ["ginIdx", 330, 11], ["btreeTitle", 330, 12],
    ["btreeExample", 294, 12], ["btreeSub", 330, 12], ["btreeIdx", 330, 11],
    ["btreeOps", 330, 11], ["barLine", 700, 12], ["foot", 700, 13],
  ],
  "db-relational/generated-column-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["leftTitle", 340, 12], ["in1", 304, 12], ["in2", 304, 12],
    ["resultTitle", 304, 14], ["resultSub", 304, 11], ["panelTitle", 320, 12],
    ["box1Title", 284, 12], ["box1Sub", 284, 11], ["box2Title", 284, 12],
    ["box2Sub", 284, 11], ["box3Title", 284, 12], ["box3Sub", 284, 11],
    ["foot", 700, 13],
  ],
  "db-relational/toast-select-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["leftTitle", 330, 12], ["leftCols", 294, 12], ["leftWide", 294, 12],
    ["leftVerdict", 294, 12], ["rightTitle", 330, 11], ["rightCols", 294, 12],
    ["rightWide", 294, 12], ["rightVerdict", 294, 12], ["foot", 700, 13],
  ],
  "db-relational/type-defaults-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["avoidHead", 200, 11], ["useHead", 440, 11], ["wrongs", 200, 13],
    ["rights", 444, 12], ["foot", 700, 13],
  ],
  "db-relational/state-transition-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["states", 174, 14], ["allowed", 65, 11], ["refused", 200, 13],
    ["triggerLine", 424, 12], ["foot", 700, 13],
  ],
  "db-relational/circular-deferral-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["aTitle", 264, 13], ["aFk", 264, 13], ["bTitle", 264, 13],
    ["bFk", 264, 13], ["midLine", 700, 12], ["steps", 210, 11], ["foot", 700, 13],
  ],
  "db-relational/tenant-rls-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["leftTitle", 340, 12], ["rows", 304, 12], ["leftStrip", 304, 12],
    ["rightTitle", 320, 12], ["box1Title", 284, 11], ["box1Sub", 284, 11],
    ["box2Title", 284, 11], ["box2Sub", 284, 11], ["strip", 284, 12],
    ["foot", 700, 13],
  ],
  "db-relational/extensions-cover-1": [
    ["svgTitle", 760, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["needs", 314, 12], ["exts", 334, 14], ["foot", 700, 13],
  ],
  // db-indexes wave (14 figures)
  "db-indexes/btree-descend-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["rootTitle", 160, 13],
    ["rootSub", 160, 11], ["leafTitle", 160, 13], ["leafKey", 160, 12],
    ["leafTid", 160, 11], ["heapTitle", 160, 13], ["heapSub", 170, 11],
    ["walkTag", 140, 11], ["seqTitle", 320, 13], ["seqLine", 320, 15],
    ["idxTitle", 320, 13], ["idxLine", 320, 15], ["foot", 700, 12],
  ],
  "db-indexes/write-storage-tax-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["writeTitle", 300, 13],
    ["writeBig", 300, 20], ["writeL1", 300, 11], ["writeL2", 300, 11],
    ["writeL3", 300, 11], ["storeTitle", 300, 13], ["storeBig", 300, 20],
    ["storeL1", 300, 11], ["storeL2", 300, 11], ["storeL3", 300, 11],
    ["foot", 660, 12],
  ],
  "db-indexes/composite-sort-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["panelTitle", 280, 12],
    ["layers", 240, 12], ["queries", 350, 12], ["skipNote", 400, 11],
    ["foot", 700, 12],
  ],
  "db-indexes/dashboard-composite-1": [
    ["headline", 760, 22, "display"], ["key1", 240, 12], ["key2", 180, 12],
    ["key3", 160, 12], ["q1", 660, 13], ["q2", 660, 13],
    ["noEntry", 260, 11], ["foot", 700, 12],
  ],
  "db-indexes/partial-subset-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["fullTitle", 400, 12],
    ["fullSize", 660, 16], ["partTitle", 400, 12], ["partSize", 500, 15],
    ["foot", 700, 12],
  ],
  "db-indexes/covering-include-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["keyTitle", 190, 12],
    ["keyCols", 200, 11], ["incTitle", 190, 12], ["incCols", 190, 11],
    ["leafTag", 200, 11], ["resultTitle", 220, 15], ["resultSub", 220, 11],
    ["speedTag", 220, 13], ["heapTag", 280, 12], ["foot", 700, 12],
  ],
  "db-indexes/gin-posting-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["docTitle", 190, 12],
    ["docKeys", 170, 11], ["listNames", 100, 11], ["queryLine", 640, 12],
    ["foot", 700, 12],
  ],
  "db-indexes/hot-fillfactor-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["fullTitle", 330, 13],
    ["fullUsed", 250, 11], ["fullLine", 330, 12], ["hotTitle", 330, 13],
    ["hotUsed", 250, 11], ["hotLine", 330, 12], ["foot", 700, 12],
  ],
  "db-indexes/vm-bit-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["okTitle", 330, 13],
    ["okBig", 330, 20], ["okLine", 330, 12], ["okRows", 330, 11],
    ["badTitle", 330, 13], ["badBig", 330, 20], ["badLine", 330, 12],
    ["badRows", 330, 11], ["foot", 700, 12],
  ],
  "db-indexes/autovacuum-tune-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["barLabel", 500, 11],
    ["defTag", 150, 12], ["tunedTag", 150, 12], ["set1", 310, 12],
    ["set2", 310, 12], ["monLine", 600, 12], ["foot", 700, 12],
  ],
  "db-indexes/fk-cascade-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["parentBox", 160, 12],
    ["childBox", 240, 12], ["childSub", 230, 11], ["resultBig", 150, 13],
    ["resultSub", 150, 10], ["fixLine", 720, 12], ["ruleLine", 400, 12],
  ],
  "db-indexes/coercion-trap-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["badQuery", 660, 13],
    ["badSub", 660, 11], ["goodQuery", 660, 13], ["goodSub", 660, 11],
    ["noteLine", 660, 12],
  ],
  "db-indexes/search-options-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["queryLine", 660, 13],
    ["optTitles", 200, 13], ["optOps", 200, 12], ["optSubs", 200, 11],
    ["foot", 700, 12],
  ],
  "db-indexes/ticket-hot-split-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["doneSeg", 520, 12],
    ["openSeg", 90, 11], ["progSeg", 200, 11], ["coverShort", 200, 11],
    ["clauseLine", 500, 12], ["foot", 700, 12],
  ],
  // db-plans wave (12 figures)
  "db-plans/explain-reading-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["line1", 680, 12],
    ["line2", 680, 12], ["line3", 680, 12], ["line4", 680, 12],
    ["costTitle", 200, 13], ["costSub", 200, 11], ["rowsTitle", 200, 13],
    ["rowsSub", 200, 11], ["loopsTitle", 200, 13], ["loopsSub", 200, 11],
    ["foot", 700, 13],
  ],
  "db-plans/explain-spill-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["estTitle", 190, 13],
    ["estLine1", 190, 12], ["estLine2", 190, 20], ["actTitle", 230, 13],
    ["actLine1", 230, 15], ["actLine2", 230, 15], ["actLine3", 230, 12],
    ["fixTitle", 180, 13], ["fixLine1", 180, 12], ["fixLine2", 180, 15],
    ["foot", 700, 13],
  ],
  "db-plans/scan-bitmap-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["leftTitle", 220, 12],
    ["leftSub", 220, 11], ["orderBefore", 160, 12], ["midTitle", 170, 15],
    ["midSub", 170, 11], ["rightTitle", 220, 12], ["rightSub", 220, 11],
    ["orderAfter", 160, 12], ["foot", 700, 13],
  ],
  "db-plans/scan-buffers-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["code1", 680, 12],
    ["code2", 680, 12], ["hitTitle", 330, 15], ["hitSub", 330, 11],
    ["readTitle", 330, 15], ["readSub", 330, 11], ["verdict", 700, 12],
  ],
  "db-plans/stats-mcv-lookup-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["s1Title", 210, 13],
    ["s1a", 210, 12], ["s1b", 210, 15], ["s2Title", 210, 13],
    ["s2a", 210, 12], ["s2b", 210, 12], ["s3Title", 210, 13],
    ["s3a", 210, 12], ["s3b", 210, 12], ["foot", 700, 13],
  ],
  "db-plans/stats-observability-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["leftTitle", 340, 13],
    ["leftLines", 300, 11], ["rightTitle", 340, 13], ["rightLines", 300, 11],
    ["foot", 700, 13],
  ],
  "db-plans/extstats-kinds-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["depTitle", 210, 15],
    ["depVer", 210, 11], ["depEx", 210, 13], ["ndiTitle", 210, 15],
    ["ndiVer", 210, 11], ["ndiEx", 210, 12], ["mcvTitle", 210, 15],
    ["mcvVer", 210, 11], ["mcvEx", 210, 12], ["foot", 700, 13],
  ],
  "db-plans/extstats-workflow-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["stepTitles", 160, 13],
    ["stepA", 160, 11], ["stepB", 160, 12], ["foot", 700, 13],
  ],
  "db-plans/cache-generic-trap-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["leftTitle", 260, 13],
    ["leftA", 260, 12], ["leftB", 260, 20], ["switchNote", 70, 11],
    ["rightTitle", 340, 13], ["rightA", 340, 12], ["rightB", 340, 20],
    ["signal", 700, 12], ["fix", 700, 11],
  ],
  "db-plans/cache-ssd-tuning-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["leftTitle", 310, 13],
    ["leftA", 310, 12], ["leftB", 310, 12], ["leftC", 310, 13],
    ["rightTitle", 320, 13], ["rightA", 320, 12], ["rightB", 320, 12],
    ["rightC", 320, 11], ["foot", 700, 13],
  ],
  "db-plans/stability-monday-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["d1Title", 200, 15],
    ["d1Sub", 200, 11], ["d2Title", 200, 15], ["d2Sub", 200, 11],
    ["d3Title", 200, 15], ["d3Sub", 200, 11], ["fix", 700, 12],
  ],
  "db-plans/stability-workmem-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["leftTitle", 280, 13],
    ["leftA", 280, 12], ["leftB", 280, 12], ["leftC", 280, 18],
    ["rightTitle", 310, 13], ["rightA", 310, 12], ["rightB", 310, 12],
    ["rightC", 310, 15], ["foot", 700, 13],
  ],
  // db-mvcc wave (15 figures)
  "db-mvcc/readers-writers-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["readerTitle", 300, 13],
    ["readerRows", 270, 12], ["writerTitle", 300, 13], ["writerRows", 270, 12],
    ["midNote", 640, 12], ["foot", 700, 13],
  ],
  "db-mvcc/lost-update-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["tabA", 200, 12],
    ["aSteps", 170, 11], ["rowTitle", 240, 12], ["rowSteps", 210, 11],
    ["tabB", 200, 12], ["bSteps", 170, 11], ["fix", 640, 12], ["foot", 700, 13],
  ],
  "db-mvcc/tuple-header-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["segNames", 140, 11],
    ["total", 680, 15], ["cols", 480, 12], ["foot", 700, 13],
  ],
  "db-mvcc/snapshot-rule-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["snapTitle", 240, 12],
    ["snapRows", 210, 11], ["rowTitle", 384, 12], ["v1", 344, 13],
    ["why1", 344, 11], ["v2", 344, 13], ["why2", 344, 11],
    ["rule", 700, 12], ["foot", 700, 13],
  ],
  "db-mvcc/hot-page-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["pageTitle", 320, 13],
    ["oldLab", 290, 12], ["newLab", 290, 12], ["reserve", 290, 11],
    ["idxTitle", 320, 13], ["barHot", 300, 12], ["barFull", 300, 12],
    ["wal", 270, 13], ["chainNote", 700, 12], ["foot", 700, 13],
  ],
  "db-mvcc/write-skew-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["t1", 200, 12],
    ["t1Steps", 170, 11], ["t2", 200, 12], ["t2Steps", 170, 11],
    ["invTitle", 188, 12], ["invRule", 166, 11], ["invResult", 166, 11],
    ["commitOk", 200, 11], ["fix", 640, 12], ["verdict", 700, 13],
  ],
  "db-mvcc/autovacuum-threshold-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["fBase", 200, 12],
    ["fScale", 230, 12], ["fGo", 180, 12], ["wCount", 320, 13],
    ["wWake", 320, 12], ["nap", 320, 11], ["lockLine", 300, 12],
    ["lockNote", 300, 12], ["ddlNote", 300, 11], ["formula", 700, 12],
    ["foot", 700, 13],
  ],
  "db-mvcc/xmin-pinning-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["src1", 190, 11],
    ["src2", 190, 11], ["mid", 214, 12], ["gate", 214, 11], ["res", 190, 12],
    ["grow", 190, 11], ["fix", 660, 12], ["diag", 700, 12], ["prev", 700, 13],
  ],
  "db-mvcc/clog-hint-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["steps", 160, 12],
    ["note1", 320, 12], ["note2", 320, 12], ["hint", 700, 12], ["foot", 700, 13],
  ],
  "db-mvcc/xid-freeze-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["rungs", 270, 12],
    ["frozenTitle", 320, 12], ["frozenBody", 320, 11], ["frozenNote", 320, 12],
    ["multiTitle", 320, 12], ["multiBody", 320, 11], ["multiNote", 320, 11],
    ["query", 700, 12], ["foot", 700, 13],
  ],
  "db-mvcc/ssi-cycle-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["t1", 270, 12],
    ["t2", 270, 12], ["dep", 200, 11], ["cycle", 340, 12], ["abort", 480, 13],
    ["rates", 700, 12], ["foot", 700, 13],
  ],
  "db-mvcc/autovacuum-tuning-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["bars", 180, 12],
    ["facts", 660, 12], ["foot", 700, 13],
  ],
  "db-mvcc/bloat-failure-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["stages", 140, 11],
    ["growth", 660, 13], ["xmin", 660, 11], ["fix", 660, 12],
    ["log", 700, 12], ["foot", 700, 13],
  ],
  "db-mvcc/deploy-levers-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["l1t", 224, 12],
    ["l1d", 224, 11], ["l1c", 224, 11], ["l2t", 224, 12], ["l2d", 224, 11],
    ["l2c", 224, 11], ["l3t", 224, 12], ["l3d", 224, 11], ["l3c", 224, 11],
    ["diskU", 224, 11], ["minU", 224, 11], ["notSet", 224, 11],
    ["leverNote", 700, 12], ["foot", 700, 13],
  ],
  "db-mvcc/distributed-snapshot-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["coord", 280, 12],
    ["workers", 190, 11], ["hlc", 320, 11], ["proto", 300, 11],
    ["coloc", 700, 12], ["scope", 700, 13],
  ],
  // db-pooling wave (14 figures)
  "db-pooling/connect-cost-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["leftTitle", 320, 13],
    ["leftRows", 290, 12], ["leftFoot", 320, 13], ["rightTitle", 320, 13],
    ["rightRows", 290, 12], ["rightFoot", 320, 13], ["heroLine", 700, 15],
    ["foot", 700, 12],
  ],
  "db-pooling/scale-failure-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["workTitle", 200, 12],
    ["workLine", 170, 16], ["workNote", 200, 11], ["capTitle", 200, 12],
    ["capLine", 170, 16], ["capNote", 200, 11], ["fixTitle", 200, 12],
    ["fixLine", 170, 12], ["fixNote", 200, 11], ["foot", 700, 13],
  ],
  "db-pooling/mode-lease-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["sesTitle", 330, 13],
    ["sesClients", 110, 11], ["sesBackends", 110, 11], ["sesFoot", 330, 11],
    ["txTitle", 330, 13], ["txClients", 100, 11], ["txBackends", 110, 11],
    ["txFoot", 330, 11], ["foot", 700, 13],
  ],
  "db-pooling/set-loss-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["s1Title", 200, 13],
    ["s1Line", 170, 12], ["s1Sub", 200, 12], ["s2Title", 200, 13],
    ["s2Line", 170, 12], ["s2Sub", 200, 12], ["s3Title", 200, 13],
    ["s3Line", 170, 12], ["s3Sub", 200, 12], ["fixLine", 700, 13],
  ],
  "db-pooling/backend-formula-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["rows", 250, 12],
    ["vals", 90, 15], ["foot", 700, 13],
  ],
  "db-pooling/worker-formula-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["c1t", 150, 11],
    ["c1v", 150, 14], ["c2t", 150, 11], ["c2v", 150, 14], ["c3t", 150, 11],
    ["c3v", 150, 14], ["c4t", 155, 11], ["c4v", 155, 14], ["foot", 700, 13],
  ],
  "db-pooling/midnight-page-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["poolTitle", 220, 13],
    ["poolNote", 220, 11], ["waitTitle", 400, 13], ["waitLine", 200, 30],
    ["waitSub", 150, 11], ["stuckLine", 200, 12], ["stuckSub", 200, 11],
    ["diagNote", 400, 11], ["foot", 680, 13],
  ],
  "db-pooling/triple-hold-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["beginTitle", 180, 16],
    ["beginSub", 180, 12], ["holds", 440, 13], ["holdSubs", 440, 11],
    ["fixLine", 680, 13],
  ],
  "db-pooling/prepare-timeline-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["eraHead", 200, 11],
    ["eras", 200, 12], ["txHead", 120, 11], ["txStats", 120, 12],
    ["prepHead", 320, 11], ["prepStats", 320, 12], ["prepSubs", 320, 11],
    ["foot", 700, 13],
  ],
  "db-pooling/verify-stack-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["checks", 600, 12],
    ["foot", 700, 13],
  ],
  "db-pooling/fork-cost-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["clientT", 160, 13],
    ["clientS", 160, 11], ["pmT", 180, 13], ["pmS", 180, 11],
    ["beT", 236, 13], ["beS", 236, 11], ["costLine", 680, 13],
    ["asymLine", 680, 13],
  ],
  "db-pooling/conn-budget-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["parts", 100, 20],
    ["partLabels", 100, 11], ["totalLine", 680, 13], ["warnLine", 680, 13],
  ],
  "db-pooling/pooler-pick-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["nameHead", 150, 11],
    ["threadHead", 150, 11], ["bestHead", 300, 11], ["names", 150, 12],
    ["threads", 150, 11], ["bests", 300, 11], ["foot", 700, 12],
  ],
  "db-pooling/conn-storm-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["stormT", 320, 13],
    ["stormS", 280, 12], ["capT", 318, 13], ["capS", 278, 12],
    ["fixes", 210, 11], ["foot", 700, 13],
  ],
  // db-migrations wave (14 figures)
  "db-migrations/drift-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["envs", 210, 13],
    ["hasPhone", 170, 12], ["noPhone", 170, 12], ["envNote", 210, 11],
    ["recLine", 210, 11], ["foot", 700, 13],
  ],
  "db-migrations/deploy-order-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["laneA", 700, 13],
    ["stepsA", 140, 12], ["verdictA", 700, 12], ["laneB", 700, 13],
    ["stepsB", 130, 12], ["verdictB", 700, 12], ["foot", 700, 13],
  ],
  "db-migrations/fast-path-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["heapTitle", 290, 12],
    ["oldRow", 250, 11], ["newRow", 250, 11], ["catNote", 290, 11],
    ["readNote", 700, 12], ["foot", 700, 13],
  ],
  "db-migrations/not-null-steps-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["steps", 120, 12],
    ["subs", 120, 11], ["locks", 130, 11], ["batchNote", 480, 12],
    ["foot", 700, 13],
  ],
  "db-migrations/lock-queue-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["colT", 200, 13],
    ["colD", 200, 11], ["colL", 200, 11], ["queueNote", 700, 11],
    ["qChips", 170, 11], ["foot", 700, 13],
  ],
  "db-migrations/lock-matrix-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["modes", 250, 11],
    ["holders", 340, 11], ["foot", 700, 13],
  ],
  "db-migrations/invalid-index-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["steps", 120, 12],
    ["subs", 130, 11], ["notes", 120, 11], ["verify", 560, 12], ["foot", 700, 13],
  ],
  "db-migrations/not-valid-split-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["laneA", 700, 13],
    ["stepsA", 150, 12], ["verdictA", 700, 12], ["laneB", 700, 13],
    ["stepsB", 150, 12], ["verdictB", 700, 12], ["foot", 700, 13],
  ],
  "db-migrations/rolling-overlap-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["oldTitle", 200, 13],
    ["oldSub", 200, 11], ["dbTitle", 200, 12], ["goneRow", 170, 12],
    ["newRow", 170, 12], ["newTitle", 200, 13], ["newSub", 200, 11],
    ["oldErr", 200, 11], ["newOk", 200, 11], ["foot", 700, 13],
  ],
  "db-migrations/down-migration-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["laneA", 700, 13],
    ["stepsA", 140, 11], ["verdictA", 700, 12], ["laneB", 700, 13],
    ["stepsB", 140, 11], ["verdictB", 700, 12], ["foot", 700, 13],
  ],
  "db-migrations/advisory-lock-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["pods", 170, 12],
    ["role1", 170, 11], ["roleWait", 170, 11], ["lockSub", 290, 11],
    ["result", 560, 12], ["foot", 700, 13],
  ],
  "db-migrations/ddl-txmode-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["leftTitle", 320, 13],
    ["leftNote", 320, 11], ["leftNote2", 320, 11], ["rightTitle", 320, 13],
    ["exc", 290, 11], ["annNote", 320, 11], ["split", 560, 12], ["foot", 700, 13],
  ],
  "db-migrations/failure-modes-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["modes", 210, 12],
    ["signals", 210, 11], ["foot", 700, 13],
  ],
  "db-migrations/replica-lag-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["primTitle", 170, 13],
    ["primSub", 170, 11], ["streamNote", 200, 11], ["reps", 180, 12],
    ["lagNorm", 140, 11], ["lagLoad", 140, 11], ["gate", 560, 12],
    ["foot", 700, 12],
  ],
  // db-sharding wave (14 figures)
  "db-sharding/ceiling-ladder-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["p1t", 200, 12],
    ["p1v", 200, 15], ["p1s", 200, 11], ["p2t", 200, 12], ["p2v", 200, 15],
    ["p2s", 200, 11], ["p3t", 200, 12], ["p3v", 200, 15], ["p3s", 200, 11],
    ["ladLine", 700, 12], ["ladSub", 700, 11],
  ],
  "db-sharding/sharding-tradeoff-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["lTitle", 280, 12],
    ["lRows", 240, 12], ["rTitle", 280, 12], ["rRows", 240, 12],
    ["barLine", 660, 12], ["barSub", 660, 11],
  ],
  "db-sharding/key-properties-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["titles", 150, 12],
    ["vals", 150, 15], ["subs", 150, 11], ["barLine", 660, 12], ["barSub", 660, 11],
  ],
  "db-sharding/strategy-failure-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["names", 200, 13],
    ["mechs", 170, 11], ["wins", 200, 11], ["risks", 200, 11],
    ["footLine", 700, 12], ["footSub", 700, 11],
  ],
  "db-sharding/partition-vs-shard-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["lTitle", 320, 13],
    ["lRows", 280, 12], ["rTitle", 320, 13], ["rRows", 280, 12], ["barLine", 660, 12],
  ],
  "db-sharding/compose-layers-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["s0t", 700, 12],
    ["s1t", 700, 12], ["parts", 200, 12], ["qLine", 660, 11],
  ],
  "db-sharding/citus-topology-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["clientT", 180, 12],
    ["coordT", 260, 12], ["wNames", 200, 12], ["wSubs", 200, 12],
    ["footLine", 700, 12],
  ],
  "db-sharding/table-types-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["names", 200, 12],
    ["lives", 200, 11], ["uses", 170, 11], ["joins", 200, 11],
    ["footLine", 700, 12],
  ],
  "db-sharding/tenant-isolation-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["hTitle", 280, 12],
    ["hRows", 240, 12], ["rTitle", 280, 12], ["rRows", 240, 12],
    ["cmdLine", 660, 12], ["cmdSub", 660, 11],
  ],
  "db-sharding/detection-signals-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["sigN", 300, 12],
    ["sigT", 200, 12], ["foot", 700, 12],
  ],
  "db-sharding/schema-routing-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["lTitle", 310, 12],
    ["lRows", 270, 12], ["rTitle", 310, 12], ["rRows", 270, 12],
    ["barLine", 700, 12], ["barSub", 700, 11],
  ],
  "db-sharding/tenancy-decision-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["decN", 380, 12],
    ["decC", 220, 12], ["footLine", 700, 12],
  ],
  "db-sharding/shard-move-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["stT", 150, 12],
    ["stV", 150, 12], ["stS", 150, 11], ["barLine", 660, 12], ["barSub", 660, 11],
  ],
  "db-sharding/commit-paths-1": [
    ["headline", 760, 22, "display"], ["sub", 700, 13], ["lTitle", 320, 12],
    ["lRows", 280, 12], ["rTitle", 320, 12], ["rRows", 280, 12],
    ["barLine", 660, 12], ["barSub", 660, 11],
  ],
  // db-capstone wave (10 figures)
  "db-capstone/seven-acts-latency-1": [
    ["svgTitle", 1470, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["act2Title", 320, 13], ["states", 95, 13], ["results", 95, 12],
    ["noteCode", 300, 11], ["notePages", 300, 12], ["act3Title", 320, 13],
    ["estChip", 140, 12], ["actChip", 140, 12], ["loopLine", 270, 15],
    ["loopSub", 270, 11], ["verdict", 340, 13], ["fixLine", 340, 12],
    ["foot", 700, 13], ["caption", 1850, 12],
  ],
  "db-capstone/seven-acts-scale-2": [
    ["svgTitle", 1280, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["titles", 155, 12], ["causes", 155, 11], ["froms", 155, 13],
    ["tos", 120, 20], ["levers", 155, 11], ["stages", 155, 11],
    ["foot", 700, 13], ["caption", 2240, 12],
  ],
  "db-capstone/leading-column-1": [
    ["svgTitle", 1190, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["goodTitle", 320, 12], ["goodQuery", 290, 12], ["goodResult", 290, 15],
    ["goodNote", 290, 11], ["badTitle", 320, 12], ["badQuery", 290, 12],
    ["badResult", 290, 15], ["badNote", 290, 11], ["strip", 540, 12],
    ["caption", 2130, 12],
  ],
  "db-capstone/stats-estimate-1": [
    ["svgTitle", 1250, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["expTitle", 290, 12], ["expChip", 290, 12], ["planBox", 290, 15],
    ["planSub", 290, 11], ["realTitle", 290, 12], ["realChip", 290, 12],
    ["goodBox", 290, 15], ["goodSub", 290, 11], ["verdict", 340, 13],
    ["strip", 540, 12], ["caption", 2130, 12],
  ],
  "db-capstone/xmin-horizon-1": [
    ["svgTitle", 1110, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["leftTitle", 320, 12], ["horizonLab", 160, 11], ["nowLab", 80, 11],
    ["openLab", 270, 11], ["vacLab", 300, 12], ["deadNote", 300, 11],
    ["rightTitle", 320, 12], ["sizes", 55, 12], ["leverLine", 300, 11],
    ["foot", 700, 13], ["caption", 2380, 12],
  ],
  "db-capstone/expand-contract-1": [
    ["svgTitle", 1310, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["steps", 220, 12], ["notes", 230, 11], ["flowA", 220, 11],
    ["flowB", 220, 11], ["naive", 700, 13], ["caption", 2730, 12],
  ],
  "db-capstone/distribution-methods-1": [
    ["svgTitle", 1450, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["methods", 140, 13], ["prices", 530, 12], ["coloc", 700, 11],
    ["caption", 3030, 12],
  ],
  "db-capstone/hot-shard-1": [
    ["svgTitle", 1190, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["loadTitle", 320, 12], ["names", 80, 11], ["acmeLab", 200, 11],
    ["idleLab", 55, 11], ["fixTitle", 320, 12], ["optA", 290, 12],
    ["optANote", 290, 11], ["optB", 290, 12], ["optBNote", 290, 11],
    ["toolLine", 290, 11], ["pauseLine", 290, 11], ["foot", 700, 13],
    ["caption", 2610, 12],
  ],
  "db-capstone/xid-wraparound-1": [
    ["svgTitle", 1370, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["countTitle", 320, 12], ["zeroLab", 40, 11], ["freezeLab", 200, 11],
    ["wrapLab", 120, 11], ["rateLine", 320, 12], ["daysLine", 320, 13],
    ["warnLine", 320, 11], ["monTitle", 320, 12], ["queryLine", 290, 11],
    ["alertLine", 290, 15], ["alertSub", 290, 11], ["defLine", 320, 11],
    ["foot", 700, 13], ["caption", 2540, 12],
  ],
  "db-capstone/diagnostic-tools-1": [
    ["svgTitle", 1370, 12], ["headline", 760, 22, "display"], ["sub", 700, 13],
    ["acts", 80, 12], ["tools", 230, 11], ["signals", 370, 11],
    ["caption", 2740, 12],
  ],
};
function dictOf(src) {
  const out = { en: {}, ru: {} };
  for (const lang of ["en", "ru"]) {
    const m = src.match(new RegExp(lang + ":\\s*\\{([\\s\\S]*?)\\n  \\},"));
    const body = m[1];
    // string fields and string arrays
    for (const fm of body.matchAll(/(\w+):\s*"([^"]*)"/g)) out[lang][fm[1]] = fm[2];
    for (const fm of body.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
      out[lang][fm[1]] = [...fm[2].matchAll(/"([^"]*)"/g)].map(x => x[1]);
    }
  }
  return out;
}
for (const [fig, rs] of Object.entries(RULES)) {
  const src = await readFile(resolve(siteRoot, "src/components/figures", `${fig}.astro`), "utf8");
  const d = dictOf(src);
  for (const [key, maxW, size, kind] of rs) {
    for (const lang of ["en", "ru"]) {
      const v = d[lang][key];
      const vals = Array.isArray(v) ? v : [v];
      for (const s of vals) check(est(s, size, kind) <= maxW, `${fig} ${lang}.${key} "${s}" ~${est(s,size,kind).toFixed(0)}px > ${maxW}px`);
    }
  }
  // rects within viewBox
  for (const m of src.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
    const [x, y, w, h] = m.slice(1).map(Number);
    check(x >= 0 && y >= 0 && x + w <= 800 && y + h <= 420, `${fig} rect (${x},${y},${w},${h}) outside 800x420`);
  }
  for (const m of src.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
    const [x, y, r] = m.slice(1).map(Number);
    check(x - r >= 0 && y - r >= 0 && x + r <= 800 && y + r <= 420, `${fig} circle (${x},${y},${r}) outside`);
  }
}
console.log(fails === 0 ? "GEOMETRY OK" : `${fails} failures`);
process.exit(fails ? 1 : 0);
