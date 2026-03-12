/**
 * Seed script: Demo deliberation data for testing the Conference Intelligence pipeline
 *
 * Creates a deliberation with fake transcripts and priorities for the target event.
 * Transcripts cover themes around community infrastructure, regenerative funding,
 * open source, and public goods — designed to produce interesting clustering results.
 *
 * Usage:
 *   bunx tsx scripts/seed-deliberation-demo.ts                              # Default: example-conf
 *   bunx tsx scripts/seed-deliberation-demo.ts --event=example-conf         # Specific event
 *   bunx tsx scripts/seed-deliberation-demo.ts --reset                      # Delete existing deliberation data first
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EVENT_SLUG =
  process.argv.find((a) => a.startsWith("--event="))?.split("=")[1] ??
  "example-conf";
const RESET = process.argv.includes("--reset");

// ── Fake transcripts ────────────────────────────────────────────────

const TRANSCRIPTS = [
  {
    title: "[Panel] Regenerative Funding Models for Public Goods",
    sourceSessionId: "demo-delib-panel-regen-funding",
    transcript: `Moderator: Welcome to our panel on regenerative funding models. Let's start with the elephant in the room — most public goods are chronically underfunded. Why?

Panelist A: The fundamental issue is that we're trying to fund commons with tools designed for private goods. Venture capital wants 10x returns, but public goods by definition create value that can't be captured by a single entity. We need funding vehicles that match the nature of what we're building.

Panelist B: I agree. And there's a valley of death specifically for early-stage public goods. You have an idea for critical infrastructure — maybe a new protocol, a shared data commons, or community coordination tooling — but it needs two to three years of R&D before it's even usable. No traditional funder will touch that.

Moderator: So what's the alternative?

Panelist A: Focused Research Organizations, or FROs, are one model I'm excited about. You get a fixed-term, fixed-budget organization focused on a specific technical challenge. It's not trying to become a unicorn. It's trying to solve a problem and dissolve. That's fundamentally different from the startup model.

Panelist B: Quadratic funding is another approach. It mathematically amplifies small contributions from many people, which means projects that the community actually wants get funded proportionally. Gitcoin has proven this works at scale.

Panelist C: I'd add that we need to think about retroactive funding more seriously. Optimism's RetroPGF showed that you can reward impact after the fact. This flips the incentive — instead of promising future returns, you demonstrate actual impact and get compensated.

Moderator: What about the sustainability question? These are all one-time or periodic funding events.

Panelist A: That's where protocol-level funding comes in. If you can embed funding mechanisms into the protocols themselves — like a small fee on transactions that flows to public goods — you create sustainable, autonomous funding streams. The key is making the infrastructure itself generative.

Panelist C: And honestly, sometimes the most impactful thing you can fund isn't a product at all. It's maintaining community cohesion. Third spaces, forums, gatherings — these are the soil that everything else grows from. But they're the hardest to get funded because they don't produce legible outputs.`,
  },
  {
    title: "[Keynote] The Knowledge Commons as Critical Infrastructure",
    sourceSessionId: "demo-delib-keynote-knowledge-commons",
    transcript: `Speaker: Thank you all for being here. I want to talk about something that I think is the most underleveraged asset in our ecosystem: the knowledge commons.

We've gotten very good at open-sourcing software. GitHub has 100 million developers. But we haven't applied the same thinking to knowledge itself — to research, to methodologies, to frameworks for thinking about complex problems.

Let me give you an example. Right now, there are probably fifty organizations around the world working on impact measurement. Each one has developed their own framework, their own metrics, their own tools. Some of this work is published, but most of it lives in internal documents, in people's heads, in Notion pages that nobody outside the org can access.

What if all of that knowledge were open? What if there were a shared commons of impact measurement methodologies that anyone could use, contribute to, and build on?

This isn't just about efficiency. It's about equity. When knowledge is locked up, it creates a two-tier system. Well-resourced organizations can afford to develop sophisticated approaches. Everyone else is reinventing the wheel with fewer resources.

The same pattern applies to governance design, to community facilitation, to curriculum development. Every domain has knowledge that would be more valuable if it were shared.

Now, some people hear "open source knowledge" and think I'm talking about publishing papers or writing blog posts. That's part of it, but it's not enough. We need living, maintained knowledge commons — more like Wikipedia than a library. Actively curated, continuously updated, with clear contribution pathways.

The funding challenge here is real. Maintaining a knowledge commons is unglamorous work. It doesn't produce the kind of visible outputs that attract philanthropic capital. But I'd argue it's the highest-leverage investment we can make. Every dollar spent maintaining shared knowledge multiplies across every organization and individual that uses it.

I'll close with this: the next big unlock isn't a new protocol or a new token. It's making what we already know accessible to everyone who needs it. Thank you.`,
  },
  {
    title: "[Workshop] Community-Centered Evaluation Frameworks",
    sourceSessionId: "demo-delib-workshop-eval",
    transcript: `Facilitator: Alright, let's dig into how we actually evaluate projects in a way that centers community benefit rather than just financial returns.

Participant 1: I think the biggest problem is that we're using metrics designed for startups. Monthly active users, revenue growth, engagement time — these tell you about extraction, not about value creation.

Facilitator: So what should we measure instead?

Participant 2: I've been thinking about this a lot. What if we measured "community capacity" — like, after your project exists, can the community do things it couldn't do before? That's a fundamentally different question than "how many people use your product."

Participant 1: Yes! And we should measure ecosystem health, not just individual project success. Is the overall ecosystem more resilient? Are there more connections between people and organizations? Are resources flowing more equitably?

Participant 3: I want to push back slightly. We still need some quantitative metrics. Funders need to make decisions, and pure qualitative assessment doesn't scale. But I think we can design better quantitative metrics. Like "knowledge sharing index" — how much of what a project learns gets shared back to the commons?

Facilitator: That's a great bridge. What about the temporal dimension? How do we evaluate things that take years to show impact?

Participant 2: This is the valley of death problem again. Early-stage human-centered technology, regenerative systems, governance experiments — these all take time. We need patient capital that doesn't demand quarterly metrics.

Participant 1: Exactly. And I think philanthropic capital has a specific role here. Commercial capital can fund the short-term, revenue-generating projects. But the long-term systemic change work? That needs dedicated philanthropic support with a 5-to-10 year horizon.

Participant 3: One more thing — geographic equity. We keep funding projects in the same few cities. San Francisco, New York, London, Berlin. There's incredible talent and need in the Global South, in rural communities, in places we're not looking. Our evaluation frameworks should actively correct for this bias.

Facilitator: Beautiful. Let's capture these themes: community capacity over extraction metrics, ecosystem health over individual success, knowledge sharing as a measurable output, patient capital for systemic change, and geographic equity as a design principle.`,
  },
  {
    title: "[Interview] Marcus Chen — Decentralized Governance Research",
    sourceSessionId: "demo-delib-interview-marcus",
    transcript: `Interviewer: Marcus, you've been researching decentralized governance for about five years now. What's the biggest lesson?

Marcus: That governance is not a technical problem. We keep trying to solve it with smart contracts and voting mechanisms, but the hard part is the social layer. How do you build trust? How do you handle conflict? How do you make sure quiet voices get heard alongside loud ones?

Interviewer: So the technology doesn't matter?

Marcus: No, it matters — but it's infrastructure, not solution. Token voting is a tool. Quadratic voting is a tool. Conviction voting is a tool. But without the social practices to support them — facilitation, deliberation, conflict resolution — they just reproduce existing power dynamics with a blockchain veneer.

Interviewer: What does good governance look like in practice?

Marcus: The best examples I've seen combine structured deliberation with decentralized decision-making. You bring people together — physically if possible — to discuss, debate, and understand different perspectives. Then you use the technical tools to make decisions at scale, informed by that deliberation.

It's actually what this conference is trying to do with the deliberation feature. Capture what people are actually saying in sessions, combine it with what people explicitly prioritize, and surface the patterns. That's governance infrastructure.

Interviewer: What about the talent problem? How do we find people who can work on these complex systems?

Marcus: You look for people who wear many hats. The best governance designers I know have backgrounds in philosophy, economics, computer science, community organizing, or all of the above. They're not specialists — they're systems thinkers. And you usually can't find them on LinkedIn. You find them in communities, at gatherings like this one.

Interviewer: Any red flags when evaluating governance projects?

Marcus: Big promises without specificity. "We're going to decentralize everything" without a clear theory of what decisions should be decentralized and which shouldn't. Also, projects that don't eat their own cooking — they talk about decentralized governance but are run by a single founder making all the decisions.`,
  },
  {
    title: "[Panel] Open Source Beyond Software",
    sourceSessionId: "demo-delib-panel-oss-beyond",
    transcript: `Moderator: Today we're discussing open source beyond software. The open-source movement transformed how we build technology, but can those principles apply elsewhere?

Panelist A: Absolutely. Look at what's happening in open science. Pre-print servers, open access journals, shared datasets — the same dynamics that made Linux and Apache successful are now accelerating scientific research.

Panelist B: And open hardware is real now. RISC-V is an open-source instruction set architecture that's being adopted by major chip manufacturers. Open-source hardware for lab equipment is enabling research in universities that couldn't afford proprietary tools.

Moderator: But hardware has a cost of goods problem that software doesn't. How do you sustain open hardware projects?

Panelist B: Same way you sustain open software — through services, support, and the ecosystem around it. Red Hat proved this model decades ago. The artifact is free; the expertise is valuable.

Panelist A: I want to talk about open-source governance, too. We're starting to see governance frameworks shared openly — constitutions, decision-making processes, conflict resolution protocols. When one community develops a good approach, others can fork and adapt it.

Panelist C: The pattern I'm most excited about is open-source curriculum and educational materials. MIT OpenCourseWare was the beginning, but now we're seeing entire pedagogical frameworks shared openly. This is critical for equity — quality education shouldn't be gatekept by institutional affiliation.

Moderator: What's the biggest barrier to open source expanding beyond software?

Panelist C: Cultural norms. In software, sharing code is celebrated. In academia, publishing your methodology openly before your paper comes out feels risky. In business, sharing your processes feels like giving away competitive advantage. We need to shift the culture toward recognizing that openness creates more value than it captures.

Panelist A: And funding. Open-source software has GitHub Sponsors, Open Collective, Gitcoin, and dozens of grant programs. Open-source knowledge, governance, and hardware don't have equivalent funding ecosystems. Building those funding pathways is probably the highest-leverage thing we can do.

Moderator: So the open-source ethos is proven, but the infrastructure to support it beyond software is still nascent.

Panelist B: Exactly. And I'd argue that investing in that infrastructure — the funding mechanisms, the platforms, the community practices — is investing in the garden bed. Everything else grows from it.`,
  },
  {
    title: "[Lightning Talk] Why Third Spaces Matter More Than Products",
    sourceSessionId: "demo-delib-lightning-third-spaces",
    transcript: `Speaker: I have seven minutes so I'll be direct. We are over-investing in products and under-investing in spaces.

By spaces I mean the physical and digital places where people with shared values can gather, exchange ideas, and form the relationships that actually drive innovation.

Every major breakthrough I've witnessed in this ecosystem — and I've been in it for eight years — didn't come from a product launch. It came from a conversation at an event, a chance encounter at a co-working space, a late-night discussion at a residency.

But look at where the money goes. We fund products. We fund protocols. We fund companies. We rarely fund the community infrastructure that generates all of those things.

It's like funding the fruit but not the tree. Or funding the tree but not the soil.

I'm proposing a radical reallocation. At least 20% of ecosystem funding should go to community infrastructure: events, residencies, co-working spaces, forums, facilitated gatherings.

Not as a nice-to-have. Not as marketing spend. As core infrastructure investment.

Because here's the thing — products come and go. Protocols evolve. Companies pivot. But the community persists. The relationships persist. The shared understanding persists. That's the actual durable asset.

One more thing. These spaces need to be intentionally inclusive. Not just geographically — though that matters — but in terms of who gets to participate. If your "community space" is only accessible to people who can afford to fly to Lisbon or Bangkok, it's not community infrastructure. It's a club.

We need to fund local third spaces, distributed gatherings, accessible online forums — the full spectrum of community infrastructure. Thank you.`,
  },
  {
    title: "[Interview] Dr. Amara Osei — Impact Measurement in Complex Systems",
    sourceSessionId: "demo-delib-interview-amara",
    transcript: `Interviewer: Dr. Osei, you've spent your career studying how to measure impact in complex adaptive systems. What's the biggest misconception?

Amara: That impact is linear and attributable. People want to say "we invested X and got Y outcome." But in complex systems, outcomes emerge from interactions between many actors over time. Attribution is often an illusion.

Interviewer: So how should funders think about impact?

Amara: Contribution, not attribution. Ask: "Did our investment contribute to conditions that made positive outcomes more likely?" That's a very different question than "Did our investment cause this outcome?"

It requires different metrics. Instead of tracking outputs — number of users, amount of funding distributed — you track systemic indicators. Is the ecosystem more diverse? Are there more feedback loops? Is information flowing more freely? Are more people able to participate meaningfully?

Interviewer: That sounds hard to measure.

Amara: It is. But "hard to measure" doesn't mean "not measurable." We have tools from complex systems science — network analysis, resilience indicators, diversity indices — that can give us meaningful signals about ecosystem health.

The real problem isn't measurement. It's that funders want certainty, and complex systems are inherently uncertain. We need funders who are comfortable with probabilistic thinking, with long time horizons, with emergent rather than planned outcomes.

Interviewer: How does this connect to the community infrastructure conversation happening at this conference?

Amara: Directly. Community infrastructure is the connective tissue of complex systems. Events, forums, shared spaces — these create the interactions from which innovation emerges. When you invest in community infrastructure, you're investing in the conditions for emergence. You can't predict exactly what will emerge, but you can measure whether the conditions are healthy.

Interviewer: Any practical advice for someone evaluating projects right now?

Amara: Three things. First, ask what the project does for the ecosystem, not just for its users. Second, look for projects that strengthen connections rather than centralizing power. Third, be willing to fund maintenance and care work, not just creation. The most impactful work is often the least visible.`,
  },
  {
    title: "[Panel] Bridging the Valley of Death in Human-Centered Tech",
    sourceSessionId: "demo-delib-panel-valley-death",
    transcript: `Moderator: We keep hearing about the "valley of death" for early-stage human-centered technology. Let's unpack what that actually means.

Panelist A: So the valley of death is the gap between having an idea or prototype and having something that's sustainable. In traditional tech, venture capital bridges this gap because the expectation is massive financial returns. But human-centered tech — tools for wellbeing, for education, for community governance — typically doesn't promise venture-scale returns. So the capital isn't there.

Panelist B: And it's getting worse. As AI hype absorbs more venture capital, less conventional funding is available for the kind of slow, careful, community-centered technology development that actually improves lives.

Moderator: What solutions exist?

Panelist A: We need multiple vehicles. Philanthropic capital for the very early stage — the first two to three years of R&D where you're figuring out if the approach even works. Then grants or revenue-based financing for the growth stage. And potentially cooperative ownership for the mature stage, where the community that uses the technology also owns it.

Panelist C: I want to highlight that this isn't just about money. It's about time. Human-centered tech needs time to get right. You need to do ethnographic research, community consultation, iterative co-design. That takes longer than shipping an MVP. Our funding models need to accommodate that timeline.

Panelist B: And we need to stop evaluating these projects on startup metrics. Growth rate is not the right metric for a community governance tool. "Are the decisions better?" is the right metric. "Is the community more cohesive?" Those are harder to measure but vastly more important.

Moderator: What role do events like this play?

Panelist C: Honestly? They're essential. This is where the ecosystem forms. Where funders meet builders. Where researchers connect with practitioners. Where someone working on a problem in Nairobi discovers someone working on the same problem in Medellín. We can't underestimate the value of these nexus points.

Panelist A: And they need to be funded accordingly. Not as conferences — as infrastructure. The relationships formed here compound over years.`,
  },
];

// ── Fake priorities (intentional signal) ─────────────────────────────

const PRIORITIES = [
  {
    title: "Fund catalytic community infrastructure over individual projects",
    description:
      "Philanthropic capital should prioritize maintaining community cohesion — third spaces, forums, and gathering opportunities for people with shared values to exchange ideas. The ecosystem currently lets individual projects capture all the upside from community-generated inspiration without regenerating back into the soil.",
  },
  {
    title: "Create dedicated funding vehicles for long-term R&D",
    description:
      "Early-stage innovation requiring extensive R&D cycles isn't fundable through traditional mechanisms because it takes too long to reach MVP. We need FROs (Focused Research Organizations) and similar vehicles with 5-10 year horizons.",
  },
  {
    title: "Open source intellectual knowledge, not just software",
    description:
      "The open-source movement has transformed software but hasn't been applied to knowledge itself — research methodologies, governance frameworks, evaluation criteria. Creating living knowledge commons would be the highest-leverage investment.",
  },
  {
    title: "Implement geographic equity in funding allocation",
    description:
      "Funding disproportionately flows to a few major cities. There is a huge human potential opportunity gap. Evaluation frameworks should actively correct for geographic bias and prioritize underserved populations.",
  },
  {
    title: "Shift from extraction metrics to ecosystem health indicators",
    description:
      "Stop measuring MAU, engagement time, and revenue growth for public goods projects. Instead measure community capacity, knowledge sharing, ecosystem resilience, and whether the project strengthens connections rather than centralizing power.",
  },
  {
    title: "Embed funding mechanisms into protocols",
    description:
      "Rather than relying on periodic grant rounds, build sustainable autonomous funding streams directly into the protocols — small transaction fees that flow to public goods maintenance. Make infrastructure itself generative.",
  },
  {
    title: "Fund maintenance and care work, not just creation",
    description:
      "The most impactful work is often the least visible — maintaining knowledge commons, facilitating community spaces, stewarding governance processes. These unglamorous activities need dedicated, sustained funding.",
  },
];

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nTarget event: ${EVENT_SLUG}`);

  // Find event
  const event = await prisma.event.findUnique({
    where: { slug: EVENT_SLUG },
    select: { id: true, name: true },
  });

  if (!event) {
    console.error(`Event with slug "${EVENT_SLUG}" not found.`);
    process.exit(1);
  }

  console.log(`Found event: ${event.name} (${event.id})`);

  // Find a user to attribute priorities to (prefer admin, fall back to any user)
  const user =
    (await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true, name: true },
    })) ??
    (await prisma.user.findFirst({
      select: { id: true, name: true },
    }));

  if (!user) {
    console.error("No users found in the database.");
    process.exit(1);
  }

  console.log(`Using user: ${user.name} (${user.id})`);

  if (RESET) {
    console.log("\n🗑️  Resetting existing deliberation data...");
    const existing = await prisma.deliberation.findFirst({
      where: { eventId: event.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.deliberation.delete({ where: { id: existing.id } });
      console.log("  Deleted existing deliberation and all related data.");
    }
    // Also delete orphaned transcriptions for this event
    await prisma.transcription.deleteMany({
      where: {
        eventId: event.id,
        sourceSessionId: { startsWith: "demo-delib-" },
      },
    });
    console.log("  Deleted demo transcriptions.");
  }

  // Create deliberation
  console.log("\n📋 Creating deliberation...");
  const deliberation = await prisma.deliberation.create({
    data: {
      eventId: event.id,
      title: `${event.name} — Community Priorities`,
      description:
        "Identifying key themes, priorities, and blind spots from conference sessions. Analyzing transcriptions to surface what the community discussed most, what they formally prioritized, and what gaps exist between discussion and action.",
      status: "COLLECTING",
    },
  });
  console.log(`  Created: ${deliberation.id}`);

  // Create transcriptions
  console.log(`\n📝 Creating ${TRANSCRIPTS.length} transcriptions...`);
  for (const t of TRANSCRIPTS) {
    await prisma.transcription.upsert({
      where: { sourceSessionId: t.sourceSessionId },
      update: {
        title: t.title,
        transcript: t.transcript,
        status: "COMPLETED",
        processedAt: new Date(),
      },
      create: {
        title: t.title,
        transcript: t.transcript,
        sourceSessionId: t.sourceSessionId,
        source: "MANUAL",
        status: "COMPLETED",
        processedAt: new Date(),
        eventId: event.id,
        deliberationId: deliberation.id,
      },
    });
    console.log(`  ✓ ${t.title}`);
  }

  // Create priorities
  console.log(`\n🗳️  Creating ${PRIORITIES.length} priorities...`);
  for (const p of PRIORITIES) {
    await prisma.deliberationPriority.create({
      data: {
        deliberationId: deliberation.id,
        userId: user.id,
        title: p.title,
        description: p.description,
      },
    });
    console.log(`  ✓ ${p.title}`);
  }

  // Summary
  console.log("\n✅ Done! Deliberation seeded with:");
  console.log(`   ${TRANSCRIPTS.length} transcriptions`);
  console.log(`   ${PRIORITIES.length} priorities`);
  console.log(
    `\n🔗 View at: http://localhost:3000/admin/events/${EVENT_SLUG}/deliberations`,
  );
  console.log(
    "\n📌 Next steps: Click 'Run Clustering' then 'Run Analysis' in the admin UI",
  );
}

void main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
