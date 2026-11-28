#!/usr/bin/env node
"use strict";

const assert = require("assert");
const Constants = require("../js/constants.js");
const Clickbait = require("../js/clickbait.js");
const Scoring = require("../js/scoring.js");

const defaultSettings = Constants.defaultSettings();

// 30 genuinely valuable videos (including tricky cases: acronyms, "I built X in 24h", numbered tutorials, non-English, RSS-only, missing description)
const VALUABLE_FIXTURES = [
  { title: "SQL Indexing & Query Optimization Explained", description: "0:00 Intro\n2:15 B-Tree\n8:40 Composite Indexes\n14:20 EXPLAIN ANALYZE", duration: "PT24M10S", viewCount: 180000, likeCount: 9500, commentCount: 410 },
  { title: "How GPU Memory Bandwidth Limits LLM Inference", description: "Deep dive into KV cache, SRAM vs HBM, and roof-line modeling for transformers.", duration: "PT32M00S", viewCount: 95000, likeCount: 5400 },
  { title: "AWS VPC Architecture From Scratch (Step by Step)", description: "Subnets, route tables, NAT gateways, and security groups walkthrough.", duration: "PT45M12S", viewCount: 220000, likeCount: 8200 },
  { title: "NASA Webb Telescope: How Infrared Spectroscopy Works", description: "0:00 Optics\n4:10 NIRSpec\n10:00 Exoplanet atmospheres", duration: "PT18M45S", viewCount: 410000, likeCount: 21000 },
  { title: "MIT 6.S191: Introduction to Deep Learning Lecture 1", description: "Official MIT lecture covering perceptrons, backpropagation, and PyTorch.", duration: "PT52M30S", viewCount: 650000, likeCount: 28000 },
  { title: "I Built a Neural Network From Scratch in 24 Hours", description: "Implementing forward pass, backprop, and gradient descent in pure Python without PyTorch.", duration: "PT19M20S", viewCount: 140000, likeCount: 7200 },
  { title: "7 Graph Algorithms Explained Step by Step", description: "BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Prim, Kruskal with code.", duration: "PT28M15S", viewCount: 310000, likeCount: 14000 },
  { title: "5 Common API Design Mistakes and How to Fix Them", description: "Pagination, idempotency keys, rate limiting, versioning, and error schemas.", duration: "PT16M40S", viewCount: 88000, likeCount: 4100 },
  { title: "Attention Is All You Need — Paper Review & Math Intuition", description: "0:00 Problem\n5:00 Self-attention\n12:00 Multi-head\n18:00 Positional encoding", duration: "PT26M00S", viewCount: 195000, likeCount: 11000 },
  { title: "Stanford CS224N: NLP with Deep Learning | Transformers", description: "Lecture by Christopher Manning covering self-attention and pretraining.", duration: "PT1H12M00S", viewCount: 320000, likeCount: 12000 },
  { title: "REST vs GraphQL vs gRPC: Benchmark & Architecture Analysis", description: "Latency, payload size, and schema evolution benchmarks.", duration: "PT21M05S", viewCount: 76000, likeCount: 3400 },
  { title: "Understanding CUDA Kernels Under the Hood", description: "Warps, shared memory, coalesced access, and occupancy.", duration: "PT35M10S", viewCount: 54000, likeCount: 2900 },
  { title: "MLOps Fundamentals: CI/CD for Machine Learning Pipelines", description: "Model registry, feature store, drift monitoring.", duration: "PT29M40S", viewCount: 41000, likeCount: 1800 },
  { title: "FAQ: How CRISPR Gene Editing Actually Works", description: "Cas9 mechanism, guide RNA, and off-target effects.", duration: "PT14M50S", viewCount: 125000, likeCount: 6100 },
  { title: "PostgreSQL Internals: MVCC, Vacuum, and WAL", description: "Database storage engine internals walkthrough.", duration: "PT41M00S", viewCount: 63000, likeCount: 3200 },
  { title: "Building a Compiler in Rust: Lexer & Parser Walkthrough", description: "Live coding a recursive descent parser from scratch.", duration: "PT48M20S", viewCount: 47000, likeCount: 2500 },
  { title: "Neuroscience of Sleep and Memory Consolidation", description: "REM vs slow-wave sleep and hippocampal replay.", duration: "PT38M15S", viewCount: 280000, likeCount: 12500 },
  { title: "Distributed Consensus: Raft Algorithm Explained", description: "Leader election, log replication, safety proof.", duration: "PT22M30S", viewCount: 165000, likeCount: 8100 },
  { title: "Case Study: How Cloudflare Scaled DNS to 100M RPS", description: "Engineering postmortem and network architecture.", duration: "PT25M10S", viewCount: 92000, likeCount: 4400 },
  { title: "Linear Algebra Intuition: Eigenvalues and PCA", description: "Visualizing eigenvectors and dimensionality reduction.", duration: "PT17M40S", viewCount: 510000, likeCount: 27000 },
  // Non-English titles (must fail open!)
  { title: "機械学習入門：ニューラルネットワークの基礎", description: "Pythonで実装する深層学習のチュートリアル", duration: "PT20M00S", viewCount: 35000, likeCount: 1600 },
  { title: "डेटा स्ट्रक्चर और एल्गोरिदम ट्यूटोरियल", description: "हिंदी में पूरा कोर्स", duration: "PT45M00S", viewCount: 82000, likeCount: 4200 },
  { title: "Introducción a Redes Neuronales desde Cero", description: "Explicación paso a paso con ejemplos.", duration: "PT25M00S", viewCount: 44000, likeCount: 2100 },
  // RSS-only mode (missing duration, missing commentCount, missing tags)
  { title: "Reinforcement Learning Course: Policy Gradients", description: "REINFORCE, actor-critic, and PPO fundamentals.", duration: "", viewCount: 45000, likeCount: 2100, starRatingAverage: 4.9, starRatingCount: 1800, isRssStarter: true },
  { title: "How TCP Congestion Control Works", description: "", duration: "", viewCount: 28000, likeCount: 1300, isRssStarter: true },
  // Edge cases: zero views, live stream, missing description on clean title
  { title: "Zero-Knowledge Proofs: Mathematical Foundations", description: "", duration: "PT31M00S", viewCount: 0, likeCount: 0 },
  { title: "Live Coding: Implementing an HTTP/2 Server", description: "Streaming live implementation session.", duration: "PT1H05M00S", liveBroadcastContent: "live", viewCount: 1200, likeCount: 90 },
  { title: "Docker Networking & Bridge Interfaces Explained", description: "veth pairs, iptables, namespaces.", duration: "PT19M10S", viewCount: 64000, likeCount: 3000 },
  { title: "Why Transformers Replaced RNNs for NLP", description: "Parallelization, long-range dependencies, and scaling laws.", duration: "PT15M55S", viewCount: 110000, likeCount: 5200 },
  { title: "3Blue1Brown: Backpropagation Calculus", channelId: "UCYO_jab_esuFRV4b17AJtAw", description: "Chain rule intuition in neural networks.", duration: "PT10M17S", viewCount: 2400000, likeCount: 95000 }
];

// 30 clickbait / low-value videos
const CLICKBAIT_FIXTURES = [
  { title: "YOU WON'T BELIEVE WHAT HAPPENED NEXT!!! 😱😱😱", description: "Subscribe for more!", duration: "PT4M10S", viewCount: 900000, likeCount: 2100 },
  { title: "THIS CHANGES EVERYTHING!! AI IS OVER (NOT CLICKBAIT)", description: "Follow me on IG", duration: "PT11M20S", viewCount: 450000, likeCount: 1200 },
  { title: "NOBODY TELLS YOU THIS SECRET ABOUT PYTHON!!", description: "", duration: "PT8M15S", viewCount: 200000, likeCount: 600 },
  { title: "STOP DOING THIS RIGHT NOW!! BIGGEST MISTAKE EVER 😱🔥", description: "Merch link below", duration: "PT10M05S", viewCount: 310000, likeCount: 900 },
  { title: "HE DID THIS AND IT RUINED EVERYTHING!!", description: "", duration: "PT12M30S", viewCount: 520000, likeCount: 1500 },
  { title: "SHOCKING TRUTH THEY DON'T WANT YOU TO KNOW!!", description: "Patreon in bio", duration: "PT14M00S", viewCount: 180000, likeCount: 500 },
  { title: "MAKE $10,000 OVERNIGHT WITH THIS ONE TRICK (100% GUARANTEED)", description: "Click link", duration: "PT9M45S", viewCount: 750000, likeCount: 1900 },
  { title: "GOOGLE EXPOSED!! WATCH BEFORE IT'S DELETED!! 🚨🚨", description: "", duration: "PT15M10S", viewCount: 640000, likeCount: 1700 },
  { title: "7 SECRETS DOCTORS HATE THAT WILL SHOCK YOU!!", description: "", duration: "PT10M20S", viewCount: 420000, likeCount: 1100 },
  { title: "MIND-BLOWING!! I TRIED THIS AND CHANGED MY LIFE FOREVER!!", description: "Subscribe!", duration: "PT8M30S", viewCount: 290000, likeCount: 850 },
  { title: "PROGRAMMING IS DEAD!! NEVER DO THIS IN 2026!!", description: "", duration: "PT11M00S", viewCount: 510000, likeCount: 1400 },
  { title: "THE BRUTAL TRUTH ABOUT STARTUPS (GONE WRONG) 😱💀", description: "", duration: "PT13M45S", viewCount: 330000, likeCount: 950 },
  { title: "WAIT TILL THE END!! UNBELIEVABLE AI HACK!!", description: "", duration: "PT1M20S", viewCount: 800000, likeCount: 2000 },
  { title: "YOU'RE DOING IT WRONG!! THE SECRET NOBODY IS TALKING ABOUT", description: "Sponsor link", duration: "PT10M50S", viewCount: 260000, likeCount: 700 },
  { title: "INSANE!! THIS ONE WEIRD TRICK DESTROYED MY COMPETITION!!", description: "", duration: "PT9M10S", viewCount: 190000, likeCount: 520 },
  { title: "WATCH TILL THE END — TERRIFYING DISCOVERY EXPOSED!!", description: "", duration: "PT12M00S", viewCount: 440000, likeCount: 1200 },
  { title: "THEY TRIED TO HIDE THIS!! MUST WATCH NOW!! 🔥🔥", description: "", duration: "PT10M15S", viewCount: 380000, likeCount: 1000 },
  { title: "10 LIES EVERYONE BELIEVES!! SHOCKING EXPOSED!!", description: "", duration: "PT11M40S", viewCount: 290000, likeCount: 750 },
  { title: "YOU NEED TO SEE THIS!! CRAZY AI SECRET EXPOSED!!", description: "", duration: "PT8M50S", viewCount: 410000, likeCount: 1100 },
  { title: "THE DARK SIDE OF TECH NOBODY TELLS YOU!! (NOT CLICKBAIT)", description: "", duration: "PT16M20S", viewCount: 270000, likeCount: 800 },
  { title: "GET RICH OVERNIGHT WITH AI!! NO EXPERIENCE NEEDED!! 😱", description: "Course link", duration: "PT12M10S", viewCount: 920000, likeCount: 2200 },
  { title: "HE FOUND THIS AND EVERYTHING CHANGED!! UNBELIEVABLE!!", description: "", duration: "PT10M00S", viewCount: 310000, likeCount: 800 },
  { title: "5 MISTAKES THAT WILL DESTROY YOUR CAREER!! STOP DOING THIS!!", description: "", duration: "PT9M30S", viewCount: 240000, likeCount: 650 },
  { title: "WHAT HAPPENED NEXT WILL SHOCK YOU!! GONE WRONG!!", description: "", duration: "PT7M45S", viewCount: 610000, likeCount: 1400 },
  { title: "INSANELY SECRET HACK THEY DON'T WANT YOU TO KNOW!!", description: "", duration: "PT8M10S", viewCount: 175000, likeCount: 420 },
  { title: "FINALLY EXPOSED!! THE REAL REASON NOBODY TELLS YOU THIS!!", description: "", duration: "PT14M30S", viewCount: 350000, likeCount: 980 },
  { title: "100% GUARANTEED!! THIS SIMPLE SECRET CHANGED MY LIFE FOREVER", description: "", duration: "PT10M40S", viewCount: 480000, likeCount: 1150 },
  { title: "UNBELIEVABLE!! WATCH BEFORE IT GETS DELETED!! 😱🚨", description: "", duration: "PT6M20S", viewCount: 550000, likeCount: 1300 },
  { title: "SHOCKING!! WHY EVERYONE IS QUITTING CODING!! (IS OVER)", description: "", duration: "PT11M15S", viewCount: 410000, likeCount: 1050 },
  { title: "MUST WATCH!! SHE DID THIS AND RUINED EVERYTHING!!", description: "", duration: "PT9M55S", viewCount: 290000, likeCount: 720 }
];

// 1. Precision / Recall evaluation on 60+ fixture set
let tp = 0; // clickbait caught (verdict === "clickbait" or "borderline")
let strictTp = 0; // clickbait hard-rejected (verdict === "clickbait")
let fp = 0; // valuable video hard-rejected (verdict === "clickbait")
let valuableBorderline = 0;

const t0 = performance.now();
for (const v of VALUABLE_FIXTURES) {
  const res = Clickbait.assessClickbait(v, defaultSettings, null);
  assert(res.clickbaitScore >= 0 && res.clickbaitScore <= 100, "score in 0-100");
  assert(res.valueScore >= 0 && res.valueScore <= 100, "valueScore in 0-100");
  assert(Array.isArray(res.reasons) && res.reasons.length > 0, "reasons non-empty");
  if (res.verdict === "clickbait") {
    fp++;
    console.error("FALSE POSITIVE:", v.title, res);
  } else if (res.verdict === "borderline") {
    valuableBorderline++;
  }
}

for (const v of CLICKBAIT_FIXTURES) {
  const res = Clickbait.assessClickbait(v, defaultSettings, null);
  if (res.verdict === "clickbait") {
    strictTp++;
    tp++;
  } else if (res.verdict === "borderline") {
    tp++;
  } else {
    console.error("FALSE NEGATIVE:", v.title, res);
  }
}
const elapsedMs = performance.now() - t0;
const avgMs = elapsedMs / (VALUABLE_FIXTURES.length + CLICKBAIT_FIXTURES.length);

const precision = strictTp / (strictTp + fp || 1);
const recall = tp / CLICKBAIT_FIXTURES.length;
const strictRecall = strictTp / CLICKBAIT_FIXTURES.length;

console.log(
  `[Clickbait Eval] 60 fixtures: Precision=${(precision * 100).toFixed(1)}% (FP=${fp}), ` +
  `Recall(caught)=${(recall * 100).toFixed(1)}% (strict=${(strictRecall * 100).toFixed(1)}%), ` +
  `Valuable-Borderline=${valuableBorderline}, AvgTime=${avgMs.toFixed(3)}ms/video`
);

assert.strictEqual(fp, 0, "Zero false positives on valuable fixtures");
assert(precision >= 0.95, "Precision must be >= 95%");
assert(recall >= 0.90, "Recall (clickbait + borderline) must be >= 90%");
assert(strictRecall >= 0.80, "Strict recall must be >= 80%");
assert(avgMs < 2.0, `Must run under 2ms/video (got ${avgMs.toFixed(3)}ms)`);

// 2. Edge cases
const emptyTitleRes = Clickbait.assessClickbait({ title: "" }, defaultSettings, null);
assert.strictEqual(emptyTitleRes.verdict, "good", "Empty title fails open");

const longTitleRes = Clickbait.assessClickbait({
  title: "Understanding ".repeat(50) + "Distributed Systems Architecture"
}, defaultSettings, null);
assert.strictEqual(longTitleRes.verdict, "good", "Very long clean title does not crash or false-positive");

// 3. Trusted channel skips hard rejection even with clickbait title
const trustedSettings = JSON.parse(JSON.stringify(defaultSettings));
trustedSettings.clickbait.trustedChannels = [{ channelId: "UC_TRUSTED", title: "Trusted Lab" }];
const trustedRes = Clickbait.assessClickbait({
  title: "SHOCKING!! YOU WON'T BELIEVE THIS SECRET!!",
  channelId: "UC_TRUSTED"
}, trustedSettings, null);
assert.notStrictEqual(trustedRes.verdict, "clickbait", "Trusted channel must skip hard rejection");

// 4. Sensitivity shifts thresholds
const borderlineCandidate = {
  title: "THE TRUTH ABOUT AI AGENTS!!",
  description: ""
};
const strictRes = Clickbait.assessClickbait(borderlineCandidate, {
  ...defaultSettings,
  clickbait: { ...defaultSettings.clickbait, sensitivity: "strict" }
}, null);
const lenientRes = Clickbait.assessClickbait(borderlineCandidate, {
  ...defaultSettings,
  clickbait: { ...defaultSettings.clickbait, sensitivity: "lenient" }
}, null);
assert(
  strictRes.verdict !== "good" || lenientRes.verdict === "good",
  "Strict sensitivity should be at least as strict as lenient"
);

// 5. Layer 4 learned feedback shifts score
const learned = {
  channels: { "UC_BAD": { delta: 28, count: 3, updatedAt: Date.now() } },
  phrases: { "secret trick": { delta: 15, count: 2, updatedAt: Date.now() } }
};
const learnedRes = Clickbait.assessClickbait({
  title: "A secret trick for coding",
  channelId: "UC_BAD"
}, defaultSettings, learned);
const unlearnedRes = Clickbait.assessClickbait({
  title: "A secret trick for coding",
  channelId: "UC_BAD"
}, defaultSettings, null);
assert(learnedRes.clickbaitScore > unlearnedRes.clickbaitScore, "Learned negative feedback increases clickbaitScore");

// 6. Scoring integration & fail-open backfill (never drop all candidates)
const mixedPool = [
  { videoId: "v1", title: "YOU WON'T BELIEVE THIS SECRET!! 😱😱", channelId: "c1", duration: "PT5M00S", viewCount: 100000, likeCount: 200 },
  { videoId: "v2", title: "SHOCKING EXPOSED!! WATCH BEFORE IT'S DELETED!!", channelId: "c2", duration: "PT6M00S", viewCount: 200000, likeCount: 300 },
  { videoId: "v3", title: "Machine Learning Tutorial From Scratch", channelId: "c3", duration: "PT25M00S", viewCount: 80000, likeCount: 4000 }
];
const ranked = Scoring.rankSection(mixedPool, { id: "ml", name: "Machine Learning", query: "machine learning", score: 35 }, defaultSettings, {});
assert.strictEqual(ranked.length, 1, "Only the valuable video survives rankSection");
assert.strictEqual(ranked[0].videoId, "v3");

const allClickbaitPool = mixedPool.slice(0, 2).map((v) => Object.assign({}, v));
const failOpenRanked = Scoring.rankSection(allClickbaitPool, { id: "ml", name: "ML", query: "ml", score: 35 }, defaultSettings, {});
assert(failOpenRanked.length > 0, "Fail-open: rankSection must never drop all candidates");

console.log("All clickbait & scoring tests passed!");
